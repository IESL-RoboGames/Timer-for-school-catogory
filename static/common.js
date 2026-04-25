
let serverOffset = 0;
let timerInterval = null;
let currentSession = null;

async function syncTime() {
    const start = Date.now();
    try {
        const response = await fetch('/state');
        const data = await response.json();
        const end = Date.now();
        const serverTime = data.serverTime || Date.now(); // Server should ideally send its time
        // Simple offset calculation
        serverOffset = serverTime - (start + end) / 2;
        return data;
    } catch (e) {
        console.error("Sync failed", e);
    }
}

function getServerNow() {
    return Date.now() + serverOffset;
}

function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const deciseconds = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
}

function updateTimerDisplay(startTime, endTime, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (timerInterval) clearInterval(timerInterval);

    if (endTime) {
        element.innerText = formatTime(endTime - startTime);
        return;
    }

    timerInterval = setInterval(() => {
        const now = getServerNow();
        const elapsed = now - startTime;
        element.innerText = formatTime(elapsed);
    }, 100);
}

function connectWebSocket(onMessage) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessage(data);
    };

    ws.onclose = () => {
        console.log("WS closed, reconnecting...");
        setTimeout(() => connectWebSocket(onMessage), 2000);
    };

    return ws;
}
