/**
 * ==============================================================================
 * STA STUDENT PORTAL - EXAM RUNNER & EVALUATION ENGINE
 * ==============================================================================
 * Handles:
 * 1. Exam initialization, question navigation & progress bar.
 * 2. Exam countdown timer with 5-minute red warning pulse & audio beeps.
 * 3. Question choice selection and user answer state persistence.
 * 4. Submission confirmation dialog handling.
 * 5. Automatic evaluation & result persistence to Firebase Realtime Database.
 */

var currentQuestions = [];
var currentQuestionIndex = 0;
var userAnswers = [];
var timeLeft = 5400; // 90 minutes default
var timerInterval = null;
var isSubmitting = false;

// Starts the exam session
function startExam() {
    violationCount = 0;
    isSubmitting = false;

    const instructionSec = document.getElementById('instruction-section');
    const questionSec = document.getElementById('question-section');
    if (instructionSec) instructionSec.style.display = 'none';
    if (questionSec) questionSec.style.display = 'block';

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60);
        let sec = timeLeft % 60;
        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.innerText = Time:  + min + : + (sec < 10 ? 0 + sec : sec);
            // 5 Minutes (300 Seconds) Warning: Pulse/Blink in Bold Red
            if (timeLeft <= 300 && timeLeft > 0) {
                if (!timerEl.classList.contains('timer-blinking')) {
                    timerEl.classList.add('timer-blinking');
                    if (typeof playTimerBeepSound === 'function') {
                        playTimerBeepSound();
                    }
                }
            } else {
                if (timerEl.classList.contains('timer-blinking')) {
                    timerEl.classList.remove('timer-blinking');
                }
            }
        }
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            calculateFinalScore();
        }
    }, 1000);

    loadQuestion();
}

// Renders the current question and options
function loadQuestion() {
    if (!currentQuestions || currentQuestions.length === 0) return;
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    document.getElementById('question-text').innerText = q.q || q.question || '';
    document.getElementById('question-number').innerText = currentQuestionIndex + 1;
    document.getElementById('total-questions').innerText = currentQuestions.length;
    document.getElementById('progress-bar').style.width = ((currentQuestionIndex + 1) / currentQuestions.length * 100) + %;

    const container = document.getElementById('options-container');
    container.innerHTML = ";

 const options = Array.isArray(q.options) ? q.options : [];
 options.forEach(opt => {
 const isChecked = userAnswers[currentQuestionIndex] === opt;
 const optionBtn = document.createElement('label');
 optionBtn.className = option-label;
 optionBtn.innerHTML = 
 <input type=radio name=opt value= >
 
 ;

 optionBtn.onclick = () => {
 userAnswers[currentQuestionIndex] = opt;
 };

 container.appendChild(optionBtn);
 });

 document.getElementById('prev-btn').style.visibility = currentQuestionIndex === 0 ? hidden : visible;
 document.getElementById('next-btn').innerText = currentQuestionIndex === (currentQuestions.length - 1) ? FINISH : NEXT;
}

// Safe confirmation dialog (prevents false blur violations)
function safeConfirmSubmit(message, onConfirm) {
 isShowingConfirmDialog = true;
 lastViolationTime = Date.now() + 3000;

 setTimeout(() => {
 const confirmed = confirm(message);
 if (confirmed) {
 isShowingConfirmDialog = false;
 if (typeof onConfirm === 'function') onConfirm();
 } else {
 lastViolationTime = Date.now() + 2000;
 setTimeout(() => {
 isShowingConfirmDialog = false;
 }, 1500);
 }
 }, 50);
}

// Navigate to next question or trigger submit
function nextQuestion() {
 if (currentQuestionIndex < currentQuestions.length - 1) {
 currentQuestionIndex++;
 loadQuestion();
 } else {
 if (isSubmitting) return;
 safeConfirmSubmit(Submit Exam?, function() {
 calculateFinalScore();
 });
 }
}

// Navigate to previous question
function prevQuestion() {
 if (currentQuestionIndex > 0) {
 currentQuestionIndex--;
 loadQuestion();
 }
}

// Evaluates exam score, submits to Firebase and displays student scorecard
function calculateFinalScore() {
 if (isSubmitting) return;
 isSubmitting = true;

 try {
 if (timerInterval) clearInterval(timerInterval);
 localStorage.setItem(examStatus, done);

 let score = 0;
 const safeQuestions = currentQuestions || [];
 const reportDetails = safeQuestions.map((q, i) => {
 if (!q) return { question: N/A, userSelection: Not Answered, correctAnswer: N/A, status: false };
 const correctAns = q.answer || q.correct || q.correctAnswer || ;
 const isCorrect = userAnswers && userAnswers[i] === correctAns;
 if (isCorrect) score++;
 return {
 question: q.q || q.question || Question,
 userSelection: (userAnswers && userAnswers[i]) ? userAnswers[i] : Not Answered,
 correctAnswer: correctAns,
 status: isCorrect
 };
 });

 const studentName = localStorage.getItem(currentStudent) || Unknown;
 const tcNo = localStorage.getItem(currentTC) || N/A;
 const studentBatch = localStorage.getItem(currentBatch) || N/A;
 const studentDivision = localStorage.getItem(currentDivision) || N/A;
 const totalQ = safeQuestions.length > 0 ? safeQuestions.length : 1;
 const finalPercent = Math.round((score / totalQ) * 100);

 const examTitleToSave = localStorage.getItem('currentExamTitle') || 'STA Online Exam';
 const examFirestoreIdToSave = localStorage.getItem('currentExamFirestoreId') || null;

 // Save result in Firebase Realtime Database
 if (typeof database !== 'undefined') {
 database.ref('exam_results').push({
 name: studentName,
 tcNumber: tcNo,
 batch: studentBatch,
 division: studentDivision,
 score: score,
 totalQuestions: safeQuestions.length,
 percentage: finalPercent,
 details: reportDetails,
 submittedAt: new Date().toLocaleString(),
 violations: typeof violationCount !== 'undefined' ? violationCount : 0,
 examTitle: examTitleToSave,
 examFirestoreId: examFirestoreIdToSave
 }).catch(e => console.error(Firebase submit error:, e));
 }

 // Display Result Card
 const qSection = document.getElementById('question-section');
 const rSection = document.getElementById('result-section');
 if (qSection) qSection.style.display = 'none';
 if (rSection) rSection.style.display = 'block';

 const finalScoreEl = document.getElementById('final-score');
 const finalTotalEl = document.getElementById('final-total');
 const resultPercentEl = document.getElementById('result-percent');
 const statusLabel = document.getElementById('result-status');

 if (finalScoreEl) finalScoreEl.innerText = score;
 if (finalTotalEl) finalTotalEl.innerText = safeQuestions.length;
 if (resultPercentEl) resultPercentEl.innerText = Percentage: %;

 if (statusLabel) {
 if (finalPercent >= 70) {
 statusLabel.innerText = ? PASSED;
 statusLabel.style.color = #28a745;
 } else {
 statusLabel.innerText = ? FAILED;
 statusLabel.style.color = #d9534f;
 }
 }

 // Details hidden to maintain academic integrity
 const detailEl = document.getElementById('result-detail');
 if (detailEl) detailEl.innerHTML = '';
 } catch (err) {
 console.error(Error in calculateFinalScore:, err);
 const qSection = document.getElementById('question-section');
 const rSection = document.getElementById('result-section');
 if (qSection) qSection.style.display = 'none';
 if (rSection) rSection.style.display = 'block';
 }
}
