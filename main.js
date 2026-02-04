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
camera.position.z = 600;

let points;
let particleCount = 0; // Will be determined by edges
let positions;
let colors;
let originalY;
let particleVelocities;
let particleRandoms; // For organic movement
let isImageLoaded = false;

// Edge Detection Configuration
const EDGE_THRESHOLD = 30; // Threshold for edge detection sensitivity
const FILL_DENSITY = 0.05; // Probability of keeping a non-edge pixel (5%)

// Load Image and Process
const img = new Image();
img.src = 'coffee_bw.png';
img.onload = () => {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    const w = 200;
    const h = 300;
    tempCanvas.width = w;
    tempCanvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Identify Edges
    const edges = [];
    const fill = [];

    // Helper to get brightness
    const getB = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return 255; // Out of bounds is white
        const i = (y * w + x) * 4;
        return (data[i] + data[i + 1] + data[i + 2]) / 3;
    };

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

            // Simple Sobel-like check
            const gx = getB(x - 1, y) - getB(x + 1, y);
            const gy = getB(x, y - 1) - getB(x, y + 1);
            const magnitude = Math.sqrt(gx * gx + gy * gy);

            // Dark pixels are matter.
            // If it's an edge (high magnitude), we keep it.
            // If it's dark but not edge (fill), we keep it with low prob.

            // Invert logic for "dark drawing on white paper":
            // We want to draw DARK things.
            if (brightness < 240) {
                if (magnitude > EDGE_THRESHOLD) {
                    edges.push({ x, y, c: brightness / 255 });
                } else if (Math.random() < FILL_DENSITY) {
                    fill.push({ x, y, c: brightness / 255 });
                }
            }
        }
    }

    // Combine
    const allParticles = [...edges, ...fill];
    particleCount = allParticles.length;

    positions = new Float32Array(particleCount * 3);
    colors = new Float32Array(particleCount * 3);
    originalY = new Float32Array(particleCount);
    particleVelocities = new Float32Array(particleCount);
    particleRandoms = new Float32Array(particleCount);

    const scale = 2.4;

    for (let i = 0; i < particleCount; i++) {
        const p = allParticles[i];

        // Centering offset: w/2=100, h/2=150
        const px = (p.x - 100) * scale;
        const py = (150 - p.y) * scale;
        // Z-depth: Edges pop out slightly more than fill
        const pz = (Math.random() - 0.5) * 10;

        positions[i * 3] = px;
        positions[i * 3 + 1] = py;
        positions[i * 3 + 2] = pz;

        originalY[i] = py;
        particleVelocities[i] = Math.random() * 0.05 + 0.01;
        particleRandoms[i] = Math.random() * Math.PI * 2;

        // Color: Pure black/grey scale
        const c = p.c;
        colors[i * 3] = c;
        colors[i * 3 + 1] = c;
        colors[i * 3 + 2] = c;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
    isImageLoaded = true;
};

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    if (isImageLoaded && points) {
        const time = Date.now() * 0.001;
        const dt = clock.getDelta();

        // --- 1. Global Scene Movement (Float/Bounce) ---
        points.rotation.y = Math.sin(time * 0.2) * 0.1; // Gentle rotation
        points.position.y = Math.sin(time * 0.5) * 5; // Gentle float home

        // --- 2. Emptying Logic ---
        const percentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) : 0;
        // Cup approx bounds (scaled)
        const bottomY = -340;
        const topY = 340;
        const rangeY = topY - bottomY;
        const thresholdY = bottomY + (rangeY * percentage);

        const posAttr = points.geometry.attributes.position;
        const positions = posAttr.array;

        for (let i = 0; i < particleCount; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            // --- 3. Organic "Mouvant" Effect ---
            // Each pixel breathes slightly in Z and X/Y based on noise-like math
            const rnd = particleRandoms[i];
            const wave = Math.sin(time * 3 + rnd + positions[iy] * 0.01);

            // Micro-vibration
            positions[iz] += wave * 0.05;

            // Logic: Is this particle above the liquid line?
            // Note: Since this is an outline, we "empty" it by making the top parts dissolve/fall

            if (originalY[i] > thresholdY) {
                // --- FALLING STATE ---
                // If above threshold, it should fall
                if (positions[iy] > -550) {
                    // Falls down
                    positions[iy] -= (2 + Math.random() * 4);
                    // Drifts slightly X/Z like dust
                    positions[ix] += Math.sin(time * 10 + rnd) * 0.5;
                    positions[iz] += Math.cos(time * 10 + rnd) * 0.5;
                } else {
                    // Recycle or hold at bottom
                    // positions[iy] = -550; 
                }
            } else {
                // --- STABLE STATE (with organic move) ---
                // Return to original Y (spring force) if it was falling
                const targetY = originalY[i];
                if (Math.abs(positions[iy] - targetY) > 5) {
                    // Lerp back up quickly if reset
                    positions[iy] += (targetY - positions[iy]) * 0.1;
                } else {
                    // Just stick to organic movement around original
                    positions[iy] = targetY + Math.sin(time * 2 + rnd) * 1.5;
                }
            }
        }
        posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

function resize() {
    const parent = canvas.parentElement;
    if (parent) {
        renderer.setSize(parent.clientWidth, parent.clientHeight, false);
        camera.aspect = parent.clientWidth / parent.clientHeight;
        camera.updateProjectionMatrix();
    }
}

window.addEventListener('resize', resize);
resize();
animate();

// --- Timer Logic ---
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
