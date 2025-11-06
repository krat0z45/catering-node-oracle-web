const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { initPool, closePool } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/recetas', require('./routes/recetas'));
app.use('/api/platillo', require('./routes/platillo'));
app.use('/api/ingrediente', require('./routes/ingrediente'));
app.use('/api/instrucciones', require('./routes/instrucciones'));
app.use('/api/platillo_ingrediente', require('./routes/platillo_ingrediente'));
app.use('/api/complemento', require('./routes/complemento'));
app.use('/api/salon', require('./routes/salon'));
app.use('/api/solicitud', require('./routes/solicitud'));

const port = process.env.PORT || 3000;
initPool().then(() => {
app.listen(port, () => {
console.log(`Servidor listo → http://localhost:${port}`);
});
}).catch((err) => {
console.error('Error iniciando pool Oracle:', err);
process.exit(1);
});

process.on('SIGINT', async () => {
await closePool();
process.exit(0);
});