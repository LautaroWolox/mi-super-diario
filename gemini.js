const GEMINI_API_KEY = "AIzaSyBZ9drAPxLg4wZalUJSeKqXXMMvAnDWAqY";

// Función auxiliar para llamar a la API (Modelo corregido a gemini-pro)
async function callGeminiSimple(promptText) {
    // CAMBIO IMPORTANTE: Usamos 'gemini-pro' que es más estable si 'flash' falla
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    if (!response.ok) {
        throw new Error("Error en la respuesta del servidor IA");
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// 1. Chat General
async function askGemini() {
    const input = document.getElementById('gemini-prompt');
    const historyDiv = document.getElementById('chat-history');
    if (!input.value.trim()) return;

    // Mensaje Usuario
    historyDiv.innerHTML += `<div style="background:#6366f1; color:white; padding:12px; border-radius:12px 12px 0 12px; margin:10px 0; align-self:flex-end; max-width:80%;">${input.value}</div>`;
    const userQ = input.value;
    input.value = '';
    
    // Scroll abajo
    historyDiv.scrollTop = historyDiv.scrollHeight;

    try {
        const reply = await callGeminiSimple(userQ);
        // Mensaje IA
        historyDiv.innerHTML += `<div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:12px 12px 12px 0; margin:10px 0; align-self:flex-start; max-width:80%; border:1px solid rgba(255,255,255,0.1);">${formatText(reply)}</div>`;
        historyDiv.scrollTop = historyDiv.scrollHeight;
    } catch (e) {
        console.error(e);
        historyDiv.innerHTML += `<div style="color:#ef4444; font-size:0.8rem; margin-top:5px;">⚠️ La IA está durmiendo. Intenta de nuevo.</div>`;
    }
}

// 2. Analizar Emociones
async function analyzeEmotion() {
    const text = document.getElementById('diary-input').value;
    const feedbackBox = document.getElementById('ai-feedback');
    
    if(!text) return alert("Escribe algo en el diario primero.");
    
    feedbackBox.style.display = 'block';
    feedbackBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando con tu mente...';

    const prompt = `Actúa como un psicólogo empático. Analiza este texto de diario: "${text}". 
    Dame una respuesta con este formato exacto:
    1. Un emoji que represente la emoción.
    2. Una frase breve de validación ("Es normal sentirse así porque...").
    3. Un consejo accionable muy pequeño.`;

    try {
        const reply = await callGeminiSimple(prompt);
        feedbackBox.innerHTML = formatText(reply);
    } catch (e) {
        console.error(e);
        feedbackBox.innerHTML = "No pude conectar con Gemini. Verifica tu conexión.";
    }
}

// 3. Imagen a Texto
async function handleImageUpload() {
    const fileInput = document.getElementById('img-upload');
    const textArea = document.getElementById('diary-input');
    
    if (fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    textArea.placeholder = "Escaneando imagen...";
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async function() {
        const base64Image = reader.result.split(',')[1];
        
        try {
            // Nota: gemini-pro no lee imagenes, para imágenes necesitamos gemini-1.5-flash
            // Intentaremos flash SOLO para imagenes, si falla avisamos.
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            
            const payload = {
                contents: [{
                    parts: [
                        { text: "Transcribe el texto de esta imagen:" },
                        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                    ]
                }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if(data.error) throw new Error(data.error.message);

            const text = data.candidates[0].content.parts[0].text;
            textArea.value += (textArea.value ? "\n" : "") + text;
            textArea.placeholder = "Texto extraído.";
            
        } catch (e) {
            console.error(e);
            alert("Para leer imágenes necesitas activar 'Gemini Flash' en tu cuenta de Google AI Studio, o la imagen es muy pesada.");
            textArea.placeholder = "Error al leer imagen.";
        }
    };
}

// Función pequeña para poner negritas
function formatText(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}