const { Router } = require('express');
const { execute } = require('../db');

const router = Router();

// Middleware para verificar si el usuario es un administrador
const isAdmin = async (req, res, next) => {
  const { id_usuario } = req.body; // O de donde sea que obtengas la ID del usuario

  try {
    const result = await execute(
      `SELECT ROL FROM USUARIO WHERE ID_USUARIO = :id`,
      { id: id_usuario }
    );

    if (result.rows.length > 0 && result.rows[0].ROL === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ruta para agregar un nuevo gerente (solo para admins)
router.post('/gerentes', isAdmin, async (req, res) => {
  const { nombre, correo, telefono, contrasena } = req.body;

  try {
    await execute(
      `INSERT INTO USUARIO (NOMBRE_USUARIO, CORREO, TELEFONO, CONTRASENA, ROL, ESTATUS) VALUES (:nombre, :correo, :telefono, :contrasena, 'gerente', 'activo')`,
      { nombre, correo, telefono, contrasena },
      { autoCommit: true }
    );
    res.status(201).json({ message: 'Gerente creado con éxito.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para modificar el estatus de un gerente (solo para admins)
router.put('/gerentes/:id/estatus', isAdmin, async (req, res) => {
  const { estatus } = req.body; // 'activo', 'inactivo', 'vacaciones'
  const { id } = req.params;

  try {
    const result = await execute(
      `UPDATE USUARIO SET ESTATUS = :estatus WHERE ID_USUARIO = :id AND ROL = 'gerente'`,
      { estatus, id },
      { autoCommit: true }
    );

    if (result.rowsAffected > 0) {
      res.json({ message: 'Estatus del gerente actualizado.' });
    } else {
      res.status(404).json({ error: 'Gerente no encontrado.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
