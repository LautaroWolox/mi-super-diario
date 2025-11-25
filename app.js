// app.js - v4.0 Ultimate

let appData = { 
    entries: {} // Estructura nueva: { "2025-11-25": { text: "...", tasks: [] } }
};
const DB_FILE_NAME = 'neurodiary_v4.json'; // Cambiamos nombre para no mezclar con la version vieja
let fileId = null; 
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDateStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

// --- Navegación ---
function showCalendarView() {
    document.getElementById('main-view').classList.remove('hidden');
    document.getElementById('chat-view').classList.add('hidden');
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
    document.querySelectorAll('.nav-btn')[1].classList.remove('active');
}
function showChatView() {
    document.getElementById('main-view').classList.add('hidden');
    document.getElementById('chat-view').classList.remove('hidden');
    document.querySelectorAll('.nav-btn')[0].classList.remove('active');
    document.querySelectorAll('.nav-btn')[1].classList.add('active');
}

// --- Google Drive ---
async function loadDataFromDrive() {
    try {
        const q = `name = '${DB_FILE_NAME}' and trashed = false`;
        if (!gapi.client.drive) return;
        const response = await gapi.client.drive.files.list({ 'q': q, 'fields': 'files(id, name)', 'spaces': 'drive' });
        
        if (response.result.files.length > 0) {
            fileId = response.result.files[0].id;
            const fileContent = await gapi.client.drive.files.get({ fileId: fileId, alt: 'media' });
            appData = fileContent.result || { entries: {} };
        }
        renderCalendar();
        loadDayContent(selectedDateStr);
    } catch (err) {
        console.error("Offline/Error:", err);
        const local = localStorage.getItem('neurodiary_v4_local');
        if(local) appData = JSON.parse(local);
        renderCalendar();
        loadDayContent(selectedDateStr);
    }
}

async function saveToDrive() {
    localStorage.setItem('neurodiary_v4_local', JSON.stringify(appData));
    const content = JSON.stringify(appData);
    try {
        if (fileId) {
            await gapi.client.request({ path: '/upload/drive/v3/files/' + fileId, method: 'PATCH', params: { uploadType: 'media' }, body: content });
        } else {
            const metadata = { name: DB_FILE_NAME, mimeType: 'application/json' };
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            const body = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + content + close_delim;
            const request = gapi.client.request({ 'path': '/upload/drive/v3/files', 'method': 'POST', 'params': {'uploadType': 'multipart'}, 'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' }, 'body': body });
            const response = await request;
            fileId = response.result.id;
        }
    } catch (e) { console.error("Error guardando nube", e); }
}

// --- Lógica del Calendario ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const display = document.getElementById('month-display');
    grid.innerHTML = '';

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayIndex = firstDay.getDay();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    display.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Espacios vacíos
    for (let i = 0; i < startDayIndex; i++) {
        grid.appendChild(document.createElement('div'));
    }

    // Días
    for (let d = 1; d <= daysInMonth; d++) {
        const div = document.createElement('div');
        div.className = 'day';
        div.textContent = d;

        // Formato YYYY-MM-DD local manual para evitar error de zona horaria
        const dateKey = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        
        // Marcar Hoy
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        if(dateKey === todayKey) div.classList.add('today');

        // Marcar Seleccionado
        if(dateKey === selectedDateStr) div.classList.add('selected');

        // Marcar si tiene datos (Punto)
        if(appData.entries[dateKey] && (appData.entries[dateKey].text || appData.entries[dateKey].tasks.length > 0)) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            div.appendChild(dot);
        }

        div.onclick = () => {
            selectedDateStr = dateKey;
            renderCalendar(); // Actualizar selección visual
            loadDayContent(dateKey); // Cargar datos derecha
        };

        grid.appendChild(div);
    }
}

function changeMonth(step) {
    currentMonth += step;
    if(currentMonth > 11) { currentMonth = 0; currentYear++; }
    if(currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

// --- Gestión de Contenido del Día ---

function loadDayContent(dateKey) {
    // Título
    const [y, m, d] = dateKey.split('-');
    document.getElementById('selected-date-title').textContent = `${d}/${m}/${y}`;
    
    // Recuperar datos o iniciar vacío
    const dayData = appData.entries[dateKey] || { text: "", tasks: [] };

    // 1. Cargar Diario
    document.getElementById('diary-input').value = dayData.text || "";

    // 2. Cargar Tareas
    renderTasks(dayData.tasks || []);
    
    // Ocultar feedback IA viejo
    document.getElementById('ai-feedback').style.display = 'none';
}

function saveData() {
    const text = document.getElementById('diary-input').value;
    // Las tareas ya se actualizan en memoria al hacer click, solo las recuperamos
    const currentTasks = appData.entries[selectedDateStr] ? appData.entries[selectedDateStr].tasks : [];

    // Guardar en el objeto global
    appData.entries[selectedDateStr] = {
        text: text,
        tasks: currentTasks
    };

    saveToDrive();
    renderCalendar(); // Para que aparezca el punto si es nuevo
    
    // Feedback visual pequeño
    const btn = document.querySelector('.save-btn');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Guardado';
    setTimeout(() => btn.innerHTML = original, 1500);
}

// --- Gestión de Tareas ---

function addTask() {
    const input = document.getElementById('new-task-input');
    const val = input.value.trim();
    if(!val) return;

    if(!appData.entries[selectedDateStr]) appData.entries[selectedDateStr] = { text:"", tasks:[] };
    
    appData.entries[selectedDateStr].tasks.push({ desc: val, done: false });
    input.value = '';
    
    saveData(); // Guardar cambios
    loadDayContent(selectedDateStr); // Recargar lista
}

function toggleTask(index) {
    const tasks = appData.entries[selectedDateStr].tasks;
    tasks[index].done = !tasks[index].done;
    saveData();
    loadDayContent(selectedDateStr);
}

function deleteTask(index) {
    appData.entries[selectedDateStr].tasks.splice(index, 1);
    saveData();
    loadDayContent(selectedDateStr);
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';
    
    tasks.forEach((t, index) => {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <input type="checkbox" class="task-check" ${t.done ? 'checked' : ''} onchange="toggleTask(${index})">
            <span class="task-text ${t.done ? 'done' : ''}">${t.desc}</span>
            <button onclick="deleteTask(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        `;
        list.appendChild(item);
    });
}