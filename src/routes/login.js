const { Router } = require('express');
const { execute } = require('../db');
const router = Router();

router.post('/', async (req, res) => {
  const { correo, password } = req.body;

  try {
    const result = await execute(
      `SELECT ID_USUARIO, NOMBRE_USUARIO, CORREO, CONTRASENA, ROL, ESTATUS 
       FROM USUARIO 
       WHERE CORREO = :correo`,
      { correo }
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Correo no registrado' });
    }

    if (user.CONTRASENA !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (user.ESTATUS !== 'activo') {
      return res.status(403).json({ error: 'Usuario inactivo. Contacta al administrador.' });
    }

    // ✅ Login exitoso
    res.status(200).json({
      msg: 'Acceso concedido',
      usuario: {
        id: user.ID_USUARIO,
        nombre: user.NOMBRE_USUARIO,
        correo: user.CORREO,
        rol: user.ROL,
        estatus: user.ESTATUS
      }
    });

  } catch (err) {
    console.error('❌ Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
