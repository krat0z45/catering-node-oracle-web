const { Router } = require('express');
const { execute, oracledb } = require('../db');
const router = Router();


router.get('/', async (req, res) => {
const { q, limit = 20, offset = 0 } = req.query;
const sql = `
SELECT ID_RECETA, NOMBRE, CATEGORIA, RENDIMIENTO, COSTO_ESTIMADO
FROM RECETAS
WHERE (:q IS NULL OR UPPER(NOMBRE) LIKE UPPER('%' || :q || '%'))
ORDER BY NOMBRE
OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
`;
try {
const result = await execute(sql, { q: q || null, offset: Number(offset), limit: Number(limit) });
res.json(result.rows);
} catch (err) {
res.status(500).json({ error: err.message });
}
});


router.get('/:id', async (req, res) => {
const id = Number(req.params.id);
const sqlReceta = `SELECT * FROM RECETAS WHERE ID_RECETA = :id`;
const sqlIngredientes = `
SELECT i.NOMBRE, ri.CANTIDAD, ri.UNIDAD
FROM RECETAS_INGREDIENTES ri
JOIN INGREDIENTES i ON i.ID_INGREDIENTE = ri.ID_INGREDIENTE
WHERE ri.ID_RECETA = :id
`;
const sqlPasos = `SELECT PASO_NUM, INSTRUCCION FROM RECETAS_PASOS WHERE ID_RECETA = :id ORDER BY PASO_NUM`;
try {
const [r1, r2, r3] = await Promise.all([
execute(sqlReceta, { id }),
execute(sqlIngredientes, { id }),
execute(sqlPasos, { id })
]);
res.json({ receta: r1.rows[0], ingredientes: r2.rows, pasos: r3.rows });
} catch (err) {
res.status(500).json({ error: err.message });
}
});


module.exports = router;