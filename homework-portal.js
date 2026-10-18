/**
 * ==============================================================================
 * STA STUDENT PORTAL - HOMEWORK & ASSIGNMENT RUNNER
 * ==============================================================================
 * Handles:
 * 1. Active homework assignment detection & timer management.
 * 2. Homework question rendering & navigation.
 * 3. Submission to Firestore HomeworkResults collection.
 * 4. Homework score and passed/failed status display.
 */

var hwQuestions = [];
var hwCurrentIndex = 0;
var hwAnswers = [];
var hwDocId = '';
var hwDocTitle = '';
var hwDuration = 90;
var hwTimeLeft = 5400;
var hwTimerInterval = null;

// Parse valid duration in minutes from assignment metadata
function getValidHwDuration(data) {
    if (!data) return 90;
    let d = (data.duration !== undefined && data.duration !== null) ? data.duration : data.examDuration;
    if (d !== undefined && d !== null && d !== '') {
        let parsed = parseInt(d, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 90;
}

// Countdown timer for homework session
function updateHwTimer() {
    const timerDisplay = document.getElementById('hw-timer-display');
    const timerBadge = document.getElementById('hw-timer-badge');

    if (isNaN(hwTimeLeft) || hwTimeLeft === undefined || hwTimeLeft === null) {
        hwDuration = 90;
        hwTimeLeft = hwDuration * 60;
    }

    if (hwTimeLeft <= 0) {
        if (hwTimerInterval) clearInterval(hwTimerInterval);
        if (timerDisplay) timerDisplay.innerText = 00:00;
        if (timerBadge) {
            timerBadge.classList.remove('hw-timer-blinking');
            timerBadge.style.background = '#fee2e2';
            timerBadge.style.color = '#dc2626';
            timerBadge.style.border = '2px solid #dc2626';
        }
        if (typeof playTimerBeepSound === 'function') {
            playTimerBeepSound();
        }
        return;
    }

    const minutes = Math.floor(hwTimeLeft / 60);
    const seconds = hwTimeLeft % 60;
    const formattedMin = minutes < 10 ? '0' + minutes : minutes;
    const formattedSec = seconds < 10 ? '0' + seconds : seconds;

    if (timerDisplay) {
        timerDisplay.innerText = ${formattedMin}:;
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

// Check Firestore for any active homework for the given batch
async function checkForHomework(batch) {
    if (typeof firestoreDb === 'undefined') return;
    try {
        const snap = await firestoreDb.collection('ActiveAssignments')
            .where('active', '==', true)
            .get();

        let found = null;
        snap.forEach(doc => {
            const data = doc.data();
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
            
            const container = document.getElementById('homework-btn-container');
            if (container) container.style.display = 'block';
        }
    } catch (err) {
        console.error('Homework check error:', err);
    }
}

// Starts the homework session
function openHomework() {
    if (hwQuestions.length === 0) {
        alert('No homework available right now.');
        return;
    }
    violationCount = 0;
    hwCurrentIndex = 0;
    hwAnswers = new Array(hwQuestions.length).fill(null);

    document.getElementById('instruction-section').style.display = 'none';
    document.getElementById('homework-section').style.display = 'block';

    document.getElementById('hw-title').innerText = hwDocTitle;
    document.getElementById('hw-total-label').innerText = of  questions;

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

// Renders the current homework question
function hwLoadQuestion() {
    const q = hwQuestions[hwCurrentIndex];
    if (!q) return;

    const qText = q.q || q.question || q.questionText || '';
    document.getElementById('hw-question-text').innerText = qText;
    document.getElementById('hw-question-counter').innerText = Q;
    document.getElementById('hw-progress').style.width = ((hwCurrentIndex + 1) / hwQuestions.length * 100) + '%';

    const container = document.getElementById('hw-options-container');
    container.innerHTML = '';

    const options = Array.isArray(q.options) ? q.options : [];
    options.forEach(opt => {
        const isChecked = hwAnswers[hwCurrentIndex] === opt;
        const lbl = document.createElement('label');
        lbl.className = 'option-label';
        lbl.style.cssText = isChecked ? 'background:#eef2ff; border-color:#6366f1;' : '';
        lbl.innerHTML = 
            <input type=radio name=hw-opt value=" style=accent-color:#6366f1; width:18px; height:18px; flex-shrink:0;>
 
 ;
 lbl.onclick = () => {
 hwAnswers[hwCurrentIndex] = opt;
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
 submitHomework();
 }
}

function hwPrev() {
 if (hwCurrentIndex > 0) {
 hwCurrentIndex--;
 hwLoadQuestion();
 }
}

// Submits homework answers to Firestore
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

 // Save to Firestore HomeworkResults collection
 try {
 if (typeof firestoreDb !== 'undefined') {
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
 violations: typeof violationCount !== 'undefined' ? violationCount : 0
 });
 }
 } catch (err) {
 console.error('Homework submit error:', err);
 }

 // Show result screen
 document.getElementById('homework-section').style.display = 'none';
 document.getElementById('homework-result-section').style.display = 'block';
 document.getElementById('hw-final-score').innerText = ${score}/;
 document.getElementById('hw-percent').innerText = Score: %;

 const hwStatus = document.getElementById('hw-status');
 if (hwStatus) {
 if (percent >= 70) {
 hwStatus.innerText = '? PASSED';
 hwStatus.style.color = '#28a745';
 } else {
 hwStatus.innerText = '? FAILED';
 hwStatus.style.color = '#d9534f';
 }
 }

 const hwDetail = document.getElementById('hw-result-detail');
 if (hwDetail) hwDetail.innerHTML = '';
}
