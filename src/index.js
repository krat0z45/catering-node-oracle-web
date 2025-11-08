const express = require('express');
const { init } = require('./db');

const proyectoRoutes = require('./routes/proyecto');
const salonRoutes = require('./routes/salon');
const platilloRoutes = require('./routes/platillo');
const complementoRoutes = require('./routes/complemento');
const usuarioRoutes = require('./routes/usuario');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Para parsear JSON en el body de las requests
app.use(express.static('public')); // Para servir archivos estáticos (HTML, CSS, JS del cliente)

// Rutas de la API
app.use('/api/proyecto', proyectoRoutes);
app.use('/api/salon', salonRoutes);
app.use('/api/platillo', platilloRoutes);
app.use('/api/complemento', complementoRoutes);
app.use('/api/usuario', usuarioRoutes);

// Manejo de rutas no encontradas en la API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Ruta API no encontrada' });
});

// Fallback para todas las demás rutas (sirve el index.html para SPA-like behavior)
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Iniciar la base de datos y luego el servidor
async function startup() {
    try {
        console.log('Iniciando la base de datos...');
        await init();
        console.log('Base de datos inicializada.');

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('Error durante el inicio:', err);
        process.exit(1); // Salir si la base de datos no se puede iniciar
    }
}

startup();
