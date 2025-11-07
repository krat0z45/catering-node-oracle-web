const { Router } = require('express');
const { execute } = require('../db');

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

// Crear una nueva solicitud (genérica o de cancelación)
router.post('/', async (req, res) => {
  const { nombre, correo, fecha, num_personas, mensaje, tipo = 'general', id_proyecto = null } = req.body;

  try {
    await execute(
      `
      INSERT INTO SOLICITUD (
        NOMBRE_SOLICITANTE, CORREO, FECHA_EVENTO,
        NUM_PERSONAS, MENSAJE, FECHA_SOLICITUD, TIPO, ID_PROYECTO, ESTATUS
      )
      VALUES (
        :nombre, :correo, TO_DATE(:fecha, 'YYYY-MM-DD'),
        :num_personas, :mensaje, SYSDATE, :tipo, :id_proyecto, 'pendiente'
      )
      `,
      { nombre, correo, fecha, num_personas, mensaje, tipo, id_proyecto },
      { autoCommit: true }
    );

    res.status(200).json({ msg: '✅ Solicitud recibida con éxito' });
  } catch (err) {
    console.error("❌ ERROR al insertar solicitud:", err);
    res.status(500).json({ error: err.message });
  }
});

// Ruta para que un gerente autorice una solicitud de cancelación
router.put('/:id_solicitud/autorizar-cancelacion', isGerente, async (req, res) => {
    const { id_solicitud } = req.params;

    try {
        // 1. Verificar que la solicitud existe y es de tipo 'cancelacion'
        const solicitudResult = await execute(
            `SELECT * FROM SOLICITUD WHERE ID_SOLICITUD = :id AND TIPO = 'cancelacion'`,
            { id: id_solicitud }
        );

        if (solicitudResult.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud de cancelación no encontrada.' });
        }

        const solicitud = solicitudResult.rows[0];

        // 2. Cambiar el estatus de la solicitud a 'aprobada'
        await execute(
            `UPDATE SOLICITUD SET ESTATUS = 'aprobada' WHERE ID_SOLICITUD = :id`,
            { id: id_solicitud },
            { autoCommit: true }
        );

        // 3. Cambiar el estatus del proyecto a 'cancelado'
        if (solicitud.ID_PROYECTO) {
            await execute(
                `UPDATE PROYECTO SET ESTATUS = 'cancelado' WHERE ID_PROYECTO = :id`,
                { id: solicitud.ID_PROYECTO },
                { autoCommit: true }
            );
        }

        res.json({ message: 'La solicitud de cancelación ha sido aprobada y el proyecto fue cancelado.' });

    } catch (err) {
        console.error('Error al autorizar la cancelación:', err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
