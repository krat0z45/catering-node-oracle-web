const { Router } = require('express');
const { execute } = require('../db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await execute('SELECT * FROM SALON');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
