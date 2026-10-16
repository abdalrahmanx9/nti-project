// Client-side telemetry updater and interactive controls

const elements = {
    overallStatus: document.getElementById('overall-status'),
    uptimeDisplay: document.getElementById('uptime-display'),
    nodeDisplay: document.getElementById('node-display'),
    podDisplay: document.getElementById('pod-display'),
    k8sPodName: document.getElementById('k8s-pod-name'),
    k8sPodIp: document.getElementById('k8s-pod-ip'),
    k8sNamespace: document.getElementById('k8s-namespace'),
    dbStateBadge: document.getElementById('db-state-badge'),
    dbLatency: document.getElementById('db-latency'),
    dbHost: document.getElementById('db-host'),
    dbName: document.getElementById('db-name'),
    btnTestDb: document.getElementById('btn-test-db'),
    spinnerDb: document.getElementById('spinner-db'),
    dbFeedback: document.getElementById('db-feedback'),
    cpuText: document.getElementById('cpu-text'),
    cpuFill: document.getElementById('cpu-fill'),
    memText: document.getElementById('mem-text'),
    memFill: document.getElementById('mem-fill'),
    memSub: document.getElementById('mem-sub'),
    alarmStatusPill: document.getElementById('alarm-status-pill'),
    btnStressTest: document.getElementById('btn-stress-test'),
    spinnerStress: document.getElementById('spinner-stress'),
    stressFeedback: document.getElementById('stress-feedback'),
    eventLogContainer: document.getElementById('event-log-container'),
    btnClearLogs: document.getElementById('btn-clear-logs'),
};

function appendLog(message, type = 'INFO') {
    const timeStr = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-ts">[${timeStr}] [${type}]</span> ${message}`;
    elements.eventLogContainer.appendChild(line);
    elements.eventLogContainer.scrollTop = elements.eventLogContainer.scrollHeight;
}

// Fetch live telemetry from /api/status
async function fetchTelemetry() {
    try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Uptime & Pod Metadata
        elements.uptimeDisplay.textContent = data.uptime_formatted;
        elements.nodeDisplay.textContent = data.pod.node;
        elements.podDisplay.textContent = data.pod.name;
        elements.k8sPodName.textContent = data.pod.name;
        elements.k8sPodIp.textContent = data.pod.ip;
        elements.k8sNamespace.textContent = data.pod.namespace;

        // DB Status
        if (data.database.healthy) {
            elements.dbStateBadge.innerHTML = '<span class="badge badge-success">CONNECTED</span>';
            elements.overallStatus.innerHTML = '<span class="status-indicator status-ok"></span> Optimal';
        } else {
            elements.dbStateBadge.innerHTML = '<span class="badge badge-warning">OFFLINE</span>';
            elements.overallStatus.innerHTML = '<span class="status-indicator status-warn"></span> Degraded';
        }
        elements.dbLatency.textContent = `${data.database.latency_ms} ms`;
        elements.dbHost.textContent = data.database.host;
        elements.dbName.textContent = data.database.name;

        // CPU & Memory
        const cpu = data.system.cpu_percent;
        const mem = data.system.memory_percent;

        elements.cpuText.textContent = `${cpu}%`;
        elements.cpuFill.style.width = `${Math.min(cpu, 100)}%`;
        if (cpu >= 80) {
            elements.cpuFill.classList.add('fill-warn');
        } else {
            elements.cpuFill.classList.remove('fill-warn');
        }

        elements.memText.textContent = `${mem}%`;
        elements.memFill.style.width = `${Math.min(mem, 100)}%`;
        elements.memSub.textContent = `${data.system.memory_used_mb} MB / ${data.system.memory_total_mb} MB`;
        if (mem >= 80) {
            elements.memFill.classList.add('fill-warn');
        } else {
            elements.memFill.classList.remove('fill-warn');
        }

        // 80% Alarm Indicator
        if (cpu >= 80 || mem >= 80) {
            elements.alarmStatusPill.className = 'pill-firing';
            elements.alarmStatusPill.textContent = 'ALARM FIRING (>80%)';
        } else {
            elements.alarmStatusPill.className = 'pill-ok';
            elements.alarmStatusPill.textContent = 'Normal';
        }

    } catch (err) {
        console.warn('Failed to fetch telemetry:', err);
    }
}

// Test DB Query handler
elements.btnTestDb.addEventListener('click', async () => {
    elements.spinnerDb.classList.remove('hidden');
    elements.btnTestDb.disabled = true;
    elements.dbFeedback.className = 'feedback-msg hidden';

    try {
        const res = await fetch('/api/db-query', { method: 'POST' });
        const json = await res.json();
        elements.dbFeedback.classList.remove('hidden');
        if (json.success) {
            elements.dbFeedback.className = 'feedback-msg success';
            elements.dbFeedback.textContent = `Recorded successfully. Total DB visits: ${json.total_visits} (Query took ${json.query_latency_ms} ms)`;
            appendLog(`PostgreSQL Write/Read success (Total: ${json.total_visits}, Latency: ${json.query_latency_ms}ms)`, 'DB');
        } else {
            elements.dbFeedback.className = 'feedback-msg error';
            elements.dbFeedback.textContent = json.message;
            appendLog(`DB operation failed: ${json.message}`, 'WARN');
        }
    } catch (e) {
        elements.dbFeedback.className = 'feedback-msg error';
        elements.dbFeedback.textContent = `Request error: ${e.message}`;
        appendLog(`Network error contacting /api/db-query: ${e.message}`, 'ERROR');
    } finally {
        elements.spinnerDb.classList.add('hidden');
        elements.btnTestDb.disabled = false;
        fetchTelemetry();
    }
});

// Simulate Load handler
elements.btnStressTest.addEventListener('click', async () => {
    elements.spinnerStress.classList.remove('hidden');
    elements.btnStressTest.disabled = true;
    elements.stressFeedback.className = 'feedback-msg hidden';

    try {
        const res = await fetch('/api/simulate-load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration_seconds: 15 })
        });
        const json = await res.json();
        elements.stressFeedback.className = 'feedback-msg success';
        elements.stressFeedback.textContent = json.message;
        elements.stressFeedback.classList.remove('hidden');
        appendLog(`Simulated CPU & RAM load triggered for 15s. Monitoring thresholds...`, 'STRESS');

        // Countdown button state
        let timeLeft = 15;
        const interval = setInterval(() => {
            timeLeft--;
            elements.btnStressTest.textContent = `Simulating Load (${timeLeft}s remaining)...`;
            if (timeLeft <= 0) {
                clearInterval(interval);
                elements.btnStressTest.textContent = 'Simulate Load (>80% Stress)';
                elements.btnStressTest.disabled = false;
                elements.spinnerStress.classList.add('hidden');
                appendLog(`Simulated load window completed. Resources returning to baseline.`, 'INFO');
            }
        }, 1000);

    } catch (e) {
        elements.stressFeedback.className = 'feedback-msg error';
        elements.stressFeedback.textContent = `Failed to trigger load: ${e.message}`;
        elements.btnStressTest.disabled = false;
        elements.spinnerStress.classList.add('hidden');
    }
});

// Clear terminal logs
elements.btnClearLogs.addEventListener('click', () => {
    elements.eventLogContainer.innerHTML = '';
    appendLog('Event stream cleared.', 'SYS');
});

// Start periodic polling every 3 seconds
setInterval(fetchTelemetry, 3000);
fetchTelemetry();
