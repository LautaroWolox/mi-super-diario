// auth.js

// TUS CREDENCIALES (No las compartas)
const CLIENT_ID = "147115229740-spjv0c4vcjp0g9itabtqnvtsc16ne2bs.apps.googleusercontent.com";
const API_KEY = "AlzaSyAQgG4cAXvMGKCNXCGpflwkvckvZE1iEls"; 

// Configuraciones
const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"
];
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events";

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Inicialización de GAPI
function gapiLoaded() {
    gapi.load('client', async () => {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        checkAuth();
    });
}

// Inicialización de GIS (Identity Services)
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Callback dinámico
    });
    gisInited = true;
    checkAuth();
}

// Verificar sesión
function checkAuth() {
    if (gapiInited && gisInited) {
        const token = localStorage.getItem('g_token');
        if (token) {
            gapi.client.setToken({ access_token: token });
            showApp();
        }
    }
}

// Manejo del Login
const loginBtn = document.getElementById('btn-login');
if(loginBtn){
    loginBtn.onclick = () => {
        tokenClient.callback = async (resp) => {
            if (resp.error) {
                console.error(resp);
                return;
            }
            localStorage.setItem('g_token', resp.access_token);
            showApp();
        };
        
        // Refrescar token o pedir nuevo
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    };
}

// Manejo del Logout
const logoutBtn = document.getElementById('btn-logout');
if(logoutBtn){
    logoutBtn.onclick = () => {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            localStorage.removeItem('g_token');
            localStorage.removeItem('neurodiary_backup');
            location.reload();
        }
    };
}

// Transición de Login a App
function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    
    // Iniciar carga de datos
    if(typeof loadDataFromDrive === 'function') {
        loadDataFromDrive(); 
    }
}