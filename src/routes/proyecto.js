const { Router } = require('express');
const { execute } = require('../db');
const crypto = require('crypto');

const router = Router();

// Middleware para verificar si el usuario es gerente o administrador
const isGerente = async (req, res, next) => {
  const { id_usuario } = req.body; // Asumiendo que el ID del gerente viene en el cuerpo

  try {
    const result = await execute(
      `SELECT ROL FROM USUARIO WHERE ID_USUARIO = :id`,
      { id: id_usuario }
    );

    const userRole = result.rows[0]?.ROL;

    if (userRole === 'gerente' || userRole === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol de gerente o administrador.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear un nuevo proyecto (y potencialmente un nuevo cliente)
router.post('/', async (req, res) => {
  const {
    nombre_proyecto,
    fecha_evento,
    num_invitados,
    id_salon,
    id_gerente, // ID del gerente que crea el proyecto
    cliente, // Objeto con { nombre, correo, telefono }
  } = req.body;

  try {
    // 1. Validar capacidad del salón
    const salonResult = await execute('SELECT NOMBRE_SALON, CAPACIDAD_MAXIMA FROM SALON WHERE ID_SALON = :id', { id: id_salon });
    if (salonResult.rows.length === 0) {
      return res.status(404).json({ error: 'El salón especificado no existe.' });
    }
    const salon = salonResult.rows[0];
    if (num_invitados > salon.CAPACIDAD_MAXIMA) {
      const salonesSugeridosResult = await execute(
        'SELECT ID_SALON, NOMBRE_SALON, CAPACIDAD_MAXIMA FROM SALON WHERE CAPACIDAD_MAXIMA >= :num ORDER BY CAPACIDAD_MAXIMA ASC',
        { num: num_invitados }
      );
      return res.status(400).json({
        error: `El número de invitados (${num_invitados}) excede la capacidad del salón \'${salon.NOMBRE_SALON}\' (${salon.CAPACIDAD_MAXIMA}).`,
        sugerencias: salonesSugeridosResult.rows,
      });
    }

    let clienteId;

    // 2. Buscar o crear cliente
    const clienteExistente = await execute(
      `SELECT ID_USUARIO FROM USUARIO WHERE CORREO = :correo AND ROL = 'general'`,
      { correo: cliente.correo }
    );

    if (clienteExistente.rows.length > 0) {
      clienteId = clienteExistente.rows[0].ID_USUARIO;
      // Opcional: Actualizar datos del cliente si es necesario
      await execute(
        `UPDATE USUARIO SET NOMBRE_USUARIO = :nombre, TELEFONO = :telefono WHERE ID_USUARIO = :id`,
        { nombre: cliente.nombre, telefono: cliente.telefono, id: clienteId },
        { autoCommit: true }
      );
    } else {
      // Crear nuevo usuario cliente
      const nuevaContrasenaUsuario = crypto.randomBytes(8).toString('hex'); // Generar contraseña segura
      const result = await execute(
        `INSERT INTO USUARIO (NOMBRE_USUARIO, CORREO, TELEFONO, CONTRASENA, ROL, ESTATUS) VALUES (:nombre, :correo, :telefono, :contrasena, 'general', 'activo') RETURNING ID_USUARIO INTO :id`,
        {
            nombre: cliente.nombre,
            correo: cliente.correo,
            telefono: cliente.telefono,
            contrasena: nuevaContrasenaUsuario, // En una app real, hashear la contraseña!
        },
        { autoCommit: true, outBinds: { id: { dir: 3002, type: 2005 } } } // Using a generic type for number
    );
    clienteId = result.outBinds.id[0];
    }

    // 3. Crear el proyecto con contraseña
    const nuevaContrasenaProyecto = crypto.randomBytes(4).toString('hex'); //pass más corta para el proyecto

    const nuevoProyectoResult = await execute(
      `INSERT INTO PROYECTO (NOMBRE_PROYECTO, FECHA_EVENTO, NUM_INVITADOS, ESTATUS, ID_SALON, ID_GERENTE, ID_CLIENTE, FECHA_CREACION, ULTIMA_ACTUALIZACION, CONTRASENA_PROYECTO)
       VALUES (:nombre, TO_DATE(:fecha, 'YYYY-MM-DD'), :invitados, 'activo', :salon, :gerente, :cliente, SYSDATE, SYSDATE, :contrasena_proyecto)
       RETURNING ID_PROYECTO INTO :id`,
      {
        nombre: nombre_proyecto,
        fecha: fecha_evento,
        invitados: num_invitados,
        salon: id_salon,
        gerente: id_gerente,
        cliente: clienteId,
        contrasena_proyecto: nuevaContrasenaProyecto
      },
      { autoCommit: true, outBinds: { id: { dir: 3002, type: 2005 } } }
    );

    const nuevoProyectoId = nuevoProyectoResult.outBinds.id[0];

    res.status(201).json({
        message: 'Proyecto creado con éxito.',
        id_proyecto: nuevoProyectoId,
        id_cliente: clienteId,
        contrasena_proyecto: nuevaContrasenaProyecto
    });

  } catch (err) {
    console.error('Error al crear el proyecto:', err);
    res.status(500).json({ error: 'Error interno del servidor al crear el proyecto.', details: err.message });
  }
});

// Obtener todos los proyectos de un cliente específico
router.get('/cliente/:id', async (req, res) => {
  try {
    const result = await execute(`
      SELECT p.ID_PROYECTO, p.NUM_INVITADOS, TO_CHAR(p.FECHA_EVENTO, 'YYYY-MM-DD') AS FECHA_EVENTO, p.ESTATUS, s.NOMBRE_SALON, p.CONTRASENA_PROYECTO
      FROM PROYECTO p
      JOIN SALON s ON p.ID_SALON = s.ID_SALON
      WHERE p.ID_CLIENTE = :id
    `, { id: req.params.id });
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener proyectos del cliente:', err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar el número de invitados de un proyecto
router.put('/:id/invitados', async (req, res) => {
  const { num_invitados, contrasena_proyecto } = req.body;
  const { id } = req.params;

  try {
    // 1. Obtener datos del proyecto y del salón
    const proyectoResult = await execute(`
      SELECT p.FECHA_EVENTO, s.CAPACIDAD_MAXIMA, p.CONTRASENA_PROYECTO
      FROM PROYECTO p
      JOIN SALON s ON p.ID_SALON = s.ID_SALON
      WHERE p.ID_PROYECTO = :id
    `, { id });

    if (proyectoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const proyecto = proyectoResult.rows[0];

    // Validar contraseña del proyecto
    if (proyecto.CONTRASENA_PROYECTO !== contrasena_proyecto) {
        return res.status(401).json({ error: 'Contraseña del proyecto incorrecta.' });
    }

    const fechaEvento = new Date(proyecto.FECHA_EVENTO);
    const hoy = new Date();
    
    // Reset time part for accurate day difference
    fechaEvento.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diffTime = fechaEvento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 2. Validar regla de los 5 días
    if (diffDays < 5) {
      return res.status(403).json({ error: 'No se puede modificar el número de invitados con menos de 5 días de antelación al evento.' });
    }

    // 3. Validar capacidad del salón
    if (num_invitados > proyecto.CAPACIDAD_MAXIMA) {
        return res.status(400).json({ error: `El número de invitados excede la capacidad del salón (${proyecto.CAPACIDAD_MAXIMA}).` });
    }

    // 4. Si las validaciones pasan, actualizar
    const updateResult = await execute(
      `UPDATE PROYECTO SET NUM_INVITADOS = :num_invitados WHERE ID_PROYECTO = :id`,
      { num_invitados, id },
      { autoCommit: true }
    );

    if (updateResult.rowsAffected > 0) {
      res.json({ message: 'Número de invitados actualizado correctamente.' });
    } else {
      res.status(404).json({ error: 'Proyecto no encontrado durante la actualización.' });
    }
  } catch (err) {
    console.error('Error al actualizar invitados:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cancelar un proyecto (solo gerentes)
router.delete('/:id/cancelar', isGerente, async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Verificar el estado actual del proyecto
        const proyectoResult = await execute(
            `SELECT ESTATUS FROM PROYECTO WHERE ID_PROYECTO = :id`,
            { id }
        );

        if (proyectoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado.' });
        }

        const proyecto = proyectoResult.rows[0];

        // 2. No se puede cancelar un proyecto finiquitado
        if (proyecto.ESTATUS === 'finiquitado') {
            return res.status(400).json({ error: 'No se puede cancelar un proyecto que ya ha sido finiquitado.' });
        }

        // 3. Actualizar el estado a 'cancelado'
        await execute(
            `UPDATE PROYECTO SET ESTATUS = 'cancelado' WHERE ID_PROYECTO = :id`,
            { id },
            { autoCommit: true }
        );

        res.json({ message: 'El proyecto ha sido cancelado correctamente.' });

    } catch (err) {
        console.error('Error al cancelar el proyecto:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;