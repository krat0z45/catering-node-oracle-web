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

// Agregar un platillo a un proyecto
router.post('/:id_proyecto/platillos', isGerente, async (req, res) => {
  const { id_platillo } = req.body;
  const { id_proyecto } = req.params;

  try {
    // Verificar si el platillo ya existe en el proyecto
    const platilloExistente = await execute(
      `SELECT * FROM PROYECTO_PLATILLO WHERE ID_PROYECTO = :id_proyecto AND ID_PLATILLO = :id_platillo`,
      { id_proyecto, id_platillo }
    );

    if (platilloExistente.rows.length > 0) {
      return res.status(409).json({ error: 'Este platillo ya ha sido agregado al proyecto.' });
    }

    // Si no existe, agregarlo
    await execute(
      `INSERT INTO PROYECTO_PLATILLO (ID_PROYECTO, ID_PLATILLO) VALUES (:id_proyecto, :id_platillo)`,
      { id_proyecto, id_platillo },
      { autoCommit: true }
    );

    res.status(201).json({ message: 'Platillo agregado al proyecto correctamente.' });
  } catch (err) {
    console.error('Error al agregar platillo al proyecto:', err);
    res.status(500).json({ error: err.message });
  }
});

// Agregar un complemento a un proyecto
router.post('/:id_proyecto/complementos', isGerente, async (req, res) => {
    const { id_complemento } = req.body;
    const { id_proyecto } = req.params;
  
    try {
      // Verificar si el complemento ya existe en el proyecto
      const complementoExistente = await execute(
        `SELECT * FROM PROYECTO_COMPLEMENTO WHERE ID_PROYECTO = :id_proyecto AND ID_COMPLEMENTO = :id_complemento`,
        { id_proyecto, id_complemento }
      );
  
      if (complementoExistente.rows.length > 0) {
        return res.status(409).json({ error: 'Este complemento ya ha sido agregado al proyecto.' });
      }
  
      // Si no existe, agregarlo
      await execute(
        `INSERT INTO PROYECTO_COMPLEMENTO (ID_PROYECTO, ID_COMPLEMENTO) VALUES (:id_proyecto, :id_complemento)`,
        { id_proyecto, id_complemento },
        { autoCommit: true }
      );
  
      res.status(201).json({ message: 'Complemento agregado al proyecto correctamente.' });
    } catch (err) {
      console.error('Error al agregar complemento al proyecto:', err);
      res.status(500).json({ error: err.message });
    }
  });

module.exports = router;