document.addEventListener("DOMContentLoaded", () => {
    // Tab Switching Logic
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // 1. System Info (Uses standard navigator and window objects)
    document.getElementById('os-info').textContent = navigator.userAgent;
    document.getElementById('ram-info').textContent = navigator.deviceMemory ? `>= ${navigator.deviceMemory} GB` : 'Not supported';
    document.getElementById('cpu-info').textContent = navigator.hardwareConcurrency || 'Unknown';
    document.getElementById('screen-info').textContent = `${window.screen.width} x ${window.screen.height}`;

    // 2. Battery Info (Uses Battery Status API)
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const updateBattery = () => {
                document.getElementById('batt-level').textContent = `${(battery.level * 100).toFixed(0)}%`;
                document.getElementById('batt-charging').textContent = battery.charging ? 'Yes (Plugged In)' : 'No (Discharging)';
            };
            updateBattery();
            battery.addEventListener('levelchange', updateBattery);
            battery.addEventListener('chargingchange', updateBattery);
        });
    } else {
        document.getElementById('batt-level').textContent = 'API Not Supported';
    }

    // 3. Camera Test
    const video = document.getElementById('cam-video');
    const canvas = document.getElementById('cam-canvas');
    let mediaStream = null;

    document.getElementById('start-cam').addEventListener('click', async () => {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = mediaStream;
            document.getElementById('snap-cam').disabled = false;
        } catch (err) {
            alert("Camera access denied or no camera found.");
        }
    });

    document.getElementById('snap-cam').addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
    });

    // 4. Mic Test
    let mediaRecorder;
    let audioChunks = [];
    const audioPlayback = document.getElementById('mic-playback');

    document.getElementById('start-mic').addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            
            document.getElementById('start-mic').disabled = true;
            document.getElementById('stop-mic').disabled = false;

            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioPlayback.src = URL.createObjectURL(audioBlob);
                audioChunks = [];
            };
        } catch (err) {
            alert("Microphone access denied.");
        }
    });

    document.getElementById('stop-mic').addEventListener('click', () => {
        mediaRecorder.stop();
        document.getElementById('start-mic').disabled = false;
        document.getElementById('stop-mic').disabled = true;
    });

    // 5. Sound Test (Web Audio API)
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const playTone = (panValue, frequency = 440) => {
        const oscillator = audioCtx.createOscillator();
        const panner = audioCtx.createStereoPanner();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        panner.pan.value = panValue; // -1 left, 0 both, 1 right

        oscillator.connect(panner);
        panner.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 2); // Play for 2 seconds
    };

    document.getElementById('test-left').addEventListener('click', () => playTone(-1));
    document.getElementById('test-right').addEventListener('click', () => playTone(1));
    document.getElementById('test-both').addEventListener('click', () => playTone(0));
    document.getElementById('test-bass').addEventListener('click', () => playTone(0, 60)); // 60Hz deep bass

    // 6. Display Test
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
    let colorIndex = 0;

    document.getElementById('start-display').addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'fullscreen-test';
        div.style.backgroundColor = colors[colorIndex];
        document.body.appendChild(div);
        
        div.requestFullscreen().catch(err => alert(`Error: ${err.message}`));

        div.addEventListener('click', () => {
            colorIndex++;
            if (colorIndex >= colors.length) {
                document.exitFullscreen();
                div.remove();
                colorIndex = 0;
            } else {
                div.style.backgroundColor = colors[colorIndex];
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) div.remove();
        });
    });

    // 7. Network Speed Estimate
    if (navigator.connection) {
        document.getElementById('net-downlink').textContent = `${navigator.connection.downlink} Mbps (Estimate)`;
        document.getElementById('net-type').textContent = navigator.connection.effectiveType;
    } else {
        document.getElementById('net-downlink').textContent = 'API Not Supported';
    }

    // 8. Port Detection (WebUSB API)
    document.getElementById('scan-usb').addEventListener('click', async () => {
        if ('usb' in navigator) {
            try {
                // Requests permission to view a device
                const device = await navigator.usb.requestDevice({ filters: [] });
                const li = document.createElement('li');
                li.textContent = `Found: ${device.productName} by ${device.manufacturerName}`;
                document.getElementById('usb-list').appendChild(li);
            } catch (err) {
                console.log("No device selected or permission denied.");
            }
        } else {
            alert("WebUSB API not supported in this browser.");
        }
    });
});
