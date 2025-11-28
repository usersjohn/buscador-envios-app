// server.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de PostgreSQL. Railway inyecta esta variable de forma automática.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Middleware para servir archivos estáticos (como index.html)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // Para leer datos del formulario

// 1. Ruta principal: Sirve la página de búsqueda
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Ruta de Búsqueda: Ejecuta la consulta a la base de datos
app.post('/search', async (req, res) => {
    const searchTerm = req.body.tracking_number.trim();

    if (!searchTerm) {
        return res.redirect('/');
    }

    try {
        const client = await pool.connect();
        // Consulta SQL para buscar por numero_seguimiento o nombre
        // Usamos ILIKE para buscar sin distinguir mayúsculas/minúsculas
        const result = await client.query(
            `SELECT * FROM envios 
             WHERE numero_seguimiento = $1 OR nombre_receptor ILIKE $1`,
            [searchTerm.toUpperCase()] // Convertimos a mayúsculas para buscar en la DB
        );
        client.release();

        // Renderizar los resultados (los envia de vuelta al cliente)
        res.send(`
            <h2>Resultados de Búsqueda: "${searchTerm}"</h2>
            <p><a href="/">Nueva Búsqueda</a></p>
            <pre>${JSON.stringify(result.rows, null, 2)}</pre>
        `);

    } catch (err) {
        console.error('Error al ejecutar la consulta', err);
        res.status(500).send('Error interno del servidor.');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});