// Client-side telemetry updater, real-time sparkline chart, and interactive multi-pod dispatcher

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
    dbTotalCount: document.getElementById('db-total-count'),
    dbAuditTbody: document.getElementById('db-audit-tbody'),
    cpuText: document.getElementById('cpu-text'),
    cpuFill: document.getElementById('cpu-fill'),
    cpuHero: document.getElementById('cpu-hero'),
    memText: document.getElementById('mem-text'),
    memFill: document.getElementById('mem-fill'),
    memHero: document.getElementById('ram-hero'),
    memSub: document.getElementById('mem-sub'),
    alarmStatusPill: document.getElementById('alarm-status-pill'),
    btnStress15: document.getElementById('btn-stress-15'),
    btnStress45: document.getElementById('btn-stress-45'),
    btnStressStop: document.getElementById('btn-stress-stop'),
    stressFeedback: document.getElementById('stress-feedback'),
    eventLogContainer: document.getElementById('event-log-container'),
    btnClearLogs: document.getElementById('btn-clear-logs'),
    btnDispatchTest: document.getElementById('btn-dispatch-test'),
    spinnerDispatch: document.getElementById('spinner-dispatch'),
    trafficResultsContainer: document.getElementById('traffic-results-container'),
    barPodA: document.getElementById('bar-pod-a'),
    barPodB: document.getElementById('bar-pod-b'),
    labelPodA: document.getElementById('label-pod-a'),
    labelPodB: document.getElementById('label-pod-b'),
    telemetryCanvas: document.getElementById('telemetry-chart'),
    btnOpenTopology: document.getElementById('btn-open-topology'),
    btnCloseTopology: document.getElementById('btn-close-topology'),
    topologyModal: document.getElementById('topology-modal'),
};

// ponytail: initialize from server-rendered DOM so we know the session pod immediately
const sessionServingPod = elements.podDisplay ? elements.podDisplay.textContent.trim() : null;
let previousPodName = sessionServingPod;

function getPodDeploymentHash(name) {
    if (!name) return '';
    const parts = name.split('-');
    return parts.length >= 3 ? parts[parts.length - 2] : name;
}

const historyPoints = [];
const MAX_HISTORY = 20;

function appendLog(message, type = 'INFO') {
    const timeStr = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-ts">[${timeStr}] [${type}]</span> ${message}`;
    elements.eventLogContainer.appendChild(line);
    elements.eventLogContainer.scrollTop = elements.eventLogContainer.scrollHeight;
}

// Draw real-time sparkline chart on HTML5 canvas
function drawTelemetryChart() {
    const canvas = elements.telemetryCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= height; y += height / 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Draw 80% Alarm Threshold line
    const y80 = height * (1 - 0.80);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y80);
    ctx.lineTo(width, y80);
    ctx.stroke();
    ctx.setLineDash([]);

    if (historyPoints.length < 2) return;

    const stepX = width / (MAX_HISTORY - 1);

    // Helper to draw a line series
    function drawSeries(key, strokeColor, fillColor) {
        ctx.beginPath();
        historyPoints.forEach((pt, idx) => {
            const x = idx * stepX;
            const y = height * (1 - Math.min(pt[key], 100) / 100);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Fill area under curve
        ctx.lineTo((historyPoints.length - 1) * stepX, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
    }

    drawSeries('mem', '#22d3ee', 'rgba(34, 211, 238, 0.12)');
    drawSeries('cpu', '#a78bfa', 'rgba(167, 139, 250, 0.15)');
}

// Render audit records in the database table
function renderAuditTable(records) {
    if (!elements.dbAuditTbody || !records || records.length === 0) return;
    elements.dbAuditTbody.innerHTML = records.map(r => `
        <tr>
            <td class="mono font-bold text-cyan">#${r.id}</td>
            <td class="mono">${r.timestamp}</td>
            <td class="mono"><span class="badge-mini">${r.pod_name}</span></td>
            <td class="mono">${r.client_ip}</td>
        </tr>
    `).join('');
}

// Fetch live telemetry from /api/status
async function fetchTelemetry() {
    try {
        const response = await fetch('/api/status?t=' + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Update live round-robin routing target badge
        const liveTargetBadge = document.getElementById('live-target-badge');
        if (liveTargetBadge && data.pod && data.pod.name) {
            const shortId = data.pod.name.split('-').slice(-1)[0] || data.pod.name;
            liveTargetBadge.textContent = shortId;
        }

        // Check if traffic routed to a new pod during background polling
        const currentHash = getPodDeploymentHash(data.pod ? data.pod.name : '');
        const sessionHash = getPodDeploymentHash(sessionServingPod);

        // Only swap the session serving pod if an actual new deployment rollout occurred
        if (sessionHash && currentHash && currentHash !== sessionHash) {
            elements.podDisplay.textContent = data.pod.name;
            elements.k8sPodName.textContent = data.pod.name;
            elements.nodeDisplay.textContent = data.pod.node;
            elements.k8sPodIp.textContent = data.pod.ip;
            const nodeHostElem = document.getElementById('k8s-node-host');
            if (nodeHostElem) nodeHostElem.textContent = data.pod.node;
            const matrixPodElem = document.getElementById('matrix-pod-name');
            if (matrixPodElem) matrixPodElem.textContent = data.pod.name;
            if (previousPodName !== data.pod.name) {
                appendLog(`New deployment rollout detected: <strong>${data.pod.name}</strong> on node ${data.pod.node}`, 'DEPLOY');
            }
        } else if (previousPodName && previousPodName !== data.pod.name) {
            // Live background polling routed to alternate replica (demonstrating multi-pod round-robin)
            appendLog(`Live API check routed to replica: <strong>${data.pod.name}</strong> on node ${data.pod.node}`, 'ROUTER');
        }
        previousPodName = data.pod.name;

        // Uptime & Host Metadata
        elements.uptimeDisplay.textContent = data.uptime_formatted;
        elements.k8sNamespace.textContent = data.pod.namespace;
        const matrixDbElem = document.getElementById('matrix-db-host');
        if (matrixDbElem) matrixDbElem.textContent = data.database.host;

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

        if (data.database.recent_visits && data.database.recent_visits.length > 0) {
            renderAuditTable(data.database.recent_visits);
        }

        // CPU & Memory Telemetry (hero tiles + gauge rings)
        const cpuVal = Math.round(data.system.cpu_percent);
        const memVal = Math.round(data.system.memory_percent);
        const GAUGE_C = 2 * Math.PI * 34;
        const setGauge = (circle, pct) => {
            circle.style.strokeDashoffset = (GAUGE_C * (1 - Math.min(pct, 100) / 100)).toFixed(1);
        };

        elements.cpuText.textContent = `${cpuVal}%`;
        elements.memText.textContent = `${memVal}%`;
        elements.cpuHero.textContent = `${cpuVal}%`;
        elements.memHero.textContent = `${memVal}%`;
        setGauge(elements.cpuFill, cpuVal);
        setGauge(elements.memFill, memVal);
        elements.memSub.textContent = `${data.system.memory_used_mb} / ${data.system.memory_total_mb} MB`;

        // Update Alarm Pill
        if (cpuVal >= 80 || memVal >= 80) {
            elements.alarmStatusPill.className = 'pill-firing';
            elements.alarmStatusPill.textContent = 'ALARM TRIGGERED (>80%)';
            elements.cpuFill.classList.add('fill-danger');
            elements.memFill.classList.add('fill-danger');
        } else {
            elements.alarmStatusPill.className = 'pill-ok';
            elements.alarmStatusPill.textContent = 'Normal (Below 80%)';
            elements.cpuFill.classList.remove('fill-danger');
            elements.memFill.classList.remove('fill-danger');
        }

        // Record point for sparkline chart
        historyPoints.push({ cpu: cpuVal, mem: memVal });
        if (historyPoints.length > MAX_HISTORY) historyPoints.shift();
        drawTelemetryChart();

    } catch (e) {
        elements.overallStatus.innerHTML = '<span class="status-indicator status-warn"></span> Unreachable';
        appendLog(`Telemetry poll failed: ${e.message}`, 'WARN');
    }
}

// 1. Dispatch 10 Parallel Requests to demonstrate Load Balancing across pods
elements.btnDispatchTest.addEventListener('click', async () => {
    elements.btnDispatchTest.disabled = true;
    elements.spinnerDispatch.classList.remove('hidden');
    elements.trafficResultsContainer.classList.add('hidden');
    appendLog('Dispatching 10 parallel asynchronous requests to demonstrate multi-pod load balancing...', 'TRAFFIC');

    try {
        const promises = Array.from({ length: 10 }, (_, i) => 
            fetch('/api/status?burst=' + i + '_' + Date.now()).then(r => r.json())
        );

        const results = await Promise.all(promises);
        const counts = {};
        results.forEach(res => {
            const pod = res.pod.name;
            counts[pod] = (counts[pod] || 0) + 1;
        });

        const pods = Object.keys(counts);
        elements.trafficResultsContainer.classList.remove('hidden');

        if (pods.length >= 2) {
            const countA = counts[pods[0]];
            const countB = counts[pods[1]];
            const pctA = Math.round((countA / 10) * 100);
            const pctB = Math.round((countB / 10) * 100);

            elements.barPodA.style.width = `${pctA}%`;
            elements.barPodB.style.width = `${pctB}%`;
            elements.labelPodA.innerHTML = `<strong>${pods[0].split('-').slice(-2).join('-')}</strong>: ${countA} reqs (${pctA}%)`;
            elements.labelPodB.innerHTML = `<strong>${pods[1].split('-').slice(-2).join('-')}</strong>: ${countB} reqs (${pctB}%)`;
            appendLog(`Load balancing active: ${pods[0]} handled ${countA} reqs, ${pods[1]} handled ${countB} reqs.`, 'SUCCESS');
        } else {
            const singlePod = pods[0] || 'Unknown';
            elements.barPodA.style.width = '100%';
            elements.barPodB.style.width = '0%';
            elements.labelPodA.textContent = `${singlePod}: 10 reqs (100%)`;
            elements.labelPodB.textContent = '';
            appendLog(`All requests answered by ${singlePod} (active socket pool).`, 'INFO');
        }
    } catch (e) {
        appendLog(`Traffic dispatch error: ${e.message}`, 'ERROR');
    } finally {
        elements.btnDispatchTest.disabled = false;
        elements.spinnerDispatch.classList.add('hidden');
    }
});

// 2. Write Audit Record to PostgreSQL
elements.btnTestDb.addEventListener('click', async () => {
    elements.btnTestDb.disabled = true;
    elements.spinnerDb.classList.remove('hidden');
    elements.dbFeedback.className = 'feedback-msg hidden';

    try {
        const res = await fetch('/api/db-query', { method: 'POST' });
        const result = await res.json();

        if (result.success) {
            elements.dbFeedback.className = 'feedback-msg success';
            elements.dbFeedback.textContent = `Transaction successful! Total visits: ${result.total_visits} (${result.query_latency_ms}ms) from ${result.origin_pod}`;
            elements.dbTotalCount.textContent = `${result.total_visits} Records Synced`;
            if (result.recent_visits) {
                renderAuditTable(result.recent_visits);
            }
            appendLog(`PostgreSQL Write: Inserted record #${result.total_visits} via pod ${result.origin_pod} in ${result.query_latency_ms}ms`, 'DATABASE');
        } else {
            elements.dbFeedback.className = 'feedback-msg error';
            elements.dbFeedback.textContent = result.message;
            appendLog(`Database Write Error: ${result.message}`, 'ERROR');
        }
    } catch (e) {
        elements.dbFeedback.className = 'feedback-msg error';
        elements.dbFeedback.textContent = `Request failed: ${e.message}`;
    } finally {
        elements.btnTestDb.disabled = false;
        elements.spinnerDb.classList.add('hidden');
    }
});

// 3. Simulated Load Testing Handlers
let stressTimer = null;

async function triggerLoadTest(durationSec) {
    elements.btnStress15.disabled = true;
    elements.btnStress45.disabled = true;
    elements.btnStressStop.classList.remove('hidden');
    elements.stressFeedback.className = 'feedback-msg hidden';

    appendLog(`Simulated CPU & RAM load test started for ${durationSec}s. Target: >80% to test HPA scaling.`, 'STRESS');

    try {
        const res = await fetch('/api/simulate-load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration_seconds: durationSec })
        });
        const data = await res.json();
        elements.stressFeedback.className = 'feedback-msg info';
        elements.stressFeedback.textContent = data.message;

        elements.alarmStatusPill.className = 'pill-firing';
        elements.alarmStatusPill.textContent = 'ALARM TRIGGERED (>80%)';

        let timeLeft = durationSec;
        clearInterval(stressTimer);
        stressTimer = setInterval(() => {
            timeLeft--;
            elements.stressFeedback.textContent = `🔥 Stress Active: ${timeLeft}s remaining. Monitoring metrics...`;
            if (timeLeft <= 0) {
                stopStressUI();
                appendLog('Simulated load test window concluded. Stabilization cooldown active.', 'STRESS');
            }
        }, 1000);
    } catch (e) {
        elements.stressFeedback.className = 'feedback-msg error';
        elements.stressFeedback.textContent = `Failed: ${e.message}`;
        stopStressUI();
    }
}

function stopStressUI() {
    clearInterval(stressTimer);
    elements.btnStress15.disabled = false;
    elements.btnStress45.disabled = false;
    elements.btnStressStop.classList.add('hidden');
}

elements.btnStress15.addEventListener('click', () => triggerLoadTest(15));
elements.btnStress45.addEventListener('click', () => triggerLoadTest(45));

elements.btnStressStop.addEventListener('click', async () => {
    try {
        await fetch('/api/stop-load', { method: 'POST' });
        appendLog('Emergency stop received: Simulated load test halted immediately.', 'STRESS');
        elements.stressFeedback.className = 'feedback-msg success';
        elements.stressFeedback.textContent = 'Stress test halted. CPU returning to baseline.';
    } finally {
        stopStressUI();
    }
});

// 4. Clear Logs
elements.btnClearLogs.addEventListener('click', () => {
    elements.eventLogContainer.innerHTML = '';
    appendLog('Platform event stream cleared.', 'SYS');
});

// 5. Topology Modal controls & tab navigation
elements.btnOpenTopology.addEventListener('click', () => {
    elements.topologyModal.classList.remove('hidden');
});
elements.btnCloseTopology.addEventListener('click', () => {
    elements.topologyModal.classList.add('hidden');
});
elements.topologyModal.addEventListener('click', (e) => {
    if (e.target === elements.topologyModal) {
        elements.topologyModal.classList.add('hidden');
    }
});

// Modal tab switcher
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');
    });
});

// Copy full architecture specification
function copyArchitectureSpecification() {
    const specElem = document.getElementById('full-architecture-text-field');
    if (!specElem) return;
    const text = specElem.innerText || specElem.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const copyBtnText = document.getElementById('copy-spec-text');
        if (copyBtnText) copyBtnText.textContent = 'Copied to Clipboard!';
        appendLog('Full architecture specification copied to clipboard.', 'CLIPBOARD');
        setTimeout(() => {
            if (copyBtnText) copyBtnText.textContent = 'Copy Full Spec';
        }, 2500);
    }).catch(() => {
        appendLog('Failed to copy spec directly. Please select text manually.', 'WARN');
    });
}

const btnCopySpec = document.getElementById('btn-copy-spec');
if (btnCopySpec) btnCopySpec.addEventListener('click', copyArchitectureSpecification);
const btnCopySpecInner = document.getElementById('btn-copy-spec-inner');
if (btnCopySpecInner) btnCopySpecInner.addEventListener('click', copyArchitectureSpecification);

// Copy buttons for long dashboard fields
const btnCopyPod = document.getElementById('btn-copy-pod-name');
if (btnCopyPod) {
    btnCopyPod.addEventListener('click', () => {
        const val = elements.k8sPodName ? elements.k8sPodName.textContent : '';
        navigator.clipboard.writeText(val).then(() => {
            btnCopyPod.textContent = 'Copied!';
            setTimeout(() => { btnCopyPod.textContent = 'Copy'; }, 2000);
        });
    });
}
const btnCopyDb = document.getElementById('btn-copy-db-host');
if (btnCopyDb) {
    btnCopyDb.addEventListener('click', () => {
        const val = elements.dbHost ? elements.dbHost.textContent : '';
        navigator.clipboard.writeText(val).then(() => {
            btnCopyDb.textContent = 'Copied!';
            setTimeout(() => { btnCopyDb.textContent = 'Copy'; }, 2000);
        });
    });
}

// Search filter for specification and matrix
const specSearch = document.getElementById('spec-search-input');
if (specSearch) {
    specSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const sections = document.querySelectorAll('.spec-section');
        sections.forEach(sec => {
            const text = sec.textContent.toLowerCase();
            sec.style.display = (!query || text.includes(query)) ? '' : 'none';
        });
        const rows = document.querySelectorAll('.matrix-table tbody tr');
        rows.forEach(r => {
            const text = r.textContent.toLowerCase();
            r.style.display = (!query || text.includes(query)) ? '' : 'none';
        });
    });
}

// Start periodic background telemetry polling (initial HTML already contains server-rendered metrics)
setInterval(fetchTelemetry, 2500);
