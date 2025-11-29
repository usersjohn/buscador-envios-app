// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cookieParser = require('cookie-parser');

// --- CONFIGURACIÓN DE SEGURIDAD ---
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_COOKIE_NAME = 'admin_session';

// --- 1. Inicialización de Express (CRÍTICO: El orden es vital) ---
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- FUNCIÓN DE VERIFICACIÓN DE SESIÓN (Middleware) ---
const requireAdmin = (req, res, next) => {
    if (!ADMIN_PASSWORD) {
        console.error('ERROR DE SEGURIDAD: ADMIN_PASSWORD no configurada en Railway.');
        return res.status(500).send('ERROR: La clave de administración no está configurada en el servidor.');
    }

    if (req.cookies[SESSION_COOKIE_NAME] === ADMIN_PASSWORD) {
        return next();
    }
    res.redirect('/admin-login');
};


// --- RUTAS PÚBLICAS (Búsqueda) ---

// 1. Ruta principal: Sirve la página de búsqueda (SIN EDICIÓN)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. API de Búsqueda (Método GET): Ejecuta la consulta (Usado por el público y el admin)
app.get('/api/search', async (req, res) => {
    const { type, value } = req.query;
    const searchTerm = value ? value.trim().toUpperCase() : '';
    const originalValue = req.query.value ? req.query.value.trim() : ''; // Valor sin uppercase para ID

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
                const cleanDDP = searchTerm.replace(/[^0-9]/g, '');
                query += `codigo_ddp = $1`;
                params = [cleanDDP];
                break;
            case 'receptor':
                query += `nombre_receptor ILIKE $1`;
                params = [`%${searchTerm}%`];
                break;
            case 'dbid':
                // Nueva búsqueda por ID de PostgreSQL (número entero)
                const dbId = parseInt(originalValue, 10);
                if (isNaN(dbId) || dbId <= 0) {
                    return res.status(400).json({ error: 'El ID de registro debe ser un número entero positivo.' });
                }
                query += `id = $1`;
                params = [dbId]; // El ID es numérico, lo pasamos como número
                break;
            case 'state':
                query += `estado = $1`;
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
        console.error('Error al ejecutar la consulta:', err.message);
        res.status(500).json({ error: 'Error al consultar la base de datos. Verifique la conexión.' });
    }
});


// 2.1 API de Filtrado por Estado (Método GET)
app.get('/api/filter-by-state', async (req, res) => {
    const { state } = req.query;

    if (!state) {
        return res.status(400).json({ error: 'Falta el parámetro de estado.' });
    }

    try {
        const query = `SELECT id, imagen_link, numero_seguimiento, nombre_receptor, codigo_ddp, costo, moneda_costo, fecha_envio, fecha_recepcion, empresa_transporte, proveedor, contenido, peso, estado FROM envios WHERE estado = $1`;
        const result = await pool.query(query, [state]);

        res.json({
            count: result.rows.length,
            packages: result.rows
        });

    } catch (err) {
        console.error('Error al filtrar por estado:', err.message);
        res.status(500).json({ error: 'Error al consultar la base de datos.' });
    }
});


// --- RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ---

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin-login', (req, res) => {
    if (!ADMIN_PASSWORD) {
        console.error('ERROR DE SEGURIDAD: ADMIN_PASSWORD no configurada en Railway.');
        return res.status(500).send('ERROR: La clave de administración no está configurada en el servidor.');
    }

    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.cookie(SESSION_COOKIE_NAME, ADMIN_PASSWORD, { maxAge: 3600000, httpOnly: true });
        return res.redirect('/admin');
    }
    res.send('Contraseña incorrecta. <a href="/admin-login">Intentar de nuevo</a>');
});

app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 3. API de Actualización (PROTEGIDA)
app.post('/api/update', requireAdmin, async (req, res) => {
    let { id, field, value } = req.body;

    const recordId = parseInt(id, 10);

    if (typeof value === 'string' && value.trim() === '') {
        value = null;
    }

    const forbiddenFields = ['id', 'created_at', 'updated_at'];

    if (forbiddenFields.includes(field) || !recordId || recordId <= 0 || !field) {
        return res.status(400).json({ success: false, error: 'Parámetros inválidos. ID no numérico o faltante.' });
    }

    try {
        await pool.query(
            `UPDATE envios SET ${field} = $1 WHERE id = $2`,
            [value, recordId]
        );

        res.status(200).json({ success: true, message: 'Registro actualizado con éxito.' });

    } catch (err) {
        console.error('Error al actualizar:', err.message);
        res.status(500).json({ success: false, error: `Error interno al actualizar. Tipo de dato o caracter inválido: ${err.message}` });
    }
});

// 3.1 API de Actualización Completa (PROTEGIDA)
app.post('/api/update-full', requireAdmin, async (req, res) => {
    const {
        id, numero_seguimiento, codigo_ddp, nombre_receptor, peso, contenido,
        empresa_transporte, proveedor, fecha_recepcion, costo, moneda_costo,
        imagen_link, estado
    } = req.body;

    const recordId = parseInt(id, 10);

    if (!recordId || recordId <= 0) {
        return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
        const query = `
            UPDATE envios SET
                numero_seguimiento = $1,
                codigo_ddp = $2,
                nombre_receptor = $3,
                peso = $4,
                contenido = $5,
                empresa_transporte = $6,
                proveedor = $7,
                fecha_recepcion = $8,
                costo = $9,
                moneda_costo = $10,
                imagen_link = $11,
                estado = $12
            WHERE id = $13
        `;

        const values = [
            numero_seguimiento || null,
            codigo_ddp || null,
            nombre_receptor || null,
            peso || 0,
            contenido || null,
            empresa_transporte || null,
            proveedor || null,
            fecha_recepcion || null,
            costo || 0,
            moneda_costo || 'USD',
            imagen_link || null,
            estado || 'RECIBIDO EN CUCUTA',
            recordId
        ];

        await pool.query(query, values);
        res.status(200).json({ success: true, message: 'Registro actualizado exitosamente.' });

    } catch (err) {
        console.error('Error al actualizar completo:', err.message);
        res.status(500).json({ success: false, error: `Error al actualizar: ${err.message}` });
    }
});

// 4. API de Creación (PROTEGIDA)
app.post('/api/create', requireAdmin, async (req, res) => {
    const {
        numero_seguimiento, codigo_ddp, nombre_receptor, peso, contenido,
        empresa_transporte, proveedor, fecha_recepcion, costo, moneda_costo,
        imagen_link, estado
    } = req.body;

    try {
        const query = `
            INSERT INTO envios (
                numero_seguimiento, codigo_ddp, nombre_receptor, peso, contenido, 
                empresa_transporte, proveedor, fecha_recepcion, costo, moneda_costo, 
                imagen_link, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        `;

        const values = [
            numero_seguimiento || null,
            codigo_ddp || null,
            nombre_receptor || null,
            peso || 0,
            contenido || null,
            empresa_transporte || null,
            proveedor || null,
            fecha_recepcion || null,
            costo || 0,
            moneda_costo || 'USD',
            imagen_link || null,
            estado || 'RECIBIDO EN CUCUTA'
        ];

        const result = await pool.query(query, values);
        res.status(201).json({ success: true, id: result.rows[0].id, message: 'Envío creado exitosamente.' });

    } catch (err) {
        console.error('Error al crear envío:', err.message);
        res.status(500).json({ success: false, error: `Error al crear: ${err.message}` });
    }
});

// 5. API de Eliminación (PROTEGIDA)
app.post('/api/delete', requireAdmin, async (req, res) => {
    const { id } = req.body;
    const recordId = parseInt(id, 10);

    if (!recordId || recordId <= 0) {
        return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
        await pool.query('DELETE FROM envios WHERE id = $1', [recordId]);
        res.status(200).json({ success: true, message: 'Registro eliminado exitosamente.' });
    } catch (err) {
        console.error('Error al eliminar:', err.message);
        res.status(500).json({ success: false, error: `Error al eliminar: ${err.message}` });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});