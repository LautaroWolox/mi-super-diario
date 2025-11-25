// app.js

let appData = {
    entries: [],
    nodes: []
};

const DB_FILE_NAME = 'neurodiary_db.json';
let fileId = null; 

// --- NAVEGACIÓN ---
function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    
    // Resetear clases active
    document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
}

// --- GOOGLE DRIVE (Persistencia) ---

async function loadDataFromDrive() {
    console.log("Sincronizando con Drive...");
    try {
        const q = `name = '${DB_FILE_NAME}' and trashed = false`;
        const response = await gapi.client.drive.files.list({
            'q': q,
            'fields': 'files(id, name)',
            'spaces': 'drive'
        });

        const files = response.result.files;

        if (files && files.length > 0) {
            fileId = files[0].id;
            const fileContent = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            appData = fileContent.result;
            console.log("Datos descargados correctamente.");
        } else {
            console.log("Usuario nuevo, se creará el archivo al guardar.");
        }
        renderEntries();
    } catch (err) {
        console.error("Error Drive:", err);
        const local = localStorage.getItem('neurodiary_backup');
        if(local) {
            appData = JSON.parse(local);
            renderEntries();
            alert("Sin conexión: Mostrando datos locales.");
        }
    }
}

async function saveToDrive() {
    // 1. Local Backup
    localStorage.setItem('neurodiary_backup', JSON.stringify(appData));
    
    const content = JSON.stringify(appData);
    
    try {
        if (fileId) {
            // Actualizar
            await gapi.client.request({
                path: '/upload/drive/v3/files/' + fileId,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: content
            });
        } else {
            // Crear Nuevo
            const metadata = { name: DB_FILE_NAME, mimeType: 'application/json' };
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const multipartRequestBody =
                delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
                delimiter + 'Content-Type: application/json\r\n\r\n' + content +
                close_delim;

            const request = gapi.client.request({
                'path': '/upload/drive/v3/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': { 'Content-Type': 'multipart/related; boundary="' + boundary + '"' },
                'body': multipartRequestBody
            });
            const response = await request;
            fileId = response.result.id;
        }
        console.log("Sincronizado con la nube.");
    } catch (e) {
        console.error("Error guardando:", e);
    }
}

// --- DIARIO ---

async function saveEntry() {
    const textInput = document.getElementById('diary-input');
    const dateInput = document.getElementById('alert-time');
    const text = textInput.value;
    const date = dateInput.value;

    if (!text) return;

    const newEntry = { 
        id: Date.now(), 
        text: text, 
        alertDate: date || null 
    };

    appData.entries.unshift(newEntry);

    if (date) {
        await createCalendarEvent(text, date);
    }

    saveToDrive();
    renderEntries();
    textInput.value = '';
    dateInput.value = '';
}

function renderEntries() {
    const list = document.getElementById('entries-list');
    list.innerHTML = '';

    appData.entries.forEach(entry => {
        const dateObj = new Date(entry.id);
        const fecha = dateObj.toLocaleDateString();
        const hora = dateObj.toLocaleTimeString().slice(0,5);
        
        let bell = entry.alertDate ? `<span class="alert-badge"><i class="fa-solid fa-bell"></i> Programado</span>` : '';

        const div = document.createElement('div');
        div.className = 'entry-card';
        div.innerHTML = `
            <div class="entry-meta">
                <span>${fecha} - ${hora}</span>
                ${bell}
            </div>
            <div class="entry-text">${entry.text}</div>
        `;
        list.appendChild(div);
    });
}

// --- CALENDARIO (Alertas) ---

async function createCalendarEvent(text, isoDate) {
    const startTime = new Date(isoDate);
    const endTime = new Date(startTime.getTime() + 30 * 60000);

    const event = {
        'summary': '🔔 NeuroDiary: Tarea Pendiente',
        'description': text,
        'start': { 'dateTime': startTime.toISOString(), 'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone },
        'end': { 'dateTime': endTime.toISOString(), 'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone },
        'reminders': {
            'useDefault': false,
            'overrides': [
                {'method': 'email', 'minutes': 60},
                {'method': 'popup', 'minutes': 10}
            ]
        }
    };

    try {
        await gapi.client.calendar.events.insert({ 'calendarId': 'primary', 'resource': event });
        alert('¡Alerta creada! Recibirás un correo y una notificación.');
    } catch (e) {
        console.error("Error Calendario:", e);
        alert("Error al conectar con el calendario. Revisa la consola.");
    }
}