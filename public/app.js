// public/app.js

// --- LÓGICA DE VALIDACIÓN (Es la misma, solo se mueve al inicio) ---
function validateAndFormat(field, value) {
    const trimmedValue = value.trim();

    // 1. Manejo de Fechas
    if (field === 'fecha_envio' || field === 'fecha_recepcion') {
        if (trimmedValue.toUpperCase() === 'N/A' || trimmedValue === '') {
            return null; 
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/; 
        if (!dateRegex.test(trimmedValue)) {
            alert(`Error: El campo de fecha (${field}) debe estar en formato YYYY-MM-DD o ser 'N/A'.`);
            return false;
        }
        return trimmedValue;
    }

    // 2. Manejo de Números (Costo y Peso)
    if (field === 'costo' || field === 'peso') {
        const numericValue = parseFloat(trimmedValue);
        if (isNaN(numericValue)) {
            alert(`Error: El campo '${field}' debe ser un valor numérico.`);
            return false;
        }
        return numericValue; 
    }
    
    // 3. Manejo de Texto
    if (field === 'nombre_receptor') {
        return trimmedValue.toUpperCase();
    }
    
    return trimmedValue;
}

// --- LÓGICA DE EDICIÓN RÁPIDA (CRUD UPDATE) ---
function quickEdit(id, currentField, currentValue) {
    // ESTA FUNCIÓN SOLO SE LLAMARÁ SI EL ELEMENTO TIENE EL ONCLICK (SOLO EN /ADMIN)
    
    const newValue = prompt(
        `Corregir campo '${currentField}' (ID: ${id}):\n\nValor actual: ${currentValue}\n\nIngrese nuevo valor:`
    );

    if (newValue === null) {
        return;
    }

    const validatedValue = validateAndFormat(currentField, newValue);
    
    if (validatedValue === false) {
        return; 
    }

    fetch('/api/update', { // Llama a la API PROTEGIDA
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: id,
            field: currentField, 
            value: validatedValue 
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`✅ Actualización de '${currentField}' exitosa!`);
            window.location.reload(); 
        } else {
            alert(`❌ Error al guardar: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error de red:', error);
        alert('❌ Error de conexión al servidor.');
    });
}

// --- LÓGICA DE RENDERIZADO ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const resultsContainer = document.getElementById('results-container');
    const searchType = document.getElementById('search-type');
    const searchValue = document.getElementById('search-value');
    const foundCountDiv = document.getElementById('found-count');
    
    // Detectar si estamos en la vista de ADMINISTRACIÓN o PÚBLICA
    const isAdminView = window.location.pathname.startsWith('/admin');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... (Lógica de búsqueda AJAX idéntica) ...
        const type = searchType.value;
        const value = searchValue.value;
        
        resultsContainer.innerHTML = '';
        foundCountDiv.innerHTML = 'Buscando...';

        try {
            const response = await fetch(`/api/search?type=${type}&value=${value}`);
            const data = await response.json();

            if (data.error) {
                resultsContainer.innerHTML = `<p class="error-message">Error: ${data.error}</p>`;
                foundCountDiv.innerHTML = '';
                return;
            }

            renderResults(data);

        } catch (error) {
            resultsContainer.innerHTML = `<p class="error-message">Error de conexión al servidor.</p>`;
            foundCountDiv.innerHTML = '';
            console.error('Fetch error:', error);
        }
        
    });

    function renderResults(data) {
        foundCountDiv.innerHTML = `Se encontraron <b>${data.count}</b> paquete(s).`;
        resultsContainer.innerHTML = '';

        if (data.count === 0) {
            resultsContainer.innerHTML = `<p class="package-card">No se encontraron paquetes para su consulta.</p>`;
            return;
        }

        data.packages.forEach(pkg => {
            resultsContainer.innerHTML += createPackageCard(pkg, isAdminView); // Pasar el estado de administrador
        });
    }

    // Función que construye la tarjeta de resultado
    function createPackageCard(pkg, isAdmin) {
        const fechaRecepcion = pkg.fecha_recepcion && pkg.fecha_recepcion !== 'N/A' ? pkg.fecha_recepcion.substring(0, 10) : 'N/A';
        const fechaEnvio = pkg.fecha_envio && pkg.fecha_envio !== 'N/A' ? pkg.fecha_envio.substring(0, 10) : 'N/A';
        
        const imageUrl = pkg.imagen_link; 
        const estado = pkg.estado || 'Estado No Definido';
        const isErrorImage = !imageUrl || imageUrl === 'N/A';
        
        const imageHtml = isErrorImage 
            ? `<div class="image-section">Error al cargar la imagen</div>`
            : `<div class="image-section" style="background-color: #f0f8ff;">
                <p><a href="${imageUrl}" target="_blank">(Clic para Abrir Foto)</a></p>
               </div>`;
        
        // Función para aplicar la edición condicional
        const editableAttr = (field, value) => isAdmin ? `class="editable" onclick="quickEdit(${pkg.id}, '${field}', '${value}')"` : '';
        const editableClass = isAdmin ? 'editable' : ''; // Solo para el estilo en la sección de estado

        return `
            <div class="package-card">
                <div class="card-title">Paquete: ${pkg.numero_seguimiento || 'N/A'}</div>

                <p>Imagen de Paquete Recibido: ${isErrorImage ? '' : `<a href="${imageUrl}" target="_blank">(Clic para Abrir)</a>`}</p>
                
                ${imageHtml}
                
                <div class="detail-row">
                    <span class="detail-label">Cliente/Receptor:</span>
                    <span class="detail-value" ${editableAttr('nombre_receptor', pkg.nombre_receptor)}>${pkg.nombre_receptor}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Código DDP (Ref.):</span>
                    <span class="detail-value" ${editableAttr('codigo_ddp', pkg.codigo_ddp)}>${pkg.codigo_ddp}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Peso:</span>
                    <span class="detail-value" ${editableAttr('peso', pkg.peso)}>${pkg.peso} kg/lbs</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contenido:</span>
                    <span class="detail-value" ${editableAttr('contenido', pkg.contenido)}>${pkg.contenido}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Transportista (Origen):</span>
                    <span class="detail-value" ${editableAttr('empresa_transporte', pkg.empresa_transporte)}>${pkg.empresa_transporte}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Proveedor:</span>
                    <span class="detail-value" ${editableAttr('proveedor', pkg.proveedor)}>${pkg.proveedor}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Fecha de Recepción:</span>
                    <span class="detail-value" ${editableAttr('fecha_recepcion', fechaRecepcion)}>${fechaRecepcion}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha de Envío/Emisión:</span>
                    <span class="detail-value" ${editableAttr('fecha_envio', fechaEnvio)}>${fechaEnvio}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Costo/Valor:</span>
                    <span class="detail-value" ${editableAttr('costo', pkg.costo)}>${pkg.moneda_costo || 'N/A'} ${pkg.costo}</span>
                </div>
                
                <div class="status-section ${editableClass}" ${editableAttr('estado', estado)}>ESTADO ACTUAL: ${estado}</div>
            </div>
        `;
    }
});