// gemini.js
const GEMINI_API_KEY = "AIzaSyBZ9drAPxLg4wZalUJSeKqXXMMvAnDWAqY";

async function askGemini() {
    const input = document.getElementById('gemini-prompt');
    const historyDiv = document.getElementById('chat-history');
    const question = input.value;

    if (!question.trim()) return;

    // 1. Renderizar Usuario
    historyDiv.innerHTML += `<div class="msg user-msg"><strong>Tú:</strong> ${question}</div>`;
    input.value = '';
    historyDiv.scrollTop = historyDiv.scrollHeight;

    // 2. Preparar Contexto
    const recentEntries = appData.entries.slice(0, 5).map(e => `- (${new Date(e.id).toLocaleDateString()}): ${e.text}`).join("\n");
    
    const prompt = `
    Eres un asistente personal útil y amigable integrado en una app de diario.
    Contexto reciente del usuario (Sus últimas notas):
    ${recentEntries}
    
    Pregunta del usuario: "${question}"
    
    Responde de forma concisa, empática y en español. Usa formato Markdown (negritas) si es necesario.
    `;

    // 3. Llamada API
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        if(data.error) throw new Error(data.error.message);

        const reply = data.candidates[0].content.parts[0].text;
        
        // Formateo simple de negritas
        const formatted = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        historyDiv.innerHTML += `<div class="msg ai-msg"><i class="fa-solid fa-robot"></i> ${formatted}</div>`;

    } catch (error) {
        console.error(error);
        historyDiv.innerHTML += `<div class="msg ai-msg" style="color:#f38ba8">Error: No pude conectar con la IA.</div>`;
    }

    historyDiv.scrollTop = historyDiv.scrollHeight;
}