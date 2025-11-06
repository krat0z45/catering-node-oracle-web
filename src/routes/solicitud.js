const { Router } = require('express');
const { execute } = require('../db'); // Usamos execute en lugar de getConnection
const router = Router();

router.post('/', async (req, res) => {
  const { nombre, correo, fecha, num_personas, mensaje } = req.body;

  try {
    await execute(
      `
      INSERT INTO SOLICITUD (
        NOMBRE_SOLICITANTE, CORREO, FECHA_EVENTO,
        NUM_PERSONAS, MENSAJE, FECHA_SOLICITUD
      )
      VALUES (
        :nombre, :correo, TO_DATE(:fecha, 'YYYY-MM-DD'),
        :num_personas, :mensaje, SYSDATE
      )
      `,
      { nombre, correo, fecha, num_personas, mensaje },
      { autoCommit: true }
    );

    res.status(200).json({ msg: '✅ Solicitud recibida con éxito' });
  } catch (err) {
    console.error("❌ ERROR al insertar solicitud:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

