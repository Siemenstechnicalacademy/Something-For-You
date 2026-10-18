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

let hwTimeLeft = 5400;
let hwTimerInterval = null;

function getValidHwDuration(data) {
    if (!data) return 90;
    let d = (data.duration !== undefined && data.duration !== null) ? data.duration : data.examDuration;
    if (d !== undefined && d !== null && d !== '') {
        let parsed = parseInt(d, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 90;
}

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
        console.log("AudioContext beep play error:", e);
    }
}

function updateHwTimer() {
    const timerDisplay = document.getElementById('hw-timer-display');
    const timerBadge = document.getElementById('hw-timer-badge');

    if (isNaN(hwTimeLeft) || hwTimeLeft === undefined || hwTimeLeft === null) {
        hwDuration = 90;
        hwTimeLeft = hwDuration * 60;
    }

    if (hwTimeLeft <= 0) {
        if (hwTimerInterval) clearInterval(hwTimerInterval);
        if (timerDisplay) timerDisplay.innerText = "00:00";
        if (timerBadge) {
            timerBadge.classList.remove('hw-timer-blinking');
            timerBadge.style.background = '#fee2e2';
            timerBadge.style.color = '#dc2626';
            timerBadge.style.border = '2px solid #dc2626';
        }
        playTimerBeepSound();
        return;
    }

    const minutes = Math.floor(hwTimeLeft / 60);
    const seconds = hwTimeLeft % 60;
    const formattedMin = minutes < 10 ? '0' + minutes : minutes;
    const formattedSec = seconds < 10 ? '0' + seconds : seconds;

    if (timerDisplay) {
        timerDisplay.innerText = `${formattedMin}:${formattedSec}`;
    }

    // 5 Minutes (300 Seconds) Warning: Continuous Blinking Indication
    if (hwTimeLeft <= 300) {
        if (timerBadge && !timerBadge.classList.contains('hw-timer-blinking')) {
            timerBadge.classList.add('hw-timer-blinking');
        }
    } else {
        if (timerBadge && timerBadge.classList.contains('hw-timer-blinking')) {
            timerBadge.classList.remove('hw-timer-blinking');
        }
    }

    hwTimeLeft--;
}

async function checkForHomework(batch) {
    try {
        const snap = await firestoreDb.collection('ActiveAssignments')
            .where('active', '==', true)
            .get();

        let found = null;
        snap.forEach(doc => {
            const data = doc.data();
            // Match if batch string starts with the student's batch (e.g. "61st Batch" contains "61st")
            if (data.batch && data.batch.includes(batch)) {
                found = { id: doc.id, ...data };
            }
        });

        if (found && Array.isArray(found.questions) && found.questions.length > 0) {
            hwDocId = found.id;
            hwDocTitle = found.title || 'Homework Assignment';
            hwDuration = parseInt(found.duration || found.examDuration || 90, 10);
            const studentName = localStorage.getItem('currentStudent') || 'Student';
            const tcNumber = localStorage.getItem('currentTC') || '';
            const hwSeedKey = studentName + '_' + tcNumber + '_' + (hwDocId || 'hw');
            hwQuestions = shuffleExamQuestionsAndOptions(found.questions, hwSeedKey);
            // Show the homework button
            const container = document.getElementById('homework-btn-container');
            if (container) container.style.display = 'block';
        }
    } catch (err) {
        console.error('Homework check error:', err);
    }
}

function openHomework() {
    if (hwQuestions.length === 0) {
        alert('No homework available right now.');
        return;
    }
    violationCount = 0;

    hwCurrentIndex = 0;
    hwAnswers = new Array(hwQuestions.length).fill(null);

    // Hide instruction section, show homework section
    document.getElementById('instruction-section').style.display = 'none';
    document.getElementById('homework-section').style.display = 'block';

    document.getElementById('hw-title').innerText = hwDocTitle;
    document.getElementById('hw-total-label').innerText = `of ${hwQuestions.length} questions`;

    // Always fetch valid duration from homeworkData or active doc
    let targetDuration = 90;
    if (typeof homeworkData !== 'undefined' && homeworkData) {
        targetDuration = getValidHwDuration(homeworkData);
    } else if (typeof hwDuration !== 'undefined' && hwDuration > 0) {
        targetDuration = hwDuration;
    }

    hwDuration = targetDuration;
    hwTimeLeft = hwDuration * 60;

    if (hwTimerInterval) clearInterval(hwTimerInterval);
    updateHwTimer();
    hwTimerInterval = setInterval(updateHwTimer, 1000);

    hwLoadQuestion();
}

function hwLoadQuestion() {
    const q = hwQuestions[hwCurrentIndex];
    if (!q) return;

    const qText = q.q || q.question || q.questionText || '';
    document.getElementById('hw-question-text').innerText = qText;
    document.getElementById('hw-question-counter').innerText = `Q${hwCurrentIndex + 1}`;
    document.getElementById('hw-progress').style.width = ((hwCurrentIndex + 1) / hwQuestions.length * 100) + '%';

    const container = document.getElementById('hw-options-container');
    container.innerHTML = '';

    const options = Array.isArray(q.options) ? q.options : [];
    options.forEach(opt => {
        const isChecked = hwAnswers[hwCurrentIndex] === opt;
        const lbl = document.createElement('label');
        lbl.className = 'option-label';
        lbl.style.cssText = isChecked ? 'background:#eef2ff; border-color:#6366f1;' : '';
        lbl.innerHTML = `
            <input type="radio" name="hw-opt" value="${opt.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''} style="accent-color:#6366f1; width:18px; height:18px; flex-shrink:0;">
            ${opt}
        `;
        lbl.onclick = () => {
            hwAnswers[hwCurrentIndex] = opt;
            // Update styles
            container.querySelectorAll('.option-label').forEach(l => {
                l.style.background = '';
                l.style.borderColor = '';
            });
            lbl.style.background = '#eef2ff';
            lbl.style.borderColor = '#6366f1';
        };
        container.appendChild(lbl);
    });

    document.getElementById('hw-prev-btn').style.visibility = hwCurrentIndex === 0 ? 'hidden' : 'visible';
    const nextBtn = document.getElementById('hw-next-btn');
    nextBtn.innerText = hwCurrentIndex === hwQuestions.length - 1 ? 'SUBMIT' : 'NEXT';
    nextBtn.style.background = hwCurrentIndex === hwQuestions.length - 1 ? '#10b981' : '#6366f1';
}

function hwNext() {
    if (hwCurrentIndex < hwQuestions.length - 1) {
        hwCurrentIndex++;
        hwLoadQuestion();
    } else {
        // Last question — submit
        const unanswered = hwAnswers.filter(a => a === null).length;
        const msg = unanswered > 0
            ? `You have ${unanswered} unanswered question(s). Submit anyway?`
            : 'Submit your homework now?';
        safeConfirmSubmit(msg, function() {
            submitHomework();
        });
    }
}

function hwPrev() {
    if (hwCurrentIndex > 0) {
        hwCurrentIndex--;
        hwLoadQuestion();
    }
}

async function submitHomework() {
    if (hwTimerInterval) clearInterval(hwTimerInterval);
    let score = 0;
    const details = hwQuestions.map((q, i) => {
        const correct = q.answer || q.correctAnswer || q.correctOption || '';
        const isCorrect = hwAnswers[i] === correct;
        if (isCorrect) score++;
        return {
            question: q.q || q.question || q.questionText || '',
            userAnswer: hwAnswers[i] || 'Not Answered',
            correctAnswer: correct,
            correct: isCorrect
        };
    });

    const studentName = localStorage.getItem('currentStudent') || 'Unknown';
    const batch = localStorage.getItem('currentBatch') || '61st';
    const division = localStorage.getItem('currentDivision') || 'N/A';
    const tcNumber = localStorage.getItem('currentTC') || '';
    const percent = Math.round((score / hwQuestions.length) * 100);

    // Save to Firestore
    try {
        await firestoreDb.collection('HomeworkResults').add({
            name: studentName,
            tcNumber: tcNumber,
            batch: batch,
            division: division,
            homeworkId: hwDocId,
            homeworkTitle: hwDocTitle,
            score: score,
            total: hwQuestions.length,
            percentage: percent,
            details: details,
            submittedAt: new Date().toLocaleString(),
            violations: violationCount
        });
    } catch (err) {
        console.error('Homework submit error:', err);
    }

    // Show result
    document.getElementById('homework-section').style.display = 'none';
    document.getElementById('homework-result-section').style.display = 'block';
    document.getElementById('hw-final-score').innerText = `${score}/${hwQuestions.length}`;
    document.getElementById('hw-percent').innerText = `Score: ${percent}%`;

    // Set PASSED / FAILED status
    const hwStatus = document.getElementById('hw-status');
    if (hwStatus) {
        if (percent >= 70) {
            hwStatus.innerText = '✅ PASSED';
            hwStatus.style.color = '#28a745';
        } else {
            hwStatus.innerText = '❌ FAILED';
            hwStatus.style.color = '#d9534f';
        }
    }

    // Build question-wise detail breakdown removed to prevent students from seeing/sharing correct answers.
    document.getElementById('hw-result-detail').innerHTML = '';
}

