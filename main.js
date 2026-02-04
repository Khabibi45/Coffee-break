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
const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.z = 250;

let points;
let particleCount = 60000;
let positions = new Float32Array(particleCount * 3);
let colors = new Float32Array(particleCount * 3);
let originalY = new Float32Array(particleCount);
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
        // Keep sampling until we find a non-white pixel (simple threshold)
        do {
            x = Math.floor(Math.random() * 200);
            y = Math.floor(Math.random() * 300);
            const idx = (y * 200 + x) * 4;
            val = imgData[idx]; // Sample R channel
        } while (val > 240 && Math.random() < 0.98); // Reject white mostly

        positions[pIdx] = (x - 100) * 0.8;
        positions[pIdx + 1] = (150 - y) * 0.8;
        positions[pIdx + 2] = (Math.random() - 0.5) * 10;

        originalY[i] = positions[pIdx + 1];

        // Color based on brightness (closer to black = darker coffee/contour)
        const c = val / 255;
        colors[pIdx] = c;
        colors[pIdx + 1] = c * 0.8;
        colors[pIdx + 2] = c * 0.6;

        pIdx += 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
    isImageLoaded = true;
};

function animate() {
    requestAnimationFrame(animate);

    if (isImageLoaded && points) {
        const time = Date.now() * 0.001;

        // Bouncy effect
        points.position.y = Math.sin(time * 1.5) * 5;
        points.rotation.y = Math.sin(time * 0.5) * 0.1;

        // Emptying effect
        const percentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) : 0;
        // Map percentage to Y threshold (-120 to 120 approx)
        const thresholdY = -120 + (240 * percentage);

        const posAttr = points.geometry.attributes.position;
        for (let i = 0; i < particleCount; i++) {
            if (originalY[i] > thresholdY) {
                // Particle should "fall" or disappear
                // We'll make them fall down rapidly
                if (posAttr.array[i * 3 + 1] > -200) {
                    posAttr.array[i * 3 + 1] -= 2;
                }
            } else {
                // Reset to original if reset or enough time
                if (Math.abs(posAttr.array[i * 3 + 1] - originalY[i]) > 1) {
                    posAttr.array[i * 3 + 1] = originalY[i];
                }
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
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// Initial display
updateDisplay(parseInt(mInput.value) * 60);
