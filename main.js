let countdown;
let totalSeconds = 0;
let remainingSeconds = 0;
let isPaused = false;

const display = document.getElementById('display');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const liquidMask = document.getElementById('liquid-mask');
const loopToggle = document.getElementById('loopToggle');

const hInput = document.getElementById('hrs');
const mInput = document.getElementById('mins');
const sInput = document.getElementById('secs');

function updateDisplay(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    display.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Update Coffee Level
    // The mask y starts at 30 (full) and ends at 92 (empty)
    // Height is 62
    const percentage = totalSeconds > 0 ? (remainingSeconds / totalSeconds) : 0;
    const maskHeight = 62 * percentage;
    const maskY = 92 - maskHeight;
    
    liquidMask.setAttribute('y', maskY);
    liquidMask.setAttribute('height', maskHeight);
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
