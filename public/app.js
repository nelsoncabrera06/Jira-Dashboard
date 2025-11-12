// Elementos del DOM
const refreshBtn = document.getElementById('refreshBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');
const issuesContainer = document.getElementById('issuesContainer');
const issuesTableBody = document.getElementById('issuesTableBody');

// Elementos de filtros
const filterType = document.getElementById('filterType');
const filterPriority = document.getElementById('filterPriority');
const filterStatus = document.getElementById('filterStatus');
const filterSummary = document.getElementById('filterSummary');
const sortBy = document.getElementById('sortBy');
const clearFiltersBtn = document.getElementById('clearFilters');

// API URL - usar URL relativa para funcionar con cualquier puerto
const API_URL = '/api';

// Variable global para almacenar todos los issues
let allIssues = [];

// Variables para tracking de ordenamiento
let currentSortColumn = null;
let currentSortDirection = 'asc';

// Variable para tracking de vista de epics
let isEpicViewActive = false;

// Variable para almacenar las notas
let issueNotes = {};

// Variable para almacenar las fechas scheduled
let issueScheduled = {};

// Función para obtener el icono del tipo de issue
function getIssueTypeIcon(issueType) {
    const type = issueType.toLowerCase();
    let icon = '◆';
    let color = '#5e6c84';

    if (type.includes('bug')) {
        icon = '🐛';
        color = '#cd1316';
    } else if (type.includes('story')) {
        icon = '📗';
        color = '#36b37e';
    } else if (type.includes('task')) {
        icon = '✓';
        color = '#4bade8';
    } else if (type.includes('epic')) {
        icon = '⚡';
        color = '#6554c0';
    } else if (type.includes('subtask') || type.includes('sub-task')) {
        icon = '□';
        color = '#4bade8';
    }

    return `<span class="issue-type-cell" style="color: ${color};">${icon} ${issueType}</span>`;
}

// Función para obtener el icono de prioridad
function getPriorityIcon(priority) {
    const priorityLower = priority.toLowerCase();
    let icon = '═';
    let className = 'priority-medium';

    if (priorityLower.includes('highest')) {
        icon = '⬆';
        className = 'priority-highest';
    } else if (priorityLower.includes('high')) {
        icon = '↑';
        className = 'priority-high';
    } else if (priorityLower.includes('medium')) {
        icon = '═';
        className = 'priority-medium';
    } else if (priorityLower.includes('low')) {
        icon = '↓';
        className = 'priority-low';
    } else if (priorityLower.includes('lowest')) {
        icon = '⬇';
        className = 'priority-lowest';
    }

    return `<span class="priority-cell ${className}">${priority} ${icon}</span>`;
}

// Función para formatear fechas
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Función para formatear fechas con día de la semana (para Scheduled)
function formatDateWithDay(dateString) {
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return `${formattedDate} ${dayName}`;
}

// Función para obtener el color del status
function getStatusBadge(status) {
    const statusLower = status.toLowerCase();
    let className = 'status-badge';

    if (statusLower.includes('to do') || statusLower === 'todo') {
        className += ' status-todo';
    } else if (statusLower.includes('in progress') || statusLower.includes('in review')) {
        className += ' status-inprogress';
    } else if (statusLower.includes('relex validation')) {
        className += ' status-relex-validation';
    } else if (statusLower.includes('customer validation')) {
        className += ' status-customer-validation';
    } else if (statusLower.includes('done') || statusLower.includes('closed')) {
        className += ' status-done';
    } else if (statusLower.includes('blocked') || statusLower.includes('declined')) {
        className += ' status-blocked';
    } else {
        className += ' status-default';
    }

    return `<span class="${className}">${status}</span>`;
}

// Función para crear una fila de issue
function createIssueRow(issue, isChild = false) {
    const row = document.createElement('tr');

    // Agregar clase especial para filas hijas
    if (isChild) {
        row.classList.add('child-row');
    }

    // Agregar clase especial para filas de epic
    if (issue.issueType.toLowerCase().includes('epic')) {
        row.classList.add('epic-row');
    }

    const summaryPrefix = isChild ? '<span class="tree-prefix">|-- </span>' : '';

    // Calcular si la fecha de vencimiento necesita alerta de color
    let dueDateCell = '<span class="date-cell no-date">-</span>';
    if (issue.duedate) {
        const dueDate = new Date(issue.duedate);
        dueDate.setHours(0, 0, 0, 0); // Normalizar a medianoche
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a medianoche
        const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        const oneMonthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        let dueDateClass = '';
        if (dueDate <= twoWeeksFromNow && dueDate >= today) {
            dueDateClass = ' due-soon'; // Rojo para menos de 2 semanas
        } else if (dueDate <= oneMonthFromNow && dueDate >= today) {
            dueDateClass = ' due-warning'; // Amarillo para menos de 1 mes
        }

        dueDateCell = `<span class="date-cell${dueDateClass}">⏰ ${formatDate(issue.duedate)}</span>`;
    }

    const noteText = issueNotes[issue.key] || '';
    const scheduledDate = issueScheduled[issue.key] || '';

    // Calcular si la fecha scheduled necesita alerta de color y formatear con día
    let scheduledClass = '';
    let scheduledTitle = '';
    if (scheduledDate) {
        const scheduled = new Date(scheduledDate);
        scheduled.setHours(0, 0, 0, 0); // Normalizar a medianoche
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a medianoche
        const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Si la fecha es hoy o ya pasó, rojo
        if (scheduled <= today) {
            scheduledClass = ' scheduled-overdue';
        }
        // Si la fecha está dentro de 1 semana (pero no hoy ni pasada), amarillo
        else if (scheduled <= oneWeekFromNow) {
            scheduledClass = ' scheduled-soon';
        }

        scheduledTitle = formatDateWithDay(scheduledDate);
    }

    // Crear celda de scheduled con input y día de la semana
    let scheduledCell = `<input type="date" class="scheduled-input${scheduledClass}" data-issue-key="${issue.key}" value="${scheduledDate}" placeholder="Select date..." title="${scheduledTitle}">`;
    if (scheduledDate) {
        const dayName = new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'short' });
        scheduledCell = `
            <div class="scheduled-container">
                <input type="date" class="scheduled-input${scheduledClass}" data-issue-key="${issue.key}" value="${scheduledDate}" title="${scheduledTitle}">
                <span class="scheduled-day">${dayName}</span>
            </div>
        `;
    }

    row.innerHTML = `
        <td>${getIssueTypeIcon(issue.issueType)}</td>
        <td><a href="${issue.url}" target="_blank" class="issue-key-link">${issue.key}</a></td>
        <td><span class="issue-summary">${summaryPrefix}${issue.summary}</span></td>
        <td>${getPriorityIcon(issue.priority)}</td>
        <td><span class="date-cell">📅 ${formatDate(issue.created)}</span></td>
        <td><span class="date-cell">🔄 ${formatDate(issue.updated)}</span></td>
        <td>${dueDateCell}</td>
        <td>${getStatusBadge(issue.status)}</td>
        <td>${scheduledCell}</td>
        <td><input type="text" class="note-input" data-issue-key="${issue.key}" value="${noteText}" placeholder="Add a note..."></td>
    `;

    return row;
}

// Función para poblar los filtros con opciones únicas
function populateFilters(issues) {
    // Obtener valores únicos
    const types = [...new Set(issues.map(i => i.issueType))].sort();
    const priorities = [...new Set(issues.map(i => i.priority))].sort();
    const statuses = [...new Set(issues.map(i => i.status))].sort();

    // Poblar Type filter
    filterType.innerHTML = '<option value="">All Types</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        filterType.appendChild(option);
    });

    // Poblar Priority filter
    filterPriority.innerHTML = '<option value="">All Priorities</option>';
    priorities.forEach(priority => {
        const option = document.createElement('option');
        option.value = priority;
        option.textContent = priority;
        filterPriority.appendChild(option);
    });

    // Poblar Status filter
    filterStatus.innerHTML = '<option value="">All Statuses</option>';
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        filterStatus.appendChild(option);
    });
}

// Función para ordenar issues por columna
function sortIssuesByColumn(issues, column, direction) {
    return [...issues].sort((a, b) => {
        let comparison = 0;

        switch (column) {
            case 'type':
                comparison = a.issueType.localeCompare(b.issueType);
                break;
            case 'key':
                comparison = a.key.localeCompare(b.key);
                break;
            case 'summary':
                comparison = a.summary.localeCompare(b.summary);
                break;
            case 'priority':
                const priorityOrder = { 'Highest': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Lowest': 5 };
                comparison = (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
                break;
            case 'status':
                comparison = a.status.localeCompare(b.status);
                break;
            case 'created':
                comparison = new Date(a.created) - new Date(b.created);
                break;
            case 'updated':
                comparison = new Date(a.updated) - new Date(b.updated);
                break;
            case 'duedate':
                // Manejar casos donde duedate puede ser null
                const dateA = a.duedate ? new Date(a.duedate) : new Date('9999-12-31');
                const dateB = b.duedate ? new Date(b.duedate) : new Date('9999-12-31');
                comparison = dateA - dateB;
                break;
            case 'scheduled':
                // Manejar casos donde scheduled puede ser null
                const schedA = issueScheduled[a.key] ? new Date(issueScheduled[a.key]) : new Date('9999-12-31');
                const schedB = issueScheduled[b.key] ? new Date(issueScheduled[b.key]) : new Date('9999-12-31');
                comparison = schedA - schedB;
                break;
            default:
                return 0;
        }

        return direction === 'asc' ? comparison : -comparison;
    });
}

// Función para filtrar y ordenar issues
function filterAndSortIssues() {
    let filtered = [...allIssues];

    // Filtrar por Type
    if (filterType.value) {
        filtered = filtered.filter(issue => issue.issueType === filterType.value);
    }

    // Filtrar por Priority
    if (filterPriority.value) {
        filtered = filtered.filter(issue => issue.priority === filterPriority.value);
    }

    // Filtrar por Status
    if (filterStatus.value) {
        filtered = filtered.filter(issue => issue.status === filterStatus.value);
    }

    // Filtrar por Summary (búsqueda de texto)
    if (filterSummary.value.trim()) {
        const searchTerm = filterSummary.value.toLowerCase();
        filtered = filtered.filter(issue =>
            issue.summary.toLowerCase().includes(searchTerm)
        );
    }

    // Ordenar por dropdown select (mantenido para compatibilidad)
    if (sortBy.value) {
        const sortColumn = sortBy.value;
        filtered = sortIssuesByColumn(filtered, sortColumn, 'asc');
    }

    // Aplicar ordenamiento de columna clickeada (tiene prioridad)
    if (currentSortColumn) {
        filtered = sortIssuesByColumn(filtered, currentSortColumn, currentSortDirection);
    }

    // Renderizar la tabla
    renderIssues(filtered);
}

// Función para organizar issues por epic
function organizeByEpic(issues) {
    const epics = [];
    const epicMap = new Map();
    const orphanIssues = [];

    // Separar epics y crear el mapa
    issues.forEach(issue => {
        if (issue.issueType.toLowerCase().includes('epic')) {
            const epicData = {
                epic: issue,
                children: []
            };
            epics.push(epicData);
            epicMap.set(issue.key, epicData);
        }
    });

    // Asignar issues a sus epics
    issues.forEach(issue => {
        if (!issue.issueType.toLowerCase().includes('epic')) {
            // Buscar el epic padre (puede estar en parentKey o epicLink)
            const epicKey = issue.parentKey || issue.epicLink;

            if (epicKey && epicMap.has(epicKey)) {
                epicMap.get(epicKey).children.push(issue);
            } else {
                // Issue sin epic asignado
                orphanIssues.push(issue);
            }
        }
    });

    return { epics, orphanIssues };
}

// Función para renderizar vista de epics
function renderEpicView(issues) {
    issuesTableBody.innerHTML = '';

    if (issues.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="10" style="text-align: center; padding: 40px; color: #5e6c84;">No issues found matching your filters</td>';
        issuesTableBody.appendChild(emptyRow);
        return;
    }

    const { epics, orphanIssues } = organizeByEpic(issues);

    // Renderizar epics con sus hijos
    epics.forEach(epicData => {
        // Renderizar el epic
        const epicRow = createIssueRow(epicData.epic, false);
        issuesTableBody.appendChild(epicRow);

        // Renderizar los hijos del epic
        epicData.children.forEach(child => {
            const childRow = createIssueRow(child, true);
            issuesTableBody.appendChild(childRow);
        });
    });

    // Renderizar issues sin epic en una sección separada
    if (orphanIssues.length > 0) {
        // Agregar una fila separadora
        const separatorRow = document.createElement('tr');
        separatorRow.classList.add('no-epic-section');
        separatorRow.innerHTML = '<td colspan="10" class="no-epic-header">Issues without Epic</td>';
        issuesTableBody.appendChild(separatorRow);

        // Renderizar los issues sin epic
        orphanIssues.forEach(issue => {
            const row = createIssueRow(issue, false);
            issuesTableBody.appendChild(row);
        });
    }
}

// Función para renderizar los issues en la tabla
function renderIssues(issues) {
    if (isEpicViewActive) {
        renderEpicView(issues);
    } else {
        issuesTableBody.innerHTML = '';

        if (issues.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="10" style="text-align: center; padding: 40px; color: #5e6c84;">No issues found matching your filters</td>';
            issuesTableBody.appendChild(emptyRow);
        } else {
            issues.forEach(issue => {
                const row = createIssueRow(issue);
                issuesTableBody.appendChild(row);
            });
        }
    }
}

// Función para actualizar indicadores visuales de ordenamiento
function updateSortIndicators() {
    // Remover todas las clases de ordenamiento previas
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });

    // Agregar la clase correspondiente al header actual
    if (currentSortColumn) {
        const header = document.querySelector(`th[data-sort="${currentSortColumn}"]`);
        if (header) {
            header.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }
}

// Función para manejar click en headers de columnas
function handleColumnHeaderClick(event) {
    const header = event.currentTarget;
    const column = header.getAttribute('data-sort');

    // Si se clickea la misma columna, cambiar dirección
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Nueva columna, empezar con ascendente
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }

    // Limpiar el dropdown de Sort By para evitar confusión
    sortBy.value = '';

    // Actualizar visuales y re-renderizar
    updateSortIndicators();
    filterAndSortIssues();
}

// Función para limpiar filtros
function clearFilters() {
    filterType.value = '';
    filterPriority.value = '';
    filterStatus.value = '';
    filterSummary.value = '';
    sortBy.value = '';
    currentSortColumn = null;
    currentSortDirection = 'asc';
    updateSortIndicators();
    filterAndSortIssues();
}

// Función para toggle vista de epics
function toggleEpicView() {
    isEpicViewActive = !isEpicViewActive;

    const epicToggleBtn = document.getElementById('epicToggleBtn');

    if (isEpicViewActive) {
        epicToggleBtn.textContent = '📋 Show Flat View';
        epicToggleBtn.classList.add('active');
    } else {
        epicToggleBtn.textContent = '🗂️ Organize by Epic';
        epicToggleBtn.classList.remove('active');
    }

    // Re-renderizar con filtros aplicados
    filterAndSortIssues();
}

// Función para cargar notas desde el servidor
async function loadNotes() {
    try {
        const response = await fetch(`${API_URL}/notes`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        issueNotes = data.notes || {};
    } catch (error) {
        console.error('Error loading notes:', error);
        issueNotes = {};
    }
}

// Función para cargar fechas scheduled desde el servidor
async function loadScheduled() {
    try {
        const response = await fetch(`${API_URL}/scheduled`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        issueScheduled = data.scheduled || {};
    } catch (error) {
        console.error('Error loading scheduled dates:', error);
        issueScheduled = {};
    }
}

// Función para guardar notas y scheduled al servidor
async function saveNotes() {
    try {
        const saveBtn = document.getElementById('saveNotesBtn');
        saveBtn.disabled = true;
        saveBtn.textContent = '💾 Saving...';

        // Recolectar todas las notas de los inputs
        const noteInputs = document.querySelectorAll('.note-input');
        noteInputs.forEach(input => {
            const issueKey = input.getAttribute('data-issue-key');
            const noteValue = input.value.trim();
            if (noteValue) {
                issueNotes[issueKey] = noteValue;
            } else {
                // Si la nota está vacía, eliminarla del objeto
                delete issueNotes[issueKey];
            }
        });

        // Recolectar todas las fechas scheduled de los inputs
        const scheduledInputs = document.querySelectorAll('.scheduled-input');
        scheduledInputs.forEach(input => {
            const issueKey = input.getAttribute('data-issue-key');
            const scheduledValue = input.value.trim();
            if (scheduledValue) {
                issueScheduled[issueKey] = scheduledValue;
            } else {
                // Si la fecha está vacía, eliminarla del objeto
                delete issueScheduled[issueKey];
            }
        });

        // Guardar notas
        const notesResponse = await fetch(`${API_URL}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: issueNotes })
        });

        if (!notesResponse.ok) {
            throw new Error(`Error ${notesResponse.status}: ${notesResponse.statusText}`);
        }

        // Guardar fechas scheduled
        const scheduledResponse = await fetch(`${API_URL}/scheduled`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ scheduled: issueScheduled })
        });

        if (!scheduledResponse.ok) {
            throw new Error(`Error ${scheduledResponse.status}: ${scheduledResponse.statusText}`);
        }

        // Mostrar mensaje de éxito temporalmente
        saveBtn.textContent = '✓ Saved!';
        saveBtn.style.background = '#00875a';

        setTimeout(() => {
            saveBtn.textContent = '💾 Save Notes';
            saveBtn.style.background = '';
            saveBtn.disabled = false;
        }, 800);

        // Re-renderizar para actualizar las clases de colores
        filterAndSortIssues();

    } catch (error) {
        console.error('Error saving notes:', error);
        const saveBtn = document.getElementById('saveNotesBtn');
        saveBtn.textContent = '✗ Error';
        saveBtn.style.background = '#de350b';

        setTimeout(() => {
            saveBtn.textContent = '💾 Save Notes';
            saveBtn.style.background = '';
            saveBtn.disabled = false;
        }, 2000);
    }
}

// Función para cargar issues
async function loadIssues() {
    try {
        // Mostrar loading
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        issuesContainer.style.display = 'none';
        refreshBtn.disabled = true;

        // Cargar notas y fechas scheduled primero
        await loadNotes();
        await loadScheduled();

        // Hacer la petición
        const response = await fetch(`${API_URL}/issues`);

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Guardar todos los issues
        allIssues = data.issues;

        // Ocultar loading
        loadingDiv.style.display = 'none';
        refreshBtn.disabled = false;

        // Mostrar issues
        if (allIssues.length === 0) {
            issuesContainer.style.display = 'none';
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = '<p>No tienes issues pendientes</p>';
            document.querySelector('.container').appendChild(emptyState);
        } else {
            issuesContainer.style.display = 'block';
            populateFilters(allIssues);
            renderIssues(allIssues);
        }

    } catch (error) {
        console.error('Error:', error);
        loadingDiv.style.display = 'none';
        refreshBtn.disabled = false;
        errorDiv.style.display = 'block';
        issuesContainer.style.display = 'none';
        errorMessage.textContent = `Error al cargar issues: ${error.message}`;
    }
}

// Event listeners
refreshBtn.addEventListener('click', loadIssues);
filterType.addEventListener('change', filterAndSortIssues);
filterPriority.addEventListener('change', filterAndSortIssues);
filterStatus.addEventListener('change', filterAndSortIssues);
filterSummary.addEventListener('input', filterAndSortIssues);
sortBy.addEventListener('change', filterAndSortIssues);
clearFiltersBtn.addEventListener('click', clearFilters);

// Event listener para el botón de vista de epics
const epicToggleBtn = document.getElementById('epicToggleBtn');
if (epicToggleBtn) {
    epicToggleBtn.addEventListener('click', toggleEpicView);
}

// Event listener para el botón de guardar notas
const saveNotesBtn = document.getElementById('saveNotesBtn');
if (saveNotesBtn) {
    saveNotesBtn.addEventListener('click', saveNotes);
}

// Agregar event listeners a los headers de columnas
document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', handleColumnHeaderClick);
});

// Cargar issues al iniciar
loadIssues();

// Auto-refresh cada 5 minutos
setInterval(loadIssues, 5 * 60 * 1000);
