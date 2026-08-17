"use strict";

/*
    LAPTOP ANALYZER
    GitHub Pages / Browser-only edition

    Important:
    A browser cannot access protected Windows hardware interfaces.
    Therefore this application never invents serial numbers,
    SSD health, CPU temperature, exact battery capacity, etc.

    It continuously updates browser-accessible information
    without reloading the page.
*/


/* =========================================================
   STATE
========================================================= */

const state = {

    battery: null,

    cameraStream: null,

    microphoneStream: null,

    microphoneContext: null,

    microphoneAnalyser: null,

    microphoneAnimation: null,

    mediaRecorder: null,

    recordedChunks: [],

    audioContext: null,

    selectedPage: "overview"

};


/* =========================================================
   HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}


function showToast(message) {

    const toast = $("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(
        showToast.timeout
    );

    showToast.timeout = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


function formatBytes(bytes) {

    if (!bytes) {
        return "--";
    }

    const gb = bytes / 1024 / 1024 / 1024;

    return `${gb.toFixed(1)} GB`;
}


function formatTime(seconds) {

    if (
        seconds === Infinity ||
        !Number.isFinite(seconds) ||
        seconds <= 0
    ) {
        return "--";
    }

    const minutes =
        Math.round(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours =
        Math.floor(minutes / 60);

    const remaining =
        minutes % 60;

    return `${hours}h ${remaining}m`;
}


function getBrowserName() {

    const ua = navigator.userAgent;

    if (/Edg\//.test(ua)) {
        return "Microsoft Edge";
    }

    if (/Chrome\//.test(ua)) {
        return "Google Chrome";
    }

    if (/Firefox\//.test(ua)) {
        return "Mozilla Firefox";
    }

    if (/Safari\//.test(ua)) {
        return "Safari";
    }

    return "Unknown Browser";
}


/* =========================================================
   NAVIGATION
========================================================= */

const pageTitles = {

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


function openPage(page) {

    state.selectedPage = page;

    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.remove("active");

        });


    const target =
        $(`page-${page}`);

    if (target) {
        target.classList.add("active");
    }


    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });


    $("pageTitle").textContent =
        pageTitles[page] ||
        "Laptop Analyzer";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


document
    .querySelectorAll(".nav-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openPage(
                    button.dataset.page
                );

            }
        );

    });


document
    .querySelectorAll(".module-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openPage(
                    button.dataset.open
                );

            }
        );

    });


/* =========================================================
   SYSTEM INFORMATION
========================================================= */

function updateSystemInfo() {

    const browser =
        getBrowserName();

    const platform =
        navigator.platform ||
        "Unknown";

    const cores =
        navigator.hardwareConcurrency ||
        null;

    const deviceMemory =
        navigator.deviceMemory ||
        null;


    $("systemOs").textContent =
        navigator.userAgentData?.platform ||
        platform ||
        "Unknown";


    $("systemBrowser").textContent =
        browser;


    $("systemPlatform").textContent =
        platform;


    $("systemCores").textContent =
        cores
            ? `${cores} logical cores`
            : "Unavailable";


    $("systemRam").textContent =
        deviceMemory
            ? `${deviceMemory} GB`
            : "Unavailable";


    $("systemResolution").textContent =
        `${window.screen.width} × ${window.screen.height}`;


    $("systemAvailableScreen").textContent =
        `${window.screen.availWidth} × ${window.screen.availHeight}`;


    $("systemPixelRatio").textContent =
        `${window.devicePixelRatio || 1}x`;


    $("systemColorDepth").textContent =
        `${window.screen.colorDepth || "--"} bit`;


    $("systemOnline").textContent =
        navigator.onLine
            ? "Online"
            : "Offline";


    $("overviewDevice").textContent =
        platform ||
        "Browser Device";


    $("overviewBrowser").textContent =
        `${browser} • ${navigator.userAgentData?.platform || platform}`;


    $("overviewCpu").textContent =
        cores
            ? `${cores} logical cores`
            : "Browser detected";


    $("overviewCpuStatus").textContent =
        "Temperature unavailable";


    $("overviewRam").textContent =
        deviceMemory
            ? `${deviceMemory} GB`
            : "Unavailable";


    $("overviewDisplay").textContent =
        `${window.screen.width} × ${window.screen.height}`;
}


/* =========================================================
   BATTERY
========================================================= */

async function updateBattery() {

    /*
        navigator.getBattery() is supported by some Chromium
        browsers but is not available everywhere.
    */

    if (
        !("getBattery" in navigator)
    ) {

        setBatteryUnavailable();

        return;
    }


    try {

        if (!state.battery) {

            state.battery =
                await navigator.getBattery();

            state.battery.addEventListener(
                "chargingchange",
                updateBattery
            );

            state.battery.addEventListener(
                "levelchange",
                updateBattery
            );

        }


        const battery =
            state.battery;


        const percent =
            Math.round(
                battery.level * 100
            );


        $("batteryPercent").textContent =
            `${percent}%`;


        $("batteryLevel").textContent =
            `${percent}%`;


        $("batteryFill").style.width =
            `${percent}%`;


        $("batteryCharging").textContent =
            battery.charging
                ? "Yes"
                : "No";


        $("batteryState").textContent =
            battery.charging
                ? "Currently charging"
                : "Not charging";


        $("overviewBattery").textContent =
            `${percent}%`;


        $("overviewCharging").textContent =
            battery.charging
                ? "Charging"
                : "Not charging";


        $("batteryChargingTime").textContent =
            formatTime(
                battery.chargingTime
            );


        $("batteryDischargingTime").textContent =
            formatTime(
                battery.dischargingTime
            );


    } catch (error) {

        console.warn(
            "Battery API unavailable:",
            error
        );

        setBatteryUnavailable();
    }
}


function setBatteryUnavailable() {

    $("batteryPercent").textContent =
        "--";

    $("batteryLevel").textContent =
        "Unavailable";

    $("batteryState").textContent =
        "Battery API unavailable";

    $("batteryCharging").textContent =
        "Unavailable";

    $("batteryChargingTime").textContent =
        "--";

    $("batteryDischargingTime").textContent =
        "--";

    $("overviewBattery").textContent =
        "--";

    $("overviewCharging").textContent =
        "Not available";
}


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showToast(
            "Camera API is not supported by this browser."
        );

        return;
    }


    try {

        stopCamera();


        state.cameraStream =
            await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user"
                },
                audio: false
            });


        const video =
            $("cameraVideo");


        video.srcObject =
            state.cameraStream;


        video.style.display =
            "block";


        $("cameraPlaceholder").style.display =
            "none";


        $("cameraStatus").textContent =
            "WORKING";


        $("cameraStatus").style.color =
            "#16a34a";


        showToast(
            "Camera started successfully."
        );


    } catch (error) {

        console.error(error);

        $("cameraStatus").textContent =
            "FAILED";


        showToast(
            "Camera permission denied or camera unavailable."
        );
    }
}


function stopCamera() {

    if (
        state.cameraStream
    ) {

        state.cameraStream
            .getTracks()
            .forEach(track => {
                track.stop();
            });

        state.cameraStream = null;
    }


    const video =
        $("cameraVideo");


    if (video) {

        video.srcObject = null;

        video.style.display =
            "none";
    }


    const placeholder =
        $("cameraPlaceholder");


    if (placeholder) {
        placeholder.style.display =
            "flex";
    }
}


function capturePhoto() {

    if (
        !state.cameraStream
    ) {

        showToast(
            "Start the camera first."
        );

        return;
    }


    const video =
        $("cameraVideo");

    const canvas =
        $("cameraCanvas");


    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {

        showToast(
            "Camera is not ready yet."
        );

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


    canvas.toBlob(
        blob => {

            if (!blob) {
                return;
            }


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                $("photoDownload");


            link.href =
                url;


            link.style.display =
                "block";


            $("cameraStatus").textContent =
                "PASSED";


            $("cameraStatus").style.color =
                "#16a34a";


            showToast(
                "Image captured successfully."
            );

        },
        "image/jpeg",
        .95
    );
}


/* =========================================================
   MICROPHONE
========================================================= */

async function startMicrophone() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        showToast(
            "Microphone API is not supported."
        );

        return;
    }


    try {

        stopMicrophone();


        state.microphoneStream =
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });


        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {

            showToast(
                "Audio analyser is unavailable."
            );

            return;
        }


        state.microphoneContext =
            new AudioContext();


        const source =
            state.microphoneContext
                .createMediaStreamSource(
                    state.microphoneStream
                );


        state.microphoneAnalyser =
            state.microphoneContext
                .createAnalyser();


        state.microphoneAnalyser.fftSize =
            256;


        source.connect(
            state.microphoneAnalyser
        );


        $("micStatus").textContent =
            "WORKING";


        $("micStatus").style.color =
            "#16a34a";


        updateMicrophoneMeter();


        showToast(
            "Microphone started successfully."
        );


    } catch (error) {

        console.error(error);

        $("micStatus").textContent =
            "FAILED";

        showToast(
            "Microphone permission denied or unavailable."
        );
    }
}


function updateMicrophoneMeter() {

    if (
        !state.microphoneAnalyser
    ) {
        return;
    }


    const analyser =
        state.microphoneAnalyser;


    const data =
        new Uint8Array(
            analyser.fftSize
        );


    analyser.getByteTimeDomainData(
        data
    );


    let sum = 0;


    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        const normalized =
            (data[i] - 128) / 128;

        sum +=
            normalized * normalized;
    }


    const rms =
        Math.sqrt(
            sum / data.length
        );


    let level =
        Math.min(
            100,
            Math.round(
                rms * 300
            )
        );


    $("micLevel").style.width =
        `${level}%`;


    $("micValue").textContent =
        `${level}%`;


    state.microphoneAnimation =
        requestAnimationFrame(
            updateMicrophoneMeter
        );
}


function stopMicrophone() {

    if (
        state.microphoneAnimation
    ) {

        cancelAnimationFrame(
            state.microphoneAnimation
        );

        state.microphoneAnimation =
            null;
    }


    if (
        state.microphoneStream
    ) {

        state.microphoneStream
            .getTracks()
            .forEach(track => {
                track.stop();
            });

        state.microphoneStream = null;
    }


    if (
        state.microphoneContext
    ) {

        state.microphoneContext
            .close()
            .catch(() => {});

        state.microphoneContext =
            null;
    }


    state.microphoneAnalyser =
        null;
}


/* =========================================================
   RECORDING
========================================================= */

function startRecording() {

    if (
        !state.microphoneStream
    ) {

        showToast(
            "Start the microphone first."
        );

        return;
    }


    if (
        !window.MediaRecorder
    ) {

        showToast(
            "Voice recording is not supported."
        );

        return;
    }


    state.recordedChunks = [];


    let mimeType =
        "";


    if (
        MediaRecorder.isTypeSupported(
            "audio/webm;codecs=opus"
        )
    ) {

        mimeType =
            "audio/webm;codecs=opus";

    } else if (
        MediaRecorder.isTypeSupported(
            "audio/webm"
        )
    ) {

        mimeType =
            "audio/webm";
    }


    try {

        state.mediaRecorder =
            mimeType
                ? new MediaRecorder(
                    state.microphoneStream,
                    { mimeType }
                )
                : new MediaRecorder(
                    state.microphoneStream
                );


        state.mediaRecorder.ondataavailable =
            event => {

                if (
                    event.data &&
                    event.data.size > 0
                ) {

                    state.recordedChunks
                        .push(event.data);
                }
            };


        state.mediaRecorder.onstop =
            finishRecording;


        state.mediaRecorder.start();


        $("micStatus").textContent =
            "RECORDING";


        $("micStatus").style.color =
            "#dc2626";


        showToast(
            "Recording started."
        );


    } catch (error) {

        console.error(error);

        showToast(
            "Could not start recording."
        );
    }
}


function stopRecording() {

    if (
        state.mediaRecorder &&
        state.mediaRecorder.state !==
        "inactive"
    ) {

        state.mediaRecorder.stop();

    } else {

        showToast(
            "No recording is currently running."
        );
    }
}


function finishRecording() {

    const blob =
        new Blob(
            state.recordedChunks,
            {
                type:
                    state.mediaRecorder.mimeType ||
                    "audio/webm"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    $("recordingAudio").src =
        url;


    $("micStatus").textContent =
        "PASSED";


    $("micStatus").style.color =
        "#16a34a";


    showToast(
        "Recording completed."
    );
}


/* =========================================================
   SOUND
========================================================= */

async function playSound(type) {

    const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;


    if (!AudioContext) {

        showToast(
            "Web Audio is not supported."
        );

        return;
    }


    if (!state.audioContext) {

        state.audioContext =
            new AudioContext();
    }


    const context =
        state.audioContext;


    if (
        context.state ===
        "suspended"
    ) {

        await context.resume();
    }


    const oscillator =
        context.createOscillator();


    const gain =
        context.createGain();


    const panner =
        context.createStereoPanner
            ? context.createStereoPanner()
            : null;


    oscillator.connect(gain);


    if (panner) {

        gain.connect(panner);

        panner.connect(
            context.destination
        );

    } else {

        gain.connect(
            context.destination
        );
    }


    let frequency =
        440;


    let duration =
        .8;


    if (type === "bass") {

        frequency =
            70;

        duration =
            1.2;

    } else if (
        type === "left"
    ) {

        frequency =
            440;

        if (panner) {
            panner.pan.value = -1;
        }

    } else if (
        type === "right"
    ) {

        frequency =
            440;

        if (panner) {
            panner.pan.value = 1;
        }

    } else {

        frequency =
            440;

        if (panner) {
            panner.pan.value = 0;
        }
    }


    oscillator.type =
        "sine";


    oscillator.frequency.value =
        frequency;


    const now =
        context.currentTime;


    gain.gain.setValueAtTime(
        0.0001,
        now
    );


    gain.gain.exponentialRampToValueAtTime(
        0.25,
        now + .03
    );


    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration
    );


    oscillator.start(
        now
    );


    oscillator.stop(
        now + duration + .05
    );


    showToast(
        `${type.toUpperCase()} sound test playing`
    );
}


/* =========================================================
   DISPLAY TEST
========================================================= */

const displayButtons =
    document.querySelectorAll(
        ".display-buttons button"
    );


displayButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const color =
                button.dataset.color;


            const overlay =
                document.createElement(
                    "div"
                );


            overlay.id =
                "displayOverlay";


            overlay.style.position =
                "fixed";

            overlay.style.inset =
                "0";

            overlay.style.zIndex =
                "9999";

            overlay.style.background =
                color;


            overlay.style.cursor =
                "pointer";


            overlay.title =
                "Click to exit display test";


            overlay.addEventListener(
                "click",
                () => {

                    overlay.remove();

                }
            );


            document.body.appendChild(
                overlay
            );

        }
    );

});


$("fullscreenDisplay")
    .addEventListener(
        "click",
        async () => {

            const overlay =
                document.createElement(
                    "div"
                );


            overlay.id =
                "displayOverlay";


            overlay.style.position =
                "fixed";

            overlay.style.inset =
                "0";

            overlay.style.zIndex =
                "9999";

            overlay.style.background =
                "#000";


            overlay.style.cursor =
                "pointer";


            overlay.addEventListener(
                "click",
                async () => {

                    overlay.remove();

                    if (
                        document.fullscreenElement
                    ) {

                        await document
                            .exitFullscreen()
                            .catch(() => {});

                    }

                }
            );


            document.body.appendChild(
                overlay
            );


            try {

                await overlay.requestFullscreen();

            } catch (error) {

                /*
                    Fullscreen permission can be denied.
                    The color overlay still works.
                */

                console.warn(
                    error
                );
            }

        }
    );


/* =========================================================
   NETWORK
========================================================= */

function updateNetworkInfo() {

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;


    $("networkOnline").textContent =
        navigator.onLine
            ? "ONLINE"
            : "OFFLINE";


    if (!connection) {

        $("connectionType").textContent =
            "Unavailable";

        $("downlink").textContent =
            "Unavailable";

        $("effectiveType").textContent =
            "Unavailable";

        $("networkRtt").textContent =
            "Unavailable";

        return;
    }


    $("connectionType").textContent =
        connection.type ||
        "Browser detected";


    $("downlink").textContent =
        Number.isFinite(
            connection.downlink
        )
            ? `${connection.downlink} Mbps`
            : "Unavailable";


    $("effectiveType").textContent =
        connection.effectiveType ||
        "Unavailable";


    $("networkRtt").textContent =
        Number.isFinite(
            connection.rtt
        )
            ? `${connection.rtt} ms`
            : "Unavailable";
}


$("speedRefresh")
    .addEventListener(
        "click",
        () => {

            updateNetworkInfo();

            showToast(
                "Network information updated."
            );

        }
    );


window.addEventListener(
    "online",
    updateNetworkInfo
);


window.addEventListener(
    "offline",
    updateNetworkInfo
);


/* =========================================================
   USB / PORT DETECTION
========================================================= */

async function detectUSB() {

    if (
        !("usb" in navigator)
    ) {

        $("usbStatus").textContent =
            "WebUSB is not supported in this browser.";


        showToast(
            "WebUSB is not supported."
        );

        return;
    }


    try {

        /*
            getDevices() returns devices that this
            website has previously been granted permission
            to access.
        */

        const devices =
            await navigator.usb.getDevices();


        if (
            devices.length === 0
        ) {

            $("usbStatus").textContent =
                "No previously authorized USB devices found. Click the button again and choose a compatible USB device when prompted.";


            /*
                requestDevice requires a user gesture,
                which this button provides.
            */

            const device =
                await navigator.usb.requestDevice({
                    filters: []
                });


            if (device) {

                renderUSBDevices(
                    [device]
                );
            }

            return;
        }


        renderUSBDevices(
            devices
        );


    } catch (error) {

        console.warn(
            error
        );


        if (
            error.name ===
            "NotFoundError"
        ) {

            $("usbStatus").textContent =
                "USB selection was cancelled.";

        } else {

            $("usbStatus").textContent =
                "USB device access was not granted.";
        }
    }
}


function renderUSBDevices(
    devices
) {

    $("usbStatus").textContent =
        `${devices.length} authorized USB device(s) detected.`;


    const list =
        $("portsList");


    list.innerHTML =
        "";


    devices.forEach(
        (device, index) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "port-item";


            const name =
                document.createElement(
                    "strong"
                );


            name.textContent =
                device.productName ||
                `USB Device ${index + 1}`;


            const information =
                document.createElement(
                    "span"
                );


            information.textContent =
                `Vendor ID: ${
                    device.vendorId
                } • Product ID: ${
                    device.productId
                }`;


            item.appendChild(
                name
            );


            item.appendChild(
                information
            );


            list.appendChild(
                item
            );

        }
    );
}


$("usbButton")
    .addEventListener(
        "click",
        detectUSB
    );


/* =========================================================
   CAMERA EVENTS
========================================================= */

$("startCamera")
    .addEventListener(
        "click",
        startCamera
    );


$("capturePhoto")
    .addEventListener(
        "click",
        capturePhoto
    );


$("stopCamera")
    .addEventListener(
        "click",
        () => {

            stopCamera();

            $("cameraStatus").textContent =
                "STOPPED";

            $("cameraStatus").style.color =
                "#667085";

            showToast(
                "Camera stopped."
            );

        }
    );


/* =========================================================
   MICROPHONE EVENTS
========================================================= */

$("startMic")
    .addEventListener(
        "click",
        startMicrophone
    );


$("startRecording")
    .addEventListener(
        "click",
        startRecording
    );


$("stopRecording")
    .addEventListener(
        "click",
        stopRecording
    );


/* =========================================================
   SOUND EVENTS
========================================================= */

document
    .querySelectorAll(
        ".sound-button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                playSound(
                    button.dataset.sound
                );

            }
        );

    });


/* =========================================================
   REFRESH
========================================================= */

function updateAll() {

    updateSystemInfo();

    updateBattery();

    updateNetworkInfo();


    $("updatedText").textContent =
        `Updated ${new Date().toLocaleTimeString()}`;


    /*
        Simple browser diagnostic score.

        This is NOT hardware health.
        It only represents whether the browser
        environment is available for testing.
    */

    let score = 100;


    if (!navigator.onLine) {
        score -= 5;
    }

    if (!navigator.mediaDevices) {
        score -= 15;
    }

    if (!navigator.hardwareConcurrency) {
        score -= 5;
    }


    $("healthScore").textContent =
        Math.max(
            0,
            score
        );
}


$("refreshButton")
    .addEventListener(
        "click",
        () => {

            updateAll();

            showToast(
                "Machine information refreshed."
            );

        }
    );


/*
    IMPORTANT:

    Do NOT reload the entire page every few seconds.

    A complete reload can interrupt:
    - camera permission
    - microphone permission
    - recording
    - active tests
    - fullscreen display testing

    Instead, update the information in place.
*/

setInterval(
    updateAll,
    3000
);


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateAll();

    }
);
