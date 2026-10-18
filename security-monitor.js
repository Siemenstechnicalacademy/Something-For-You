/**
 * ==============================================================================
 * STA STUDENT PORTAL - SECURITY, ANTI-CHEAT & REMOTE RESET MONITOR
 * ==============================================================================
 * Handles:
 * 1. Focus lost (Tab switch / blur / window minimize) detection.
 * 2. Strict anti-cheat: Disabling Right-Click, Copy/Cut/Paste, PrintScreen & dev shortcuts.
 * 3. Remote live admin reset listener (instant forced reload upon Admin signal).
 * 4. Warning beep sound synthesized via Web Audio API.
 */

var violationCount = 0;
var lastViolationTime = 0;
var isShowingConfirmDialog = false;

// Audio warning beep using standard Web Audio API
function playTimerBeepSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const playTone = (delay, freq, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + duration);
        };

        // Play 3 crisp warning beeps
        playTone(0, 880, 0.18);
        playTone(0.25, 880, 0.18);
        playTone(0.50, 1046, 0.35);
    } catch (e) {
        console.log(AudioContext beep play error:, e);
    }
}

// Check if an Exam or Homework session is currently displayed on screen
function isTestOrAssignmentActive() {
    const qSec = document.getElementById('question-section');
    const hwSec = document.getElementById('homework-section');
    const isExamActive = qSec && qSec.style.display === 'block';
    const isHomeworkActive = hwSec && hwSec.style.display === 'block';
    return { isExamActive, isHomeworkActive, isActive: isExamActive || isHomeworkActive };
}

// Handle anti-cheat violations
function handleViolation() {
    if (isShowingConfirmDialog) return; // Ignore if browser confirm dialog is open
    const now = Date.now();
    if (now - lastViolationTime < 600) return; // Debounce 600ms
    lastViolationTime = now;

    const { isExamActive, isHomeworkActive, isActive } = isTestOrAssignmentActive();
    if (!isActive) return;

    violationCount++;
    const itemType = isHomeworkActive ? Assignment / Homework : Exam;

    if (violationCount === 1) {
        alert(?? WARNING: Do not leave the  window! Your first violation has been recorded.);
    } else if (violationCount >= 2) {
        alert(?  TERMINATED: Multiple focus violations detected. Your  is being auto-submitted.);
        if (isExamActive && typeof calculateFinalScore === 'function') {
            calculateFinalScore();
        } else if (isHomeworkActive && typeof submitHomework === 'function') {
            submitHomework();
        }
    }
}

// 1. Tab switch / Minimized
document.addEventListener(visibilitychange, function () {
    if (document.hidden) handleViolation();
});

// 2. Window lost focus (Alt+Tab, clicking outside window)
window.addEventListener(blur, function () {
    handleViolation();
});

// 3. Disable Right-Click Context Menu during active test
document.addEventListener(contextmenu, function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
        alert(?? Right click is disabled during Exam / Assignment!);
    }
});

// 4. Disable Copy, Cut & Paste
document.addEventListener(copy, function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
        alert(?? Copying is strictly disabled during Exam / Assignment!);
    }
});

document.addEventListener(cut, function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
    }
});

document.addEventListener(paste, function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
    }
});

// 5. Block Screenshot & Dev Shortcuts
document.addEventListener(keydown, function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (!isActive) return;

    // Block PrintScreen key
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("); // Clear clipboard content
 }
 alert(?? Screenshots are strictly prohibited during Exam / Assignment!);
 handleViolation();
 return;
 }

 // Block Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, Ctrl+S, Ctrl+A, Ctrl+X
 if (e.ctrlKey || e.metaKey) {
 const key = e.key ? e.key.toLowerCase() : '';
 if (['c', 'v', 'u', 'p', 's', 'a', 'x'].includes(key)) {
 e.preventDefault();
 alert(?? Keyboard shortcuts are disabled during Exam / Assignment!);
 }
 }

 // Block F12 (Developer tools)
 if (e.key === 'F12') {
 e.preventDefault();
 }
});

// ==============================================================================
// REMOTE RESET SIGNAL LISTENER
// ==============================================================================
const pageLoadTime = Date.now();
let userResetListenerActive = false;

function handleResetSignal(firebaseTimestamp, type) {
 const localTimestamp = parseInt(localStorage.getItem(lastResetTimestamp) || 0);
 if (firebaseTimestamp > localTimestamp && firebaseTimestamp > pageLoadTime) {
 localStorage.clear();
 localStorage.setItem(lastResetTimestamp, firebaseTimestamp.toString());
 location.reload();
 }
}

function listenForAdminResets() {
 if (typeof database !== 'undefined') {
 database.ref('account_resets/global').on('value', (snapshot) => {
 const data = snapshot.val();
 if (data && data.timestamp) {
 handleResetSignal(data.timestamp, Global Reset);
 }
 });

 checkAndStartUserListener();
 setInterval(checkAndStartUserListener, 2000);
 }
}

function checkAndStartUserListener() {
 if (userResetListenerActive) return;
 const currentStudent = localStorage.getItem(currentStudent);
 const currentTC = localStorage.getItem(currentTC);
 if (currentStudent && typeof database !== 'undefined') {
 const safeName = currentStudent.replace(/[.#$[\]\s]/g, '_');
 database.ref('account_resets/users/' + safeName).on('value', (snapshot) => {
 const data = snapshot.val();
 if (data && data.timestamp) handleResetSignal(data.timestamp, User Reset (name));
 });
 if (currentTC) {
 const safeUid = safeName + '_' + currentTC;
 database.ref('account_resets/users/' + safeUid).on('value', (snapshot) => {
 const data = snapshot.val();
 if (data && data.timestamp) handleResetSignal(data.timestamp, User Reset (uid));
 });
 }
 userResetListenerActive = true;
 }
}

// Start reset listeners immediately
listenForAdminResets();
