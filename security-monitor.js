/**
 * STA STUDENT PORTAL - SHARED APPLICATION STATE
 */
var currentQuestions = window.currentQuestions = window.currentQuestions || [];
var currentQuestionIndex = window.currentQuestionIndex = window.currentQuestionIndex || 0;
var userAnswers = window.userAnswers = window.userAnswers || [];
var timeLeft = window.timeLeft = window.timeLeft || 5400; // 90 mins
var timerInterval = window.timerInterval = window.timerInterval || null;
var violationCount = window.violationCount = window.violationCount || 0;
var lastViolationTime = window.lastViolationTime = window.lastViolationTime || 0;
var isShowingConfirmDialog = window.isShowingConfirmDialog = window.isShowingConfirmDialog || false;
var isSubmitting = window.isSubmitting = window.isSubmitting || false;

var assignedExamData = window.assignedExamData = window.assignedExamData || null;
var homeworkData = window.homeworkData = window.homeworkData || null;
var hasExam = window.hasExam = window.hasExam || false;
var hasHomework = window.hasHomework = window.hasHomework || false;
var examActive = window.examActive = window.examActive || false;
var activeExamId = window.activeExamId = window.activeExamId || null;
var activeHomeworkId = window.activeHomeworkId = window.activeHomeworkId || null;

var hwQuestions = window.hwQuestions = window.hwQuestions || [];
var hwCurrentIndex = window.hwCurrentIndex = window.hwCurrentIndex || 0;
var hwAnswers = window.hwAnswers = window.hwAnswers || [];
var hwDocId = window.hwDocId = window.hwDocId || '';
var hwDocTitle = window.hwDocTitle = window.hwDocTitle || '';
var hwDuration = window.hwDuration = window.hwDuration || 90;
var hwTimeLeft = window.hwTimeLeft = window.hwTimeLeft || 5400;
var hwTimerInterval = window.hwTimerInterval = window.hwTimerInterval || null;


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
        playTone(0, 880, 0.18);
        playTone(0.25, 880, 0.18);
        playTone(0.50, 1046, 0.35);
    } catch (e) {
        console.log("AudioContext beep play error:", e);
    }
}
window.playTimerBeepSound = playTimerBeepSound;

function isTestOrAssignmentActive() {
    const qSec = document.getElementById('question-section');
    const hwSec = document.getElementById('homework-section');
    const isExamActive = qSec && qSec.style.display === 'block';
    const isHomeworkActive = hwSec && hwSec.style.display === 'block';
    return { isExamActive, isHomeworkActive, isActive: isExamActive || isHomeworkActive };
}

function handleViolation() {
    if (isShowingConfirmDialog) return; // Ignore if browser confirm dialog is open
    const now = Date.now();
    if (now - lastViolationTime < 600) return; // debounce: ignore if fired within 600ms
    lastViolationTime = now;

    const { isExamActive, isHomeworkActive, isActive } = isTestOrAssignmentActive();

    if (!isActive) return;

    violationCount++;

    const itemType = isHomeworkActive ? "Assignment / Homework" : "Exam";

    if (violationCount === 1) {
        alert(`⚠️ WARNING: Do not leave the ${itemType} window! Your first violation has been recorded.`);
    } else if (violationCount >= 2) {
        alert(`❌ ${itemType.toUpperCase()} TERMINATED: Multiple focus violations detected. Your ${itemType} is being auto-submitted.`);
        if (isExamActive) {
            calculateFinalScore();
        } else if (isHomeworkActive) {
            submitHomework();
        }
    }
}

// Trigger 1: Tab hidden (minimized, tab switch, etc.)
document.addEventListener("visibilitychange", function () {
    if (document.hidden) handleViolation();
});

// Trigger 2: Window lost focus (alt+tab, click on another app/window)
window.addEventListener("blur", function () {
    handleViolation();
});

// Trigger 3: Disable Right-Click Context Menu during Exam / Assignment
document.addEventListener("contextmenu", function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
        alert("⚠️ Right click is disabled during Exam / Assignment!");
    }
});

// Trigger 4: Disable Copy, Cut & Paste during Exam / Assignment
document.addEventListener("copy", function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
        alert("⚠️ Copying is strictly disabled during Exam / Assignment!");
    }
});

document.addEventListener("cut", function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
    }
});

document.addEventListener("paste", function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (isActive) {
        e.preventDefault();
    }
});

// Trigger 5: Disable PrintScreen & Screenshot Keyboard Shortcuts
document.addEventListener("keydown", function (e) {
    const { isActive } = isTestOrAssignmentActive();
    if (!isActive) return;

    // Block PrintScreen key
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(""); // Clear clipboard content
        }
        alert("⚠️ Screenshots are strictly prohibited during Exam / Assignment!");
        handleViolation();
        return;
    }

    // Block Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+P, Ctrl+S, Win+Shift+S
    if (e.ctrlKey || e.metaKey) {
        const key = e.key ? e.key.toLowerCase() : '';
        if (['c', 'v', 'u', 'p', 's', 'a', 'x'].includes(key)) {
            e.preventDefault();
            alert("⚠️ Keyboard shortcuts are disabled during Exam / Assignment!");
        }
    }

    // Block F12 (Developer tools)
    if (e.key === 'F12') {
        e.preventDefault();
    }
});

// Remote Reset Timing Control
const pageLoadTime = Date.now();
let userResetListenerActive = false;

function handleResetSignal(firebaseTimestamp, type) {
    const localTimestamp = parseInt(localStorage.getItem("lastResetTimestamp") || "0");
    // Only reload if the reset signal is NEW (occurred after this page session started)
    if (firebaseTimestamp > localTimestamp && firebaseTimestamp > pageLoadTime) {
        localStorage.clear();
        localStorage.setItem("lastResetTimestamp", firebaseTimestamp.toString());
        location.reload();
    }
}

function listenForAdminResets() {
    if (typeof database !== 'undefined') {
        database.ref('account_resets/global').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.timestamp) {
                handleResetSignal(data.timestamp, "Global Reset");
            }
        });

        checkAndStartUserListener();
        setInterval(checkAndStartUserListener, 2000);
    }
}

function checkAndStartUserListener() {
    if (userResetListenerActive) return;
    const currentStudent = localStorage.getItem("currentStudent");
    const currentTC = localStorage.getItem("currentTC");
    if (currentStudent && typeof database !== 'undefined') {
        // Sanitize name (spaces + special chars) to match what admin writes
        const safeName = currentStudent.replace(/[.#$[\]\s]/g, '_');
        // Listen on safeName format (primary — matches admin reset)
        database.ref('account_resets/users/' + safeName).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.timestamp) handleResetSignal(data.timestamp, "User Reset (name)");
        });
        // Also listen on safeUid (name_TC) format as secondary
        if (currentTC) {
            const safeUid = safeName + '_' + currentTC;
            database.ref('account_resets/users/' + safeUid).on('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.timestamp) handleResetSignal(data.timestamp, "User Reset (uid)");
            });
        }
        userResetListenerActive = true;
    }
}

// Initialize listener
listenForAdminResets();

// ===============================
// 📚 HOMEWORK SYSTEM
// ===============================

let hwQuestions = [];
let hwCurrentIndex = 0;
let hwAnswers = [];
let hwDocId = '';
let hwDocTitle = '';
let hwDuration = 90;
