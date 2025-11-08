const { Router } = require('express');
const { execute } = require('../db');
const crypto = require('crypto');

const router = Router();

// POST /api/usuario/login - Autenticación de usuario
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;
  try {
    const result = await execute(
      `SELECT ID_USUARIO, NOMBRE_USUARIO, ROL FROM USUARIO WHERE CORREO = :correo AND CONTRASENA = :contrasena`,
      { correo, contrasena }
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }
    const user = result.rows[0];
    res.json({ id: user.ID_USUARIO, nombre: user.NOMBRE_USUARIO, rol: user.ROL });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
  }
});

// Middleware para verificar si el usuario es administrador
const isAdmin = async (req, res, next) => {
  const { id_usuario_accion } = req.body;
  if (!id_usuario_accion) {
    return res.status(400).json({ error: 'Falta el ID del usuario que realiza la acción.' });
  }
  try {
    const result = await execute(`SELECT ROL FROM USUARIO WHERE ID_USUARIO = :id`, { id: id_usuario_accion });
    const userRole = result.rows[0]?.ROL;
    if (userRole === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/usuario/gerentes - Obtener todos los gerentes
router.get('/gerentes', async (req, res) => {
    try {
        const result = await execute(`SELECT ID_USUARIO, NOMBRE_USUARIO, CORREO, TELEFONO FROM USUARIO WHERE ROL = 'gerente'`);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener gerentes: ' + err.message });
    }
});

// POST /api/usuario/gerentes - Crear un nuevo gerente (solo admin)
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
        res.status(500).json({ error: 'Error al crear gerente: ' + err.message });
    }
});

module.exports = router;
