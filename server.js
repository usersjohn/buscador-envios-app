// server.js
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cookieParser = require('cookie-parser'); 

// --- CONFIGURACIÓN DE SEGURIDAD ---
const ADMIN_PASSWORD = "TU_CONTRASEÑA_SECRETA_ADMIN"; 
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


// --- RUTAS DE ADMINISTRACIÓN (PROTEGIDAS) ---

// Ruta de Login (Público)
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Procesar Login (Público)
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.cookie(SESSION_COOKIE_NAME, ADMIN_PASSWORD, { maxAge: 3600000, httpOnly: true }); 
        return res.redirect('/admin');
    }
    res.send('Contraseña incorrecta. <a href="/admin-login">Intentar de nuevo</a>');
});

// Portal de Administración (PROTEGIDO)
app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 3. API de Actualización (PROTEGIDA)
app.post('/api/update', requireAdmin, async (req, res) => {
    const { id, field, value } = req.body; 

    const forbiddenFields = ['id', 'created_at', 'updated_at']; 
    if (forbiddenFields.includes(field) || !id || !field || value === undefined || value === null) {
        return res.status(400).json({ success: false, error: 'Parámetros inválidos o campo prohibido.' });
    }

    try {
        await pool.query(
            `UPDATE envios SET ${field} = $1 WHERE id = $2`,
            [value, id]
        );
        
        res.status(200).json({ success: true, message: 'Registro actualizado con éxito.' });

    } catch (err) {
        console.error('Error al actualizar:', err.message);
        res.status(500).json({ success: false, error: 'Error al actualizar la DB. Verifique el nombre del campo o el tipo de dato.' });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```
eof

### 3. Pasos para Corregir el Despliegue

1.  **Edita `package.json`:** Asegúrate de que tu `package.json` local sea idéntico al que está en el Canvas ahora (incluyendo `cookie-parser`).
2.  **Edita `server.js`:** Reemplaza el contenido completo con el código del Canvas.
3.  **Subir la Corrección:**
    ```bash
    git add package.json server.js
    git commit -m "Fix: Solucionado error 'Cannot find module cookie-parser' y verificado el método GET"
    git push origin main