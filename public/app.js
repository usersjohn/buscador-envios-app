// public/app.js (Extracto de la refactorización para AdminLTE)

// ... (Las funciones validateAndFormat, quickEdit, updateStatus, saveUpdate, deletePackage
// deben permanecer igual, pero quizás usar jQuery para las alertas o modales de AdminLTE, 
// lo cual no haremos aquí para mantener la compatibilidad con su código original).

document.addEventListener('DOMContentLoaded', () => {
    // ... (Eliminar elementos no usados: resultsContainer, searchType, searchValue, foundCountDiv, filterStateSelect, adminTableContainer)

    // --- NUEVOS ELEMENTOS ---
    const createForm = document.getElementById('create-form');
    const shipmentsTable = $('#shipmentsTable'); // Usar jQuery para DataTables

    const isAdminView = window.location.pathname.startsWith('/admin');

    if (isAdminView) {
        // 1. Inicializar la tabla de DataTables
        loadAdminTable(shipmentsTable);

        // 2. Listener para el formulario de creación (Mismo código)
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
                        // Recargar la tabla (DataTables lo hace con ajax.reload())
                        shipmentsTable.DataTable().ajax.reload();
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
    // ... (Mantener la lógica de búsqueda pública si es necesaria, pero eliminar la lógica de filtrado por estado antigua)
});

// --- FUNCIÓN DE CARGA DE TABLA CON DATATABLES ---
function loadAdminTable(tableElement) {
    if (!$.fn.DataTable) {
        console.error("DataTables no está cargado.");
        return;
    }

    // Inicializar DataTables con carga AJAX
    tableElement.DataTable({
        ajax: {
            url: '/api/admin/all-shipments',
            dataSrc: 'packages'
        },
        columns: [
            {
                data: 'id',
                render: (data, type, row) => `<span class="editable-cell" onclick="quickEdit(${data}, 'id', '${data}')">${data}</span>`
            },
            { data: 'numero_seguimiento', defaultContent: 'N/A' },
            {
                data: 'nombre_receptor',
                render: (data, type, row) => `<span class="editable-cell" onclick="quickEdit(${row.id}, 'nombre_receptor', '${data}')">${data}</span>`
            },
            { data: 'codigo_ddp' },
            { data: 'peso', render: (data) => `${data} kg` },
            {
                data: 'estado',
                render: (data, type, row) => {
                    const statusClass = getStatusClass(data);
                    return `<span class="badge ${statusClass}" 
                                onclick="quickEdit(${row.id}, 'estado', '${data}')"
                                style="cursor:pointer;">${data}</span>`;
                }
            },
            {
                // Columna de Acciones (Botones)
                data: null,
                orderable: false,
                render: (data, type, row) => {
                    return `
                        <button class="btn btn-sm btn-danger" onclick="deletePackage(${row.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                }
            }
        ],
        // Opciones de DataTables (Español)
        language: {
            "decimal": "",
            "emptyTable": "No hay datos disponibles en la tabla",
            "info": "Mostrando _START_ a _END_ de _TOTAL_ entradas",
            "infoEmpty": "Mostrando 0 a 0 de 0 entradas",
            "infoFiltered": "(filtrado de _MAX_ entradas totales)",
            "infoPostFix": "",
            "thousands": ",",
            "lengthMenu": "Mostrar _MENU_ entradas",
            "loadingRecords": "Cargando...",
            "processing": "Procesando...",
            "search": "Buscar:",
            "zeroRecords": "No se encontraron registros coincidentes",
            "paginate": {
                "first": "Primero",
                "last": "Último",
                "next": "Siguiente",
                "previous": "Anterior"
            },
            "aria": {
                "sortAscending": ": activar para ordenar la columna ascendente",
                "sortDescending": ": activar para ordenar la columna descendente"
            }
        },
        responsive: true,
        autoWidth: false,
        order: [[0, "desc"]] // Ordenar por ID descendente por defecto
    });
}

function getStatusClass(status) {
    if (status === 'RECIBIDO EN CUCUTA') return 'badge-warning'; // Amarillo
    if (status === 'ENVIADO A TACHIRA') return 'badge-primary';  // Azul
    if (status === 'ENVIADO A CLIENTE') return 'badge-success';  // Verde
    return 'badge-secondary';
}