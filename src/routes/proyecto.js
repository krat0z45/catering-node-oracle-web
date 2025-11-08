const { Router } = require('express');
const { execute, oracledb } = require('../db');
const crypto = require('crypto');

const router = Router();

// ... isGerente middleware ...

// RUTA PARA SOLICITUD PÚBLICA Y REGISTRO AUTOMÁTICO
router.post('/solicitud-publica', async (req, res) => {
  // ... código existente ...
});

// RUTA PARA NUEVA SOLICITUD DE UN CLIENTE EXISTENTE
router.post('/solicitud-cliente', async (req, res) => {
    const { id_cliente, nombre_proyecto, fecha_evento, detalles } = req.body;

    if (!id_cliente || !nombre_proyecto || !fecha_evento) {
        return res.status(400).json({ error: 'Faltan datos requeridos (ID de cliente, nombre y fecha).' });
    }

    try {
        await execute(
            `INSERT INTO PROYECTO (ID_CLIENTE, NOMBRE_PROYECTO, FECHA_EVENTO, ESTATUS, NUM_INVITADOS)
             VALUES (:id_cliente, :nombre_proyecto, TO_DATE(:fecha_evento, 'YYYY-MM-DD'), 'Pendiente', 0)`,
            { id_cliente, nombre_proyecto, fecha_evento },
            { autoCommit: true }
        );
        res.status(201).json({ message: 'Nueva solicitud creada con éxito.' });
    } catch (err) {
        console.error('Error en solicitud de cliente existente:', err);
        res.status(500).json({ error: 'Error al crear la solicitud.' });
    }
});


// RUTA PARA ACTUALIZAR EL ESTADO DE UN PROYECTO
router.put('/:id/estado', isGerente, async (req, res) => {
  // ... código existente ...
});

// --- RUTAS EXISTENTES ---
// ... resto de las rutas GET, POST, etc. ...

module.exports = router;
