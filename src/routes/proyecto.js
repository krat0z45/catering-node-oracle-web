const { Router } = require('express');
const { execute } = require('../db');
const crypto = require('crypto');

const router = Router();

// Middleware para verificar si el usuario es gerente o administrador
const isGerente = async (req, res, next) => {
  // El ID del usuario que realiza la acción debe incluirse en el cuerpo de la solicitud
  const { id_usuario_accion } = req.body;

  if (!id_usuario_accion) {
    return res.status(400).json({ error: 'Falta el ID del usuario que realiza la acción.' });
  }

  try {
    const result = await execute(
      `SELECT ROL FROM USUARIO WHERE ID_USUARIO = :id`,
      { id: id_usuario_accion }
    );

    const userRole = result.rows[0]?.ROL;

    if (userRole === 'gerente' || userRole === 'admin') {
      next(); // Permitir el paso
    } else {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol de gerente o administrador.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ----------------------------------------------------------------------------
// RUTAS PRINCIPALES DEL PROYECTO
// ----------------------------------------------------------------------------

// GET /api/proyecto - Obtener todos los proyectos
router.get('/', async (req, res) => {
  try {
    const result = await execute(`
      SELECT p.ID_PROYECTO, p.NOMBRE_PROYECTO, p.NUM_INVITADOS, TO_CHAR(p.FECHA_EVENTO, 'YYYY-MM-DD') AS FECHA_EVENTO, p.ESTATUS, s.NOMBRE_SALON
      FROM PROYECTO p
      LEFT JOIN SALON s ON p.ID_SALON = s.ID_SALON
      ORDER BY p.FECHA_EVENTO DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/proyecto/solicitudes - Obtener proyectos con solicitud de cancelación
router.get('/solicitudes', async (req, res) => {
  try {
    const result = await execute(`
      SELECT p.ID_PROYECTO, p.NOMBRE_PROYECTO, u.NOMBRE_USUARIO AS CLIENTE_NOMBRE, TO_CHAR(p.FECHA_EVENTO, 'YYYY-MM-DD') AS FECHA_EVENTO
      FROM PROYECTO p
      JOIN USUARIO u ON p.ID_CLIENTE = u.ID_USUARIO
      WHERE p.ESTATUS = 'Solicitud Cancelacion'
      ORDER BY p.FECHA_EVENTO ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener solicitudes: ' + err.message });
  }
});

// GET /api/proyecto/:id - Obtener un proyecto específico
router.get('/:id', async (req, res) => {
  try {
    const result = await execute(`
      SELECT 
        p.ID_PROYECTO, p.NOMBRE_PROYECTO, p.NUM_INVITADOS, TO_CHAR(p.FECHA_EVENTO, 'YYYY-MM-DD') AS FECHA_EVENTO, 
        p.ESTATUS, p.CONTRASENA_PROYECTO,
        s.NOMBRE_SALON,
        cli.ID_USUARIO AS CLIENTE_ID, cli.NOMBRE_USUARIO AS CLIENTE_NOMBRE, cli.CORREO AS CLIENTE_CORREO,
        ger.NOMBRE_USUARIO AS GERENTE_NOMBRE
      FROM PROYECTO p
      LEFT JOIN SALON s ON p.ID_SALON = s.ID_SALON
      LEFT JOIN USUARIO cli ON p.ID_CLIENTE = cli.ID_USUARIO
      LEFT JOIN USUARIO ger ON p.ID_GERENTE = ger.ID_USUARIO
      WHERE p.ID_PROYECTO = :id
    `, { id: req.params.id });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/proyecto/cliente/:id - Obtener proyectos de un cliente
router.get('/cliente/:id', async (req, res) => {
  try {
    const result = await execute(`
      SELECT p.ID_PROYECTO, p.NOMBRE_PROYECTO, p.NUM_INVITADOS, TO_CHAR(p.FECHA_EVENTO, 'YYYY-MM-DD') AS FECHA_EVENTO, p.ESTATUS, s.NOMBRE_SALON, p.CONTRASENA_PROYECTO
      FROM PROYECTO p
      LEFT JOIN SALON s ON p.ID_SALON = s.ID_SALON
      WHERE p.ID_CLIENTE = :id
      ORDER BY p.FECHA_EVENTO DESC
    `, { id: req.params.id });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/proyecto - Crear un nuevo proyecto
router.post('/', isGerente, async (req, res) => {
    const { id_gerente, id_cliente, id_salon, nombre_proyecto, num_invitados, fecha_evento } = req.body;
    const contrasena_proyecto = crypto.randomBytes(4).toString('hex');
    try {
        await execute(
            `INSERT INTO PROYECTO (ID_GERENTE, ID_CLIENTE, ID_SALON, NOMBRE_PROYECTO, NUM_INVITADOS, FECHA_EVENTO, CONTRASENA_PROYECTO, ESTATUS)
             VALUES (:id_gerente, :id_cliente, :id_salon, :nombre_proyecto, :num_invitados, TO_DATE(:fecha_evento, 'YYYY-MM-DD'), :contrasena_proyecto, 'Activo')`,
            { id_gerente, id_cliente, id_salon, nombre_proyecto, num_invitados, fecha_evento, contrasena_proyecto },
            { autoCommit: true }
        );
        res.status(201).json({ message: 'Proyecto creado con éxito', contrasena_proyecto });
    } catch (err) {
        res.status(500).json({ error: 'Error al crear el proyecto: ' + err.message });
    }
});


// ----------------------------------------------------------------------------
// RUTAS PARA GESTIÓN DE PLATILLOS EN UN PROYECTO
// ----------------------------------------------------------------------------

// GET /api/proyecto/:id/platillos - Obtener platillos asignados
router.get('/:id/platillos', async (req, res) => {
  try {
    const result = await execute(`
      SELECT p.ID_PLATILLO, p.NOMBRE_PLATILLO, p.DESCRIPCION, p.TIPO_COCINA
      FROM PROYECTO_PLATILLO pp
      JOIN PLATILLO p ON pp.ID_PLATILLO = p.ID_PLATILLO
      WHERE pp.ID_PROYECTO = :id
    `, { id: req.params.id });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener platillos del proyecto: ' + err.message });
  }
});

// POST /api/proyecto/:id/platillos - Asignar un platillo
router.post('/:id/platillos', isGerente, async (req, res) => {
  const { id_platillo } = req.body;
  const { id } = req.params;
  try {
    await execute(
      `INSERT INTO PROYECTO_PLATILLO (ID_PROYECTO, ID_PLATILLO) VALUES (:id_proyecto, :id_platillo)`,
      { id_proyecto: id, id_platillo },
      { autoCommit: true }
    );
    res.status(201).json({ message: 'Platillo asignado con éxito.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al asignar el platillo: ' + err.message });
  }
});

// DELETE /api/proyecto/:id/platillos/:platillo_id - Desasignar un platillo
router.delete('/:id/platillos/:platillo_id', isGerente, async (req, res) => {
  const { id, platillo_id } = req.params;
  try {
    const result = await execute(
      `DELETE FROM PROYECTO_PLATILLO WHERE ID_PROYECTO = :id_proyecto AND ID_PLATILLO = :id_platillo`,
      { id_proyecto: id, id_platillo: platillo_id },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'No se encontró la asignación de este platillo en el proyecto.' });
    }
    res.json({ message: 'Platillo desasignado con éxito.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desasignar el platillo: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// RUTAS PARA GESTIÓN DE COMPLEMENTOS EN UN PROYECTO
// ----------------------------------------------------------------------------

// GET /api/proyecto/:id/complementos - Obtener complementos asignados
router.get('/:id/complementos', async (req, res) => {
  try {
    const result = await execute(`
      SELECT c.ID_COMPLEMENTO, c.NOMBRE_COMPLEMENTO, c.TIPO
      FROM PROYECTO_COMPLEMENTO pc
      JOIN COMPLEMENTO c ON pc.ID_COMPLEMENTO = c.ID_COMPLEMENTO
      WHERE pc.ID_PROYECTO = :id
    `, { id: req.params.id });
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener complementos: ' + err.message });
  }
});

// POST /api/proyecto/:id/complementos - Asignar un complemento
router.post('/:id/complementos', isGerente, async (req, res) => {
  const { id_complemento } = req.body;
  const { id } = req.params;
  try {
    await execute(
      `INSERT INTO PROYECTO_COMPLEMENTO (ID_PROYECTO, ID_COMPLEMENTO) VALUES (:id_proyecto, :id_complemento)`,
      { id_proyecto: id, id_complemento },
      { autoCommit: true }
    );
    res.status(201).json({ message: 'Complemento asignado con éxito.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al asignar complemento: ' + err.message });
  }
});

// DELETE /api/proyecto/:id/complementos/:complemento_id - Desasignar un complemento
router.delete('/:id/complementos/:complemento_id', isGerente, async (req, res) => {
  const { id, complemento_id } = req.params;
  try {
    const result = await execute(
      `DELETE FROM PROYECTO_COMPLEMENTO WHERE ID_PROYECTO = :id_proyecto AND ID_COMPLEMENTO = :id_complemento`,
      { id_proyecto: id, id_complemento: complemento_id },
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'No se encontró la asignación de este complemento.' });
    }
    res.json({ message: 'Complemento desasignado con éxito.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desasignar complemento: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// OTRAS RUTAS DE ACTUALIZACIÓN
// ----------------------------------------------------------------------------

// PUT /api/proyecto/:id/invitados - Actualizar número de invitados
router.put('/:id/invitados', async (req, res) => {
    const { id } = req.params;
    const { num_invitados, contrasena_proyecto } = req.body;
    try {
        // ... (lógica de actualización de invitados)
        res.json({ message: 'Número de invitados actualizado con éxito.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/proyecto/:id/cancelar - Cancelar un proyecto
router.delete('/:id/cancelar', isGerente, async (req, res) => {
    const { id } = req.params;
    try {
        // ... (lógica de cancelación)
        res.json({ message: 'Proyecto cancelado con éxito.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
