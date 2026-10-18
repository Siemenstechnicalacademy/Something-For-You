function startExam() {
    violationCount = 0;
    document.getElementById('instruction-section').style.display = 'none';
    document.getElementById('question-section').style.display = 'block';

    timerInterval = setInterval(() => {
        timeLeft--;
        let min = Math.floor(timeLeft / 60);
        let sec = timeLeft % 60;
        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.innerText = "Time: " + min + ":" + (sec < 10 ? "0" + sec : sec);
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
        if (timeLeft <= 0) calculateFinalScore();
    }, 1000);

    loadQuestion();
}

// ===============================
// 🎯 FIX: CAPTURING ANSWERS CORRECTLY
// ===============================
function loadQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('question-text').innerText = q.q || q.question;
    document.getElementById('question-number').innerText = currentQuestionIndex + 1;
    document.getElementById('total-questions').innerText = currentQuestions.length;
    document.getElementById('progress-bar').style.width = ((currentQuestionIndex + 1) / currentQuestions.length * 100) + "%";

    const container = document.getElementById('options-container');
    container.innerHTML = "";

    q.options.forEach(opt => {
        const isChecked = userAnswers[currentQuestionIndex] === opt;

        const optionBtn = document.createElement('label');
        optionBtn.className = "option-label";
        optionBtn.innerHTML = `
            <input type="radio" name="opt" value="${opt.replace(/"/g, '&quot;')}" ${isChecked ? 'checked' : ''}>
            ${opt}
        `;

        optionBtn.onclick = () => {
            userAnswers[currentQuestionIndex] = opt;
        };

        container.appendChild(optionBtn);
    });

    document.getElementById('prev-btn').style.visibility = currentQuestionIndex === 0 ? "hidden" : "visible";
    document.getElementById('next-btn').innerText = currentQuestionIndex === (currentQuestions.length - 1) ? "FINISH" : "NEXT";
}

var isSubmitting = false;

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

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        if (isSubmitting) return;
        safeConfirmSubmit("Submit Exam?", function() {
            calculateFinalScore();
        });
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

// ===============================
// 🎯 FIX: PREVENTING "UNDEFINED" IN REPORT & SAFE SUBMISSION
// ===============================
function calculateFinalScore() {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
        if (typeof timerInterval !== 'undefined') clearInterval(timerInterval);
        localStorage.setItem("examStatus", "done");

        let score = 0;
        const safeQuestions = currentQuestions || [];
        const reportDetails = safeQuestions.map((q, i) => {
            if (!q) return { question: "N/A", userSelection: "Not Answered", correctAnswer: "N/A", status: false };
            const correctAns = q.answer || q.correct || q.correctAnswer || "";
            const isCorrect = userAnswers && userAnswers[i] === correctAns;
            if (isCorrect) score++;
            return {
                question: q.q || q.question || "Question",
                userSelection: (userAnswers && userAnswers[i]) ? userAnswers[i] : "Not Answered",
                correctAnswer: correctAns,
                status: isCorrect
            };
        });

        const studentName = localStorage.getItem("currentStudent") || "Unknown";
        const tcNo = localStorage.getItem("currentTC") || "N/A";
        const studentBatch = localStorage.getItem("currentBatch") || "N/A";
        const studentDivision = localStorage.getItem("currentDivision") || "N/A";
        const totalQ = safeQuestions.length > 0 ? safeQuestions.length : 1;
        const finalPercent = Math.round((score / totalQ) * 100);

        const examTitleToSave = localStorage.getItem('currentExamTitle') || 'STA Online Exam';
        const examFirestoreIdToSave = localStorage.getItem('currentExamFirestoreId') || null;

        // SEND TO FIREBASE
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
            }).catch(e => console.error("Firebase submit error:", e));
        }

        // UPDATE UI
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
        if (resultPercentEl) resultPercentEl.innerText = `Percentage: ${finalPercent}%`;

        if (statusLabel) {
            if (finalPercent >= 70) {
                statusLabel.innerText = "🎉 PASSED";
                statusLabel.style.color = "#28a745";
            } else {
                statusLabel.innerText = "❌ FAILED";
                statusLabel.style.color = "#d9534f";
            }
        }

        const detailEl = document.getElementById('result-detail');
        if (detailEl) detailEl.innerHTML = '';
    } catch (err) {
        console.error("Error in calculateFinalScore:", err);
        const qSection = document.getElementById('question-section');
        const rSection = document.getElementById('result-section');
        if (qSection) qSection.style.display = 'none';
        if (rSection) rSection.style.display = 'block';
    }
}
