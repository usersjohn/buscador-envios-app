// server.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// --- CORRECCIÓN CRÍTICA: Inicializar 'app' antes de usarlo ---
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de PostgreSQL. Railway inyecta esta variable.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware para servir archivos estáticos (index.html, styles.css, app.js)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Necesario para manejar solicitudes JSON

// 1. Ruta principal: Sirve la página de búsqueda
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. API de Búsqueda: Ejecuta la consulta a la base de datos
app.get('/api/search', async (req, res) => {
    const { type, value } = req.query;
    const searchTerm = value ? value.trim().toUpperCase() : ''; // Normalizamos la búsqueda

    if (!searchTerm || !type) {
        return res.status(400).json({ error: 'Faltan parámetros de búsqueda.' });
    }

    let query = `SELECT id, imagen_link, numero_seguimiento, nombre_receptor, codigo_ddp, costo, moneda_costo, fecha_envio, fecha_recepcion, empresa_transporte, proveedor, contenido, peso, estado FROM envios WHERE `;
    let params = [searchTerm];

    try {
        switch (type) {
            case 'tracking':
                query += `numero_seguimiento = $1`;
                break;
            case 'ddp':
                // Extrae solo números y busca exactamente el código DDP
                const cleanDDP = searchTerm.replace(/[^0-9]/g, '');
                query += `codigo_ddp = $1`;
                params = [cleanDDP];
                break;
            case 'receptor':
                // Búsqueda parcial por nombre y apellido (usando ILIKE y comodines)
                query += `nombre_receptor ILIKE $1`;
                params = [`%${searchTerm}%`];
                break;
            default:
                return res.status(400).json({ error: 'Tipo de búsqueda no válido.' });
        }

        const result = await pool.query(query, params);

        // Envía el array de resultados al frontend
        res.json({
            count: result.rows.length,
            packages: result.rows
        });

    } catch (err) {
        console.error('Error al ejecutar la consulta:', err.message);
        res.status(500).json({ error: 'Error al consultar la base de datos. Verifique la conexión.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});