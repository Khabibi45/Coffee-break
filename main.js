let countdown;
let totalSeconds = 0;
let remainingSeconds = 0;
let isPaused = false;

const display = document.getElementById('display');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const loopToggle = document.getElementById('loopToggle');
const hInput = document.getElementById('hrs');
const mInput = document.getElementById('mins');
const sInput = document.getElementById('secs');

// Three.js Setup
const canvas = document.getElementById('point-cloud-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
camera.position.z = 600; // Moved back to fit larger cup

let points;
let particleCount = 100000; // Increased density
let positions = new Float32Array(particleCount * 3);
let colors = new Float32Array(particleCount * 3);
let originalY = new Float32Array(particleCount);
let particleVelocities = new Float32Array(particleCount); // For "mouvant" effect
let isImageLoaded = false;

// Load Image and Sample Pixels
const img = new Image();
img.src = 'coffee_bw.png';
img.onload = () => {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = 200;
    tempCanvas.height = 300;
    ctx.drawImage(img, 0, 0, 200, 300);
    const imgData = ctx.getImageData(0, 0, 200, 300).data;

    let pIdx = 0;
    for (let i = 0; i < particleCount; i++) {
        let x, y, val;
        do {
            x = Math.floor(Math.random() * 200);
            y = Math.floor(Math.random() * 300);
            const idx = (y * 200 + x) * 4;
            val = imgData[idx];
        } while (val > 240 && Math.random() < 0.99); // Higher threshold for BW

        // Scale by 3x (was 0.8, now 2.4)
        positions[pIdx] = (x - 100) * 2.4;
        positions[pIdx + 1] = (150 - y) * 2.4;
        positions[pIdx + 2] = (Math.random() - 0.5) * 30; // More depth

        originalY[i] = positions[pIdx + 1];
        particleVelocities[i] = Math.random() * 0.05 + 0.01;

        const c = val / 255;
        colors[pIdx] = c;
        colors[pIdx + 1] = c; // Grayscale for BW image
        colors[pIdx + 2] = c;

        pIdx += 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
    isImageLoaded = true;
};

function animate() {
    requestAnimationFrame(animate);

    if (isImageLoaded && points) {
        const time = Date.now() * 0.001;

        // Scene animation
        points.position.y = Math.sin(time * 0.8) * 10;
        points.rotation.y = Math.sin(time * 0.3) * 0.15;
        points.rotation.x = Math.cos(time * 0.2) * 0.05;

        const percentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) : 0;

        // Unified Emptying + "Mouvant" logic
        // Approximate Y range for the cup is from bottom to top (~ -360 to +360 after 2.4x scale)
        const bottomY = -360;
        const topY = 360;
        const rangeY = topY - bottomY;
        const thresholdY = bottomY + (rangeY * percentage);

        const posAttr = points.geometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
            // "Mouvant" vibration effect for all particles
            posAttr.array[i * 3 + 2] += Math.sin(time * 5 + i) * 0.1;

            if (originalY[i] > thresholdY) {
                // Falling effect
                if (posAttr.array[i * 3 + 1] > -500) {
                    posAttr.array[i * 3 + 1] -= (2 + Math.random() * 3);
                    // Fade out color as they fall
                    // points.geometry.attributes.color.array[i*3] *= 0.99;
                }
            } else {
                // Return to original or move slightly
                const targetY = originalY[i] + Math.sin(time * 2 + i) * 2;
                posAttr.array[i * 3 + 1] += (targetY - posAttr.array[i * 3 + 1]) * 0.1;

                // Keep X and Y returns
                posAttr.array[i * 3] += Math.cos(time + i) * 0.05;
            }
        }
        posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

function resize() {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();
animate();

// Timer Logic
function updateDisplay(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    display.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startTimer() {
    if (!isPaused) {
        const h = parseInt(hInput.value) || 0;
        const m = parseInt(mInput.value) || 0;
        const s = parseInt(sInput.value) || 0;
        totalSeconds = h * 3600 + m * 60 + s;
        remainingSeconds = totalSeconds;
    }
    if (remainingSeconds <= 0) return;

    clearInterval(countdown);
    isPaused = false;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    stopBtn.textContent = "Arrêter";
    startBtn.textContent = "Reprendre";

    countdown = setInterval(() => {
        remainingSeconds--;
        updateDisplay(remainingSeconds);
        if (remainingSeconds <= 0) {
            clearInterval(countdown);
            handleFinish();
        }
    }, 1000);
}

function handleFinish() {
    if (loopToggle.checked) {
        setTimeout(() => {
            resetTimer();
            startTimer();
        }, 1000);
    } else {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        startBtn.textContent = "Lancer";
        isPaused = false;
    }
}

function pauseTimer() {
    clearInterval(countdown);
    isPaused = true;
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

function resetTimer() {
    clearInterval(countdown);
    isPaused = false;
    const h = parseInt(hInput.value) || 0;
    const m = parseInt(mInput.value) || 0;
    const s = parseInt(sInput.value) || 0;
    totalSeconds = h * 3600 + m * 60 + s;
    remainingSeconds = totalSeconds;
    updateDisplay(remainingSeconds);
    startBtn.disabled = false;
    startBtn.textContent = "Lancer";
    stopBtn.disabled = true;
    stopBtn.textContent = "Arrêter";
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Initial display
updateDisplay(parseInt(mInput.value) * 60 || 600);
