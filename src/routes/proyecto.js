const { Router } = require('express');
const { execute } = require('../db');
// ... (otros requires)

const router = Router();
// ... (middlewares)

// --- RUTAS PRINCIPALES ---
router.get('/', async (req, res) => { /* ... */ });
router.get('/:id', async (req, res) => { /* ... */ });

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

router.get('/cliente/:id', async (req, res) => { /* ... */ });
router.post('/', isGerente, async (req, res) => { /* ... */ });

// --- GESTIÓN DE PLATILLOS Y COMPLEMENTOS ---
// ... (rutas de platillos y complementos)

// --- OTRAS RUTAS DE ACTUALIZACIÓN ---
// ... (rutas de invitados y cancelar)

module.exports = router;
