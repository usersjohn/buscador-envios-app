// public/app.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const resultsContainer = document.getElementById('results-container');
    const searchType = document.getElementById('search-type');
    const searchValue = document.getElementById('search-value');
    const foundCountDiv = document.getElementById('found-count');

    // Maneja el envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = searchType.value;
        const value = searchValue.value;
        
        resultsContainer.innerHTML = '<h2>Buscando...</h2>';
        foundCountDiv.innerHTML = '';

        try {
            // Llama a la API de backend con los parámetros GET
            const response = await fetch(`/api/search?type=${type}&value=${value}`);
            const data = await response.json();

            if (data.error) {
                resultsContainer.innerHTML = `<p class="error-message">Error: ${data.error}</p>`;
                return;
            }

            renderResults(data);

        } catch (error) {
            resultsContainer.innerHTML = `<p class="error-message">Error de conexión al servidor.</p>`;
            console.error('Fetch error:', error);
        }
    });

    // Función para renderizar los resultados
    function renderResults(data) {
        foundCountDiv.innerHTML = `Se encontraron <b>${data.count}</b> paquete(s).`;
        resultsContainer.innerHTML = ''; // Limpia resultados

        if (data.count === 0) {
            resultsContainer.innerHTML = `<p>No se encontraron paquetes para la consulta.</p>`;
            return;
        }

        data.packages.forEach(pkg => {
            resultsContainer.innerHTML += createPackageCard(pkg);
        });
    }

    // Función que construye la tarjeta de resultado
    function createPackageCard(pkg) {
        // Formato y validación de datos
        const fechaRecepcion = pkg.fecha_recepcion && pkg.fecha_recepcion !== 'N/A' ? pkg.fecha_recepcion.substring(0, 10) : 'N/A';
        const fechaEnvio = pkg.fecha_envio && pkg.fecha_envio !== 'N/A' ? pkg.fecha_envio.substring(0, 10) : 'N/A';
        const imageUrl = pkg.imagen_link; // Usamos el nuevo campo

        // Lógica de estado y color
        const estado = pkg.estado || 'Estado No Definido';
        const estadoClass = estado.toLowerCase().includes('entregado') ? '#d4edda' : '#fff3cd'; // Estilo visual
        const estadoColor = estado.toLowerCase().includes('entregado') ? '#155724' : '#856404'; // Color de texto

        return `
            <div class="package-card">
                <div class="card-title">Paquete: ${pkg.numero_seguimiento || 'N/A'}</div>

                ${imageUrl && imageUrl !== 'N/A' ? 
                    `<div class="image-section" style="background-color: #f0f8ff;">
                        <p><a href="${imageUrl}" target="_blank">Imagen de Paquete Recibido: (Clic para Abrir)</a></p>
                    </div>` 
                    : `<div class="image-section" style="background-color: #ffe0e0;">Error al cargar la imagen</div>`
                }
                
                <div class="detail-row">
                    <span class="detail-label">Cliente/Receptor:</span>
                    <span class="detail-value">${pkg.nombre_receptor}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Código DDP (Ref.):</span>
                    <span class="detail-value">${pkg.codigo_ddp}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Transportista (Origen):</span>
                    <span class="detail-value">${pkg.empresa_transporte}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Proveedor:</span>
                    <span class="detail-value">${pkg.proveedor}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contenido:</span>
                    <span class="detail-value">${pkg.contenido}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Peso:</span>
                    <span class="detail-value">${pkg.peso} kg/lbs</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Costo/Valor:</span>
                    <span class="detail-value">${pkg.moneda_costo || 'N/A'} ${pkg.costo}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha de Recepción:</span>
                    <span class="detail-value">${fechaRecepcion}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha de Envío/Emisión:</span>
                    <span class="detail-value">${fechaEnvio}</span>
                </div>
                
                <div class="status-section" style="background-color: ${estadoClass}; color: ${estadoColor};">
                    ESTADO ACTUAL: ${estado}
                </div>
            </div>
        `;
    }
});