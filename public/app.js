// public/app.js

// --- LÓGICA DE VALIDACIÓN ---
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
    if (currentField === 'estado') {
        updateStatus(id, currentValue);
        return;
    }

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

    saveUpdate(id, currentField, validatedValue);
}

function updateStatus(id, currentStatus) {
    const options = ['RECIBIDO EN CUCUTA', 'ENVIADO A TACHIRA', 'ENVIADO A CLIENTE'];
    let optionList = options.map((opt, index) => `${index + 1}. ${opt}`).join('\n');

    const selection = prompt(`Seleccione el nuevo estado para el ID ${id}:\n\n${optionList}\n\nIngrese el número de la opción:`);

    if (!selection) return;

    const index = parseInt(selection) - 1;
    if (index >= 0 && index < options.length) {
        saveUpdate(id, 'estado', options[index]);
    } else {
        alert("Opción inválida.");
    }
}

function saveUpdate(id, field, value) {
    fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`✅ Actualización de '${field}' exitosa!`);
                const filterState = document.getElementById('filter-state');
                if (filterState && filterState.value) {
                    document.getElementById('filter-button').click();
                } else {
                    window.location.reload();
                }
            } else {
                alert(`❌ Error al guardar: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error de red:', error);
            alert('❌ Error de conexión al servidor.');
        });
}

// --- LÓGICA DE ELIMINACIÓN ---
function deletePackage(id) {
    if (!confirm("¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.")) {
        return;
    }

    fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("✅ Registro eliminado exitosamente.");
                window.location.reload();
            } else {
                alert(`❌ Error al eliminar: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('❌ Error de conexión.');
        });
}


// --- LÓGICA DE RENDERIZADO ---
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const resultsContainer = document.getElementById('results-container');
    const searchType = document.getElementById('search-type');
    const searchValue = document.getElementById('search-value');
    const foundCountDiv = document.getElementById('found-count');

    // Elementos nuevos para Admin
    const filterButton = document.getElementById('filter-button');
    const filterStateSelect = document.getElementById('filter-state');
    const adminTableContainer = document.getElementById('admin-table-container');
    const createForm = document.getElementById('create-form');

    // Detectar si estamos en la vista de ADMINISTRACIÓN o PÚBLICA
    const isAdminView = window.location.pathname.startsWith('/admin');

    // --- GESTIÓN DEL DROPDOWN SEGÚN ROL ---
    if (isAdminView) {
        const option = document.createElement('option');
        option.value = 'dbid';
        option.text = 'ID de Registro (Clave Única)';
        searchType.add(option, searchType.options[0]);
        searchType.value = 'dbid';

        // Listener para el botón de filtrado
        if (filterButton) {
            filterButton.addEventListener('click', async (e) => {
                e.preventDefault();
                const state = filterStateSelect.value;
                if (!state) {
                    alert("Por favor seleccione un estado.");
                    return;
                }

                foundCountDiv.innerHTML = 'Cargando tabla...';
                resultsContainer.innerHTML = '';
                adminTableContainer.innerHTML = '';

                try {
                    const response = await fetch(`/api/filter-by-state?state=${encodeURIComponent(state)}`);
                    const data = await response.json();

                    foundCountDiv.innerHTML = `Se encontraron <b>${data.count}</b> envíos con estado: <b>${state}</b>`;

                    if (data.count > 0) {
                        renderTable(data.packages);
                    } else {
                        adminTableContainer.innerHTML = '<p>No hay resultados.</p>';
                    }
                } catch (error) {
                    console.error("Error filtrando:", error);
                    adminTableContainer.innerHTML = '<p class="error-message">Error al cargar datos.</p>';
                }
            });
        }

        // Listener para el formulario de creación
        if (createForm) {
            createForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(createForm);
                const data = Object.fromEntries(formData.entries());

                try {
                    const response = await fetch('/api/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();

                    if (result.success) {
                        alert(`✅ Envío creado con ID: ${result.id}`);
                        createForm.reset();
                    } else {
                        alert(`❌ Error al crear: ${result.error}`);
                    }
                } catch (error) {
                    console.error('Error creando:', error);
                    alert('❌ Error de conexión.');
                }
            });
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = searchType.value;
        const value = searchValue.value;

        resultsContainer.innerHTML = '';
        if (adminTableContainer) adminTableContainer.innerHTML = '';
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
            resultsContainer.innerHTML += createPackageCard(pkg, isAdminView);
        });
    }

    function renderTable(packages) {
        if (!adminTableContainer) return;

        let tableHtml = `
            <table class="table table-bordered table-striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tracking</th>
                        <th>Receptor</th>
                        <th>DDP</th>
                        <th>Peso</th>
                        <th>Estado (Click para Editar)</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        packages.forEach(pkg => {
            const statusClass = getStatusClass(pkg.estado);
            tableHtml += `
                <tr>
                    <td>${pkg.id}</td>
                    <td>${pkg.numero_seguimiento || 'N/A'}</td>
                    <td class="editable" onclick="quickEdit(${pkg.id}, 'nombre_receptor', '${pkg.nombre_receptor}')">${pkg.nombre_receptor}</td>
                    <td>${pkg.codigo_ddp}</td>
                    <td>${pkg.peso}</td>
                    <td class="editable ${statusClass}" onclick="quickEdit(${pkg.id}, 'estado', '${pkg.estado}')" style="font-weight:bold;">${pkg.estado}</td>
                    <td>
                        <button onclick="quickEdit(${pkg.id}, 'estado', '${pkg.estado}')">Estado</button>
                        <button class="delete-btn" onclick="deletePackage(${pkg.id})">Borrar</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table>`;
        adminTableContainer.innerHTML = tableHtml;
    }

    function getStatusClass(status) {
        if (status === 'RECIBIDO EN CUCUTA') return 'status-received';
        if (status === 'ENVIADO A TACHIRA') return 'status-sent-tachira';
        if (status === 'ENVIADO A CLIENTE') return 'status-sent-client';
        return '';
    }

    // Función que construye la tarjeta de resultado
    function createPackageCard(pkg, isAdmin) {
        const fechaRecepcion = pkg.fecha_recepcion && pkg.fecha_recepcion !== 'N/A' ? pkg.fecha_recepcion.substring(0, 10) : 'N/A';

        const imageUrl = pkg.imagen_link;
        const estado = pkg.estado || 'Estado No Definido';
        const isErrorImage = !imageUrl || imageUrl === 'N/A';

        const imageHtml = isErrorImage
            ? `<div class="image-section">Error al cargar la imagen</div>`
            : `<div class="image-section" style="background-color: #f0f8ff;">
                <p><a href="${imageUrl}" target="_blank">(Clic para Abrir Foto)</a></p>
               </div>`;

        const editableAttr = (field, value) => isAdmin ? `class="editable" onclick="quickEdit(${pkg.id}, '${field}', '${value}')"` : '';
        const editableClass = isAdmin ? 'editable' : '';
        const statusColorClass = getStatusClass(estado);

        return `
            <div class="package-card">
                <div class="card-title">
                    Paquete: ${pkg.numero_seguimiento || 'N/A'}
                    <span class="db-id-tag">ID: ${pkg.id}</span>
                </div>

                <p>Imagen de Paquete Recibido: ${isErrorImage ? '' : `<a href="${imageUrl}" target="_blank">(Clic para Abrir)</a>`}</p>
                
                ${imageHtml}
                
                <div class="detail-row">
                    <span class="detail-label">Cliente:</span>
                    <span class="detail-value" ${editableAttr('nombre_receptor', pkg.nombre_receptor)}>${pkg.nombre_receptor}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Código DDP:</span> <!-- RENAMED: removed (Ref.) -->
                    <span class="detail-value" ${editableAttr('codigo_ddp', pkg.codigo_ddp)}>${pkg.codigo_ddp}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Peso:</span>
                    <span class="detail-value" ${editableAttr('peso', pkg.peso)}>${pkg.peso} kg</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contenido:</span>
                    <span class="detail-value" ${editableAttr('contenido', pkg.contenido)}>${pkg.contenido}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Empresa de Transporte:</span>
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
                    <span class="detail-label">Valor de la Mercancía:</span>
                    <span class="detail-value" ${editableAttr('costo', pkg.costo)}>${pkg.moneda_costo || 'N/A'} ${pkg.costo}</span>
                </div>
                
                <div class="status-section ${editableClass} ${statusColorClass}" ${editableAttr('estado', estado)}>ESTADO ACTUAL: ${estado}</div>
            </div>
        `;
    }
});