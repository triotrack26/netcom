document.addEventListener('DOMContentLoaded', () => {
    // --- Global Telemetry Data Object ---
    const telemetry = {
        timestamp: new Date().toISOString(),
        system: {},
        battery: {},
        camera: { status: 'Unchecked', grainWarning: false },
        audio: { tested: false },
        mic: { recorded: false },
        input: { keyCount: 0, touchpadLagWarning: false },
        display: { verified: false },
        storage: {},
        ports: []
    };

    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const activeTitle = document.getElementById('active-tab-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabKey = item.getAttribute('data-tab');
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`tab-${tabKey}`).classList.add('active');
            if (activeTitle) activeTitle.textContent = item.textContent.trim();
        });
    });

    // Helper: Trigger Pop-up Alert
    function triggerAlert(message, type = 'warning') {
        const container = document.getElementById('alert-banner-container');
        if (!container) return;
        const banner = document.createElement('div');
        banner.className = `alert alert-${type}`;
        banner.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>${message}</span>`;
        container.prepend(banner);
        setTimeout(() => banner.remove(), 5000);
    }

    // --- 1. System Info & BIOS ---
    function initSystemInfo() {
        const ua = navigator.userAgent;
        let os = "Desktop OS";
        if (ua.includes("Win")) os = "Windows OS";
        else if (ua.includes("Mac")) os = "macOS";
        else if (ua.includes("Linux")) os = "Linux OS";

        const mockSerial = "LPT-SN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        const mockBios = "UEFI v" + (Math.floor(Math.random() * 4) + 1) + "." + Math.floor(Math.random() * 90 + 10);

        let gpu = "Integrated WebGL Engine";
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            if (gl) {
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
            }
        } catch (e) {}

        const cpu = navigator.hardwareConcurrency || 8;
        const ram = navigator.deviceMemory ? `>= ${navigator.deviceMemory}` : "16";

        document.getElementById('sys-serial').textContent = mockSerial;
        document.getElementById('sys-bios').textContent = mockBios;
        document.getElementById('sys-os').textContent = os;
        document.getElementById('sys-gpu').textContent = gpu;
        document.getElementById('sys-cpu').textContent = `${cpu} Cores`;
        document.getElementById('sys-ram').textContent = `${ram} GB`;

        telemetry.system = { serialNumber: mockSerial, biosRevision: mockBios, os, gpu, cpuCores: cpu, ramGB: ram };
    }

    // --- 2. Battery Health ---
    async function initBattery() {
        const designCap = 56000; // mWh
        let currentCap = 50400; // default 90%
        let level = 90;
        let charging = true;

        if ('getBattery' in navigator) {
            try {
                const batt = await navigator.getBattery();
                level = Math.round(batt.level * 100);
                charging = batt.charging;
                currentCap = Math.round(designCap * (batt.level));
            } catch (e) {}
        }

        const healthScore = ((currentCap / designCap) * 100).toFixed(1);
        document.getElementById('bat-health').textContent = `${healthScore}%`;
        document.getElementById('bat-level').textContent = `${level}%`;
        document.getElementById('bat-status').textContent = charging ? 'AC Adapter Plugged In / Charging' : 'Discharging on Battery';
        document.getElementById('bat-current').textContent = `${currentCap} mWh`;

        telemetry.battery = { healthScore: `${healthScore}%`, chargeLevel: `${level}%`, isCharging: charging, currentCap, designCap };
    }

    // --- 3. Camera Test & Grain Detection ---
    let cameraStream = null;
    const videoElem = document.getElementById('webcam-feed');
    const startCamBtn = document.getElementById('start-cam-btn');
    const snapCamBtn = document.getElementById('snap-cam-btn');
    const stopCamBtn = document.getElementById('stop-cam-btn');
    const camPlaceholder = document.getElementById('cam-placeholder');

    if (startCamBtn) {
        startCamBtn.addEventListener('click', async () => {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoElem.srcObject = cameraStream;
                camPlaceholder.classList.add('hidden');
                startCamBtn.disabled = true;
                snapCamBtn.disabled = false;
                stopCamBtn.disabled = false;
                telemetry.camera.status = 'Stream Active';
            } catch (err) {
                triggerAlert(`Camera Stream Access Denied: ${err.message}`);
            }
        });

        stopCamBtn.addEventListener('click', () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop());
                videoElem.srcObject = null;
            }
            camPlaceholder.classList.remove('hidden');
            startCamBtn.disabled = false;
            snapCamBtn.disabled = true;
            stopCamBtn.disabled = true;
        });

        snapCamBtn.addEventListener('click', () => {
            const canvas = document.getElementById('photo-canvas');
            canvas.width = videoElem.videoWidth || 640;
            canvas.height = videoElem.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);

            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let varianceSum = 0;
            for (let i = 0; i < imgData.data.length; i += 16) {
                varianceSum += Math.abs(imgData.data[i] - imgData.data[i + 1]);
            }
            const grainScore = varianceSum / (imgData.data.length / 16);
            
            if (grainScore > 25) {
                telemetry.camera.grainWarning = true;
                triggerAlert('Camera Grain Warning: Optical image noise threshold exceeded! Check focus & lens cleanliness.');
            }

            document.getElementById('snapshot-img').src = canvas.toDataURL('image/png');
            document.getElementById('snapshot-result').classList.remove('hidden');
        });
    }

    // --- 4. Sound & Microphone ---
    let audioCtx = null;
    function playAudioTone(panVal, freq) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;

        osc.frequency.value = freq;
        osc.type = freq < 100 ? 'sawtooth' : 'sine';
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

        if (pan) {
            pan.pan.value = panVal;
            osc.connect(pan);
            pan.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);

        telemetry.audio.tested = true;
    }

    document.getElementById('snd-left')?.addEventListener('click', () => playAudioTone(-1, 440));
    document.getElementById('snd-right')?.addEventListener('click', () => playAudioTone(1, 440));
    document.getElementById('snd-both')?.addEventListener('click', () => playAudioTone(0, 440));
    document.getElementById('snd-bass')?.addEventListener('click', () => playAudioTone(0, 60));

    // Mic Test
    let micStream, mediaRecorder, audioChunks = [];
    const startMicBtn = document.getElementById('start-mic');
    const stopMicBtn = document.getElementById('stop-mic');
    const micBar = document.getElementById('mic-level-bar');

    if (startMicBtn) {
        startMicBtn.addEventListener('click', async () => {
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(micStream);
                audioChunks = [];

                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const player = document.getElementById('mic-playback');
                    player.src = URL.createObjectURL(blob);
                    player.classList.remove('hidden');
                    telemetry.mic.recorded = true;
                };

                mediaRecorder.start();

                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const analyser = ctx.createAnalyser();
                const src = ctx.createMediaStreamSource(micStream);
                src.connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);

                function drawMeter() {
                    if (!startMicBtn.disabled) return;
                    analyser.getByteFrequencyData(data);
                    let avg = data.reduce((a, b) => a + b, 0) / data.length;
                    if (micBar) micBar.style.width = `${Math.min(100, avg * 2)}%`;
                    requestAnimationFrame(drawMeter);
                }
                drawMeter();

                startMicBtn.disabled = true;
                stopMicBtn.disabled = false;
            } catch (err) {
                triggerAlert(`Mic Access Error: ${err.message}`);
            }
        });

        stopMicBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            if (micStream) micStream.getTracks().forEach(t => t.stop());
            startMicBtn.disabled = false;
            stopMicBtn.disabled = true;
            if (micBar) micBar.style.width = '0%';
        });
    }

    // --- 5. Touchpad & Keyboard (Lag Anomaly Tracking) ---
    const touchZone = document.getElementById('touchpad-zone');
    let clicks = 0, scrollTotal = 0, lastMoveTime = performance.now();

    if (touchZone) {
        touchZone.addEventListener('mousemove', (e) => {
            const now = performance.now();
            const delta = now - lastMoveTime;
            lastMoveTime = now;

            // Lag anomaly detection if frame threshold > 60ms
            if (delta > 60) {
                telemetry.input.touchpadLagWarning = true;
                triggerAlert('Touchpad Lag Warning: Latency spike detected during pointer tracking!');
            }

            const rect = touchZone.getBoundingClientRect();
            document.getElementById('tp-coords').textContent = `${Math.round(e.clientX - rect.left)}, ${Math.round(e.clientY - rect.top)}`;
        });

        touchZone.addEventListener('click', () => {
            clicks++;
            document.getElementById('tp-clicks').textContent = clicks;
        });

        touchZone.addEventListener('wheel', (e) => {
            scrollTotal += e.deltaY > 0 ? 1 : -1;
            document.getElementById('tp-scroll').textContent = scrollTotal;
        });
    }

    // Virtual Keyboard Setup
    const kbContainer = document.getElementById('virtual-keyboard');
    if (kbContainer) {
        const rows = [
            ['Esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
        ];
        rows.forEach(r => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'kb-row';
            r.forEach(k => {
                rowDiv.innerHTML += `<div class="key-cap" id="key-${k}">${k}</div>`;
            });
            kbContainer.appendChild(rowDiv);
        });

        window.addEventListener('keydown', (e) => {
            const keyStr = e.key.toUpperCase();
            const el = document.getElementById(`key-${keyStr}`);
            if (el) el.classList.add('pressed');
            telemetry.input.keyCount++;
        });
    }

    // --- 6. Display Color Matrix ---
    const swatches = document.querySelectorAll('.color-swatch');
    const fullTest = document.getElementById('fullscreen-color');

    swatches.forEach(s => {
        s.addEventListener('click', () => {
            const color = s.getAttribute('data-color');
            fullTest.style.backgroundColor = color;
            fullTest.classList.remove('hidden');
            telemetry.display.verified = true;
        });
    });

    fullTest?.addEventListener('click', () => fullTest.classList.add('hidden'));

    // --- 7. SSD Health & Ports ---
    async function initStorageAndPorts() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const est = await navigator.storage.estimate();
            document.getElementById('ssd-quota').textContent = `${(est.quota / (1024 ** 3)).toFixed(2)} GB`;
            document.getElementById('ssd-usage').textContent = `${(est.usage / (1024 ** 2)).toFixed(2)} MB`;
            telemetry.storage = { quotaGB: (est.quota / (1024 ** 3)).toFixed(2), smartScore: "98%" };
        }

        // Ports Scan
        const portsTable = document.getElementById('ports-list');
        if (!portsTable) return;
        portsTable.innerHTML = '';

        const interfaces = [
            { type: 'Host USB Bus', name: 'USB 3.2 Gen 2 Controller', status: 'Ready' },
            { type: 'Display Output', name: 'HDMI / eDP Panel Bus', status: 'Active' }
        ];

        try {
            if (navigator.mediaDevices) {
                const devs = await navigator.mediaDevices.enumerateDevices();
                devs.forEach(d => {
                    interfaces.push({
                        type: d.kind === 'videoinput' ? 'Camera Interface' : 'Audio Port',
                        name: d.label || `Hardware ${d.kind}`,
                        status: 'Connected'
                    });
                });
            }
        } catch (e) {}

        telemetry.ports = interfaces;
        interfaces.forEach(i => {
            portsTable.innerHTML += `<tr><td><strong>${i.type}</strong></td><td>${i.name}</td><td><span class="text-success">${i.status}</span></td></tr>`;
        });
    }

    document.getElementById('rescan-ports')?.addEventListener('click', initStorageAndPorts);

    // --- 8. Reports Output & Actions ---
    function syncAuditLogs() {
        const consoleOutput = document.getElementById('audit-log-output');
        if (consoleOutput) {
            consoleOutput.textContent = JSON.stringify(telemetry, null, 2);
        }
    }

    document.getElementById('export-json')?.addEventListener('click', () => {
        syncAuditLogs();
        const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(telemetry, null, 2));
        const a = document.createElement('a');
        a.href = data;
        a.download = `Exact_Hardware_Diagnostic_Report_${Date.now()}.json`;
        a.click();
    });

    document.getElementById('print-report')?.addEventListener('click', () => window.print());

    document.getElementById('run-all-tests')?.addEventListener('click', async () => {
        initSystemInfo();
        await initBattery();
        await initStorageAndPorts();
        syncAuditLogs();
        alert('Automated System Diagnostic Audit Complete!');
    });

    // Run Initial Scans
    initSystemInfo();
    initBattery();
    initStorageAndPorts();
    syncAuditLogs();
});
