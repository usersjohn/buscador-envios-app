// server.js (Sólo la parte de la consulta, el resto del código es igual)
// ... (código Express y Pool) ...

// --- API de Búsqueda ---
app.get('/api/search', async (req, res) => {
    // ... (manejo de parámetros y errores) ...

    try {
        // La consulta ahora incluye el campo 'imagen_link'
        let query = `SELECT id, imagen_link, numero_seguimiento, nombre_receptor, codigo_ddp, costo, moneda_costo, fecha_envio, fecha_recepcion, empresa_transporte, proveedor, contenido, peso, estado FROM envios WHERE `;
        let params = [searchTerm];

        switch (type) {
            case 'tracking':
                query += `numero_seguimiento = $1`;
                break;
            case 'ddp':
                const cleanDDP = searchTerm.replace(/[^0-9]/g, '');
                query += `codigo_ddp = $1`;
                params = [cleanDDP];
                break;
            case 'receptor':
                query += `nombre_receptor ILIKE $1`;
                params = [`%${searchTerm}%`];
                break;
            default:
                return res.status(400).json({ error: 'Tipo de búsqueda no válido.' });
        }

        const result = await pool.query(query, params);
        res.json({
            count: result.rows.length,
            packages: result.rows
        });

    } catch (err) {
        // ... (manejo de errores) ...
    }
});
// ... (código app.listen) ...