const AGENT = "http://127.0.0.1:47821";

let cameraStream = null;
let micStream = null;
let mediaRecorder = null;
let recordedChunks = [];


// --------------------------------------------------
// NAVIGATION
// --------------------------------------------------

function showPage(page, element = null) {

    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active-page");
    });

    const target = document.getElementById(page);

    if (target) {
        target.classList.add("active-page");
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
    });

    if (element) {
        element.classList.add("active");
    }

    const titles = {
        overview: "Machine Overview",
        system: "System Information",
        battery: "Battery Diagnostic",
        camera: "Camera Test",
        microphone: "Microphone Test",
        sound: "Sound Test",
        display: "Display Test",
        speed: "Speed Test",
        ports: "Port Detection"
    };

    document.getElementById("pageTitle").textContent =
        titles[page] || "Laptop Analyzer";
}


// --------------------------------------------------
// API
// --------------------------------------------------

async function api(endpoint) {

    const response = await fetch(
        `${AGENT}${endpoint}`,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(
            `Agent error: ${response.status}`
        );
    }

    return response.json();
}


// --------------------------------------------------
// LOAD EVERYTHING
// --------------------------------------------------

async function loadAllData() {

    updateAgentStatus(false);

    try {

        const system = await api("/api/system");

        updateAgentStatus(true);

        renderSystem(system);

        try {
            const battery = await api("/api/battery");
            renderBattery(battery);
        } catch (error) {
            console.warn("Battery:", error);
        }

        try {
            const ports = await api("/api/ports");
            renderPorts(ports);
        } catch (error) {
            console.warn("Ports:", error);
        }

        runSpeedTest();

        document.getElementById("lastUpdated").textContent =
            "Updated " +
            new Date().toLocaleTimeString();

    } catch (error) {

        console.error(error);

        updateAgentStatus(false);

        document.getElementById("machineName").textContent =
            "Hardware agent is not running";

        document.getElementById("overviewModel").textContent =
            "Agent Offline";
    }
}


function updateAgentStatus(online) {

    const dot = document.getElementById("agentDot");
    const status = document.getElementById("agentStatus");

    if (online) {

        dot.classList.remove("red");

        status.textContent =
            "Hardware agent online";

    } else {

        dot.classList.add("red");

        status.textContent =
            "Agent offline";
    }
}


// --------------------------------------------------
// SYSTEM
// --------------------------------------------------

function renderSystem(data) {

    document.getElementById("manufacturer").textContent =
        data.manufacturer || "--";

    document.getElementById("model").textContent =
        data.model || "--";

    document.getElementById("serial").textContent =
        data.serial || "--";

    document.getElementById("motherboard").textContent =
        data.motherboard || "--";

    document.getElementById("systemCPU").textContent =
        data.cpu?.name || "--";

    document.getElementById("systemRAM").textContent =
        data.ram?.totalGB
            ? `${data.ram.totalGB} GB`
            : "--";

    document.getElementById("systemRAMSpeed").textContent =
        data.ram?.speedMHz
            ? `${data.ram.speedMHz} MHz`
            : "--";

    document.getElementById("os").textContent =
        data.os?.name || "--";

    document.getElementById("osBuild").textContent =
        data.os?.build || "--";

    document.getElementById("resolution").textContent =
        `${screen.width} × ${screen.height}`;

    document.getElementById("systemTemp").textContent =
        data.cpu?.temperatureC
            ? `${data.cpu.temperatureC} °C`
            : "Unavailable";


    document.getElementById("machineName").textContent =
        `${data.manufacturer || ""} ${data.model || ""}`;

    document.getElementById("overviewModel").textContent =
        data.model || "Unknown Machine";

    document.getElementById("overviewOS").textContent =
        `${data.os?.name || "Unknown OS"} ${data.os?.version || ""}`;


    document.getElementById("cpuName").textContent =
        data.cpu?.name || "--";

    document.getElementById("cpuTemp").textContent =
        data.cpu?.temperatureC
            ? `Temperature: ${data.cpu.temperatureC} °C`
            : "Temperature: unavailable";


    document.getElementById("ramSize").textContent =
        data.ram?.totalGB
            ? `${data.ram.totalGB} GB`
            : "--";

    document.getElementById("ramSpeed").textContent =
        data.ram?.speedMHz
            ? `Speed: ${data.ram.speedMHz} MHz`
            : "Speed: --";


    if (data.storage && data.storage.length > 0) {

        const disk = data.storage[0];

        document.getElementById("storageSize").textContent =
            disk.sizeGB
                ? `${disk.sizeGB} GB`
                : "--";

        document.getElementById("storageHealth").textContent =
            disk.health !== null &&
            disk.health !== undefined
                ? `Health: ${disk.health}%`
                : "Health: unavailable";
    }
}


async function loadSystem() {

    try {

        const data = await api("/api/system");

        renderSystem(data);

    } catch (error) {

        alert(
            "Unable to connect to hardware agent."
        );
    }
}


// --------------------------------------------------
// BATTERY
// --------------------------------------------------

function renderBattery(data) {

    const percent =
        Number(data.percent) || 0;

    document.getElementById("batteryPercent").textContent =
        `${percent}%`;

    document.getElementById("batteryBig").textContent =
        `${percent}%`;

    document.getElementById("batteryBar").style.width =
        `${Math.min(percent, 100)}%`;

    document.getElementById("chargingStatus").textContent =
        data.charging
            ? "Currently charging"
            : "Not charging";


    document.getElementById("batteryModel").textContent =
        data.model || "Unavailable";

    document.getElementById("designCapacity").textContent =
        data.designCapacityWh
            ? `${data.designCapacityWh} Wh`
            : "Unavailable";

    document.getElementById("fullCapacity").textContent =
        data.fullChargeCapacityWh
            ? `${data.fullChargeCapacityWh} Wh`
            : "Unavailable";

    document.getElementById("currentCapacity").textContent =
        data.currentCapacityWh
            ? `${data.currentCapacityWh} Wh`
            : "Unavailable";


    let health = data.health;

    if (
        health === null ||
        health === undefined
    ) {

        health = "--";

    } else {

        health = Math.round(health);

    }

    document.getElementById("batteryHealth").textContent =
        `Health: ${health}%`;

    document.getElementById("batteryHealthBig").textContent =
        health === "--"
            ? "--"
            : `${health}%`;

    document.getElementById("healthScore").textContent =
        health === "--"
            ? "--"
            : health;
}


async function loadBattery() {

    try {

        const data = await api("/api/battery");

        renderBattery(data);

    } catch (error) {

        alert(
            "Battery information is unavailable."
        );
    }
}


// --------------------------------------------------
// CAMERA
// --------------------------------------------------

async function startCamera() {

    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    width: {
                        ideal: 1920
                    },
                    height: {
                        ideal: 1080
                    }
                }
            });

        const video =
            document.getElementById("cameraVideo");

        video.srcObject =
            cameraStream;

    } catch (error) {

        alert(
            "Camera access was denied or no camera was found."
        );
    }
}


function capturePhoto() {

    const video =
        document.getElementById("cameraVideo");

    const canvas =
        document.getElementById("cameraCanvas");

    if (!cameraStream) {

        alert("Start the camera first.");

        return;
    }

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;

    const context =
        canvas.getContext("2d");

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const image =
        canvas.toDataURL(
            "image/jpeg",
            .95
        );

    const download =
        document.getElementById("downloadPhoto");

    download.href =
        image;

    download.style.display =
        "block";
}


// --------------------------------------------------
// MICROPHONE
// --------------------------------------------------

async function startMic() {

    try {

        micStream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        const audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const source =
            audioContext.createMediaStreamSource(
                micStream
            );

        const analyser =
            audioContext.createAnalyser();

        analyser.fftSize = 256;

        source.connect(analyser);

        const data =
            new Uint8Array(
                analyser.frequencyBinCount
            );

        function updateMeter() {

            analyser.getByteFrequencyData(data);

            let total = 0;

            for (let i = 0; i < data.length; i++) {
                total += data[i];
            }

            const average =
                total / data.length;

            const level =
                Math.min(
                    100,
                    average * 2
                );

            document.getElementById(
                "micLevel"
            ).style.width =
                `${level}%`;

            requestAnimationFrame(
                updateMeter
            );
        }

        updateMeter();

    } catch (error) {

        alert(
            "Microphone access was denied or unavailable."
        );
    }
}


function startRecording() {

    if (!micStream) {

        alert(
            "Start the microphone first."
        );

        return;
    }

    recordedChunks = [];

    mediaRecorder =
        new MediaRecorder(
            micStream
        );

    mediaRecorder.ondataavailable =
        event => {

            if (event.data.size > 0) {
                recordedChunks.push(
                    event.data
                );
            }
        };

    mediaRecorder.onstop =
        () => {

            const blob =
                new Blob(
                    recordedChunks,
                    {
                        type: "audio/webm"
                    }
                );

            const url =
                URL.createObjectURL(
                    blob
                );

            document.getElementById(
                "recording"
            ).src = url;
        };

    mediaRecorder.start();

}


function stopRecording() {

    if (
        mediaRecorder &&
        mediaRecorder.state !== "inactive"
    ) {

        mediaRecorder.stop();
    }
}


// --------------------------------------------------
// SOUND
// --------------------------------------------------

function playTone(channel) {

    const context =
        new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    const oscillator =
        context.createOscillator();

    const gain =
        context.createGain();

    oscillator.connect(gain);

    gain.connect(
        context.destination
    );

    let frequency = 440;

    if (channel === "bass") {
        frequency = 80;
    }

    oscillator.frequency.value =
        frequency;

    gain.gain.value =
        0.25;

    oscillator.start();

    setTimeout(() => {

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + .15
        );

        oscillator.stop(
            context.currentTime + .2
        );

        context.close();

    }, 700);
}


// --------------------------------------------------
// DISPLAY
// --------------------------------------------------

function displayColor(color) {

    const test =
        document.getElementById(
            "displayTest"
        );

    test.style.position =
        "fixed";

    test.style.inset =
        "0";

    test.style.zIndex =
        "9999";

    test.style.background =
        color;

    test.style.display =
        "flex";

    test.style.alignItems =
        "center";

    test.style.justifyContent =
        "center";

    test.innerHTML = `
        <button
            onclick="closeDisplayTest()"
            style="
                padding:15px 25px;
                border-radius:10px;
                background:#2563eb;
                color:white;
                font-weight:bold;
            "
        >
            EXIT DISPLAY TEST
        </button>
    `;
}


function closeDisplayTest() {

    window.location.reload();
}


// --------------------------------------------------
// SPEED
// --------------------------------------------------

function runSpeedTest() {

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    if (connection) {

        document.getElementById(
            "networkType"
        ).textContent =
            connection.effectiveType ||
            "Unknown";

        document.getElementById(
            "networkSpeed"
        ).textContent =
            connection.downlink
                ? `${connection.downlink} Mbps`
                : "Unavailable";

    } else {

        document.getElementById(
            "networkType"
        ).textContent =
            "Unavailable";

        document.getElementById(
            "networkSpeed"
        ).textContent =
            "Unavailable";
    }

    api("/api/system")
        .then(data => {

            document.getElementById(
                "speedRam"
            ).textContent =
                data.ram?.speedMHz
                    ? `${data.ram.speedMHz} MHz`
                    : "--";

        })
        .catch(() => {});
}


// --------------------------------------------------
// PORTS
// --------------------------------------------------

function renderPorts(data) {

    const container =
        document.getElementById(
            "portsList"
        );

    if (
        !data.devices ||
        data.devices.length === 0
    ) {

        container.innerHTML =
            `<div class="port-item">
                <b>No external devices detected</b>
                <span>Scan completed</span>
             </div>`;

        return;
    }

    container.innerHTML =
        data.devices.map(device => {

            return `
                <div class="port-item">
                    <b>
                        ${escapeHTML(
                            device.name || "Unknown Device"
                        )}
                    </b>

                    <span>
                        ${escapeHTML(
                            device.type || "Unknown"
                        )}
                    </span>
                </div>
            `;

        }).join("");
}


async function loadPorts() {

    try {

        const data =
            await api("/api/ports");

        renderPorts(data);

    } catch (error) {

        document.getElementById(
            "portsList"
        ).innerHTML =
            `<div class="port-item">
                <b>Hardware agent unavailable</b>
                <span>Offline</span>
             </div>`;
    }
}


// --------------------------------------------------
// SECURITY
// --------------------------------------------------

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// --------------------------------------------------
// INITIAL LOAD
// --------------------------------------------------

window.addEventListener(
    "DOMContentLoaded",
    () => {

        loadAllData();

        // Refresh hardware information
        // every 10 seconds while dashboard
        // remains open.

        setInterval(
            loadAllData,
            10000
        );
    }
);
