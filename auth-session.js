/**
 * ==============================================================================
 * STA STUDENT PORTAL - AUTHENTICATION, SESSION & LIVE EXAM BINDING
 * ==============================================================================
 * Handles:
 * 1. Student credentials verification (Name, TC, Password) against static DB + Firebase registry.
 * 2. Session locking to prevent concurrent multi-device logins.
 * 3. Real-time Firebase listeners for live exam activation and assignment changes.
 * 4. UI updates for exam preparation and instructions display.
 */

var assignedExamData = null;
var homeworkData = null;
var hasExam = false;
var hasHomework = false;
var examActive = false;
var activeExamId = null;
var activeHomeworkId = null;

// Helper to sanitize names for Firebase paths
function getSafeName(name) {
    return name ? name.replace(/[.#$[\]]/g, _) : unknown_user;
}

function getStudentSessionKey(name, batch, division) {
    const cleanName = (name || '').replace(/[.#$[\]]/g, '_');
    const cleanBatch = (batch || '').replace(/[.#$[\]]/g, '_');
    const cleanDiv = (division || '').replace(/[.#$[\]]/g, '_');
    return ${cleanBatch}__;
}

// ==============================================================================
// LOGIN & INSTRUCTIONS
// ==============================================================================
function showInstructions() {
    const nameInput = document.getElementById('studentName');
    const tcInput = document.getElementById('tcNumber');
    const passInput = document.getElementById('studentPass');
    const errorMsg = document.getElementById('login-error');

    const name = nameInput ? nameInput.value.trim() : '';
    const tc = tcInput ? tcInput.value.trim() : '';
    const pass = passInput ? passInput.value.trim() : '';

    // Admin reset shortcut
    if (name.toLowerCase() === siemens && pass === 1234) {
        localStorage.clear();
        alert(? Admin: Access has been RESET.);
        location.reload();
        return;
    }

    if (!name || !tc || !pass) {
        alert(Please fill in all details (Name, TC, and Password)!);
        return;
    }

    // Fetch registered students, activations, and deleted static students from Firebase and merge
    Promise.all([
        database.ref('registered_students').once('value'),
        database.ref('exam_activation').once('value'),
        database.ref('deleted_static_students').once('value')
    ]).then(([studentsSnap, activationsSnap, deletedSnap]) => {
        const deletedStaticTcs = deletedSnap.val() || {};
        const staticList = (typeof students !== 'undefined' && Array.isArray(students)) ? students : [];
        const filteredStaticStudents = staticList.filter(s => {
            const key = ${s.batch}__;
            return !deletedStaticTcs[key];
        });

        let allStudents = [...filteredStaticStudents];
        const fbStudents = studentsSnap.val();
        if (fbStudents) {
            Object.keys(fbStudents).forEach(bKey => {
                const batchData = fbStudents[bKey];
                if (batchData && typeof batchData === 'object') {
                    Object.keys(batchData).forEach(sId => {
                        allStudents.push(batchData[sId]);
                    });
                }
            });
        }

        const activations = activationsSnap.val() || {};

        const matches = allStudents.filter(s => {
            const dbName = (s.name || '').split(' ')[0].toLowerCase();
            const inputName = name.split(' ')[0].toLowerCase();
            return dbName === inputName && s.pass === pass;
        });

        if (matches.length === 0) {
            if (errorMsg) errorMsg.style.display = 'block';
            return;
        }

        let student = null;
        if (matches.length === 1) {
            student = matches[0];
        } else {
            const inputUpper = name.toUpperCase();
            if (inputUpper.includes(EA) || inputUpper.includes(EB)) {
                student = matches.find(s => inputUpper.includes(s.division));
            }
            if (!student) {
                // Intelligently default to the division that has an active exam
                student = matches.find(s => {
                    const key = (s.batch || '') + '_' + s.division;
                    return activations[key] && activations[key].active === true;
                });
            }
            if (!student) {
                student = matches[0];
            }
        }

        if (student) {
            const sessionKey = getStudentSessionKey(student.name, student.batch || '', student.division);
            const divKey = (student.batch || '') + '_' + student.division;

            database.ref('student_sessions/' + sessionKey).once('value').then(snapshot => {
                const data = snapshot.val();
                
                if (data && data.locked) {
                    if (errorMsg) {
                        errorMsg.innerText = ? Account Locked: You have already logged in. Ask Admin to reset.;
                        errorMsg.style.display = 'block';
                    }
                    localStorage.setItem(currentStudent, student.name);
                    if (typeof checkAndStartUserListener === 'function') {
                        checkAndStartUserListener();
                    }
                } else {
                    database.ref('student_sessions/' + sessionKey).set({
                        locked: true,
                        timestamp: Date.now()
                    });

                    localStorage.setItem(currentStudent, student.name);
                    localStorage.setItem(currentTC, tc);
                    localStorage.setItem(currentBatch, student.batch || '');
                    localStorage.setItem(currentDivision, student.division);

                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('instruction-section').style.display = 'block';

                    const loginCountKey = student.name + _loginCount;
                    let loginCount = parseInt(localStorage.getItem(loginCountKey) || 0);
                    localStorage.setItem(loginCountKey, loginCount + 1);

                    examActive = false;
                    activeExamId = null;
                    activeHomeworkId = null;
                    assignedExamData = null;
                    homeworkData = null;
                    hasExam = false;
                    hasHomework = false;

                    function updatePortalUI() {
                        const examBtn = document.querySelector('#instruction-section button[onclick=startExam()]');
                        const examInstructions = document.querySelector('#instruction-section ul');
                        const examTitle = document.querySelector('#instruction-section h2');
                        const hwContainer = document.getElementById('homework-btn-container');

                        let examDuration = 90;
                        if (hasExam && assignedExamData) {
                            if (assignedExamData.duration) {
                                examDuration = parseInt(assignedExamData.duration);
                            } else if (assignedExamData.examDuration) {
                                examDuration = parseInt(assignedExamData.examDuration);
                            }
                        }
                        timeLeft = examDuration * 60;

                        const isExamReady = examActive && hasExam && assignedExamData && Array.isArray(assignedExamData.questions) && assignedExamData.questions.length > 0;

                        if (isExamReady) {
                            // Admin has assigned & activated an exam - shuffle questions & options uniquely per student
                            const studentSeedKey = (student.name || '') + '_' + (tc || '') + '_' + (assignedExamData.id || 'exam');
                            currentQuestions = shuffleExamQuestionsAndOptions(assignedExamData.questions, studentSeedKey);

                            if (examTitle) {
                                const activeTitle = assignedExamData.title || 'STA ONLINE EXAM';
                                examTitle.innerText = ??  + activeTitle;
                                localStorage.setItem('currentExamTitle', activeTitle);
                                localStorage.setItem('currentExamFirestoreId', assignedExamData.id || '');
                            }

                            if (examInstructions) {
                                examInstructions.innerHTML = 
                                    <li>?? <b>Total Questions:</b>  MCQs</li>
                                    <li>?? <b>Exam Timer:</b>  Minutes</li>
                                    <li>?? <b>Warning:</b> Leaving the tab twice will auto-submit.</li>;
                                examInstructions.style.display = 'block';
                            }
                            if (examBtn) examBtn.style.display = 'block';
                        } else {
                            currentQuestions = [];

                            if (examTitle) {
                                examTitle.innerText = ?? Exam Not Available;
                                localStorage.removeItem('currentExamTitle');
                                localStorage.removeItem('currentExamFirestoreId');
                            }

                            if (examInstructions) {
                                let statusReason = ";
 if (!hasExam && !examActive) {
 statusReason = No exam is currently assigned or activated for your batch ( ).;
 } else if (!examActive) {
 statusReason = Exam '<b></b>' has been assigned, but is <b>NOT YET ACTIVATED</b> by Admin.;
 } else {
 statusReason = Exam Activation is ON, but no exam has been generated/assigned yet for batch ( ).;
 }

 examInstructions.innerHTML = 
 <li style=color:#dc2626; font-size:14px; font-weight:bold; background:#fee2e2; padding:12px 16px; border-radius:8px; border:1px solid #fca5a5; list-style:none; margin-bottom:10px;>
 ?? 
 </li>
 <li style=color:#64748b; font-size:13px; font-weight:600; list-style:none;>
 ?? Please ask your instructor / Admin to activate and assign the exam.
 </li>;
 examInstructions.style.display = 'block';
 }
 if (examBtn) examBtn.style.display = 'none';
 }

 userAnswers = new Array(currentQuestions.length).fill(null);

 if (hasHomework && homeworkData) {
 hwDocId = homeworkData.id;
 hwDocTitle = homeworkData.title || 'Homework Assignment';
 hwDuration = (typeof getValidHwDuration === 'function') ? getValidHwDuration(homeworkData) : 90;
 const studentName = localStorage.getItem('currentStudent') || (student ? student.name : '') || 'Student';
 const tcNumber = localStorage.getItem('currentTC') || (tc || '');
 const hwSeedKey = studentName + '_' + tcNumber + '_' + (hwDocId || 'hw');
 hwQuestions = shuffleExamQuestionsAndOptions(homeworkData.questions, hwSeedKey);
 if (hwContainer) hwContainer.style.display = 'block';
 } else {
 hwQuestions = [];
 if (hwContainer) hwContainer.style.display = 'none';
 }
 }

 // Listen for Exam Activation (RTDB)
 database.ref('exam_activation/' + divKey).on('value', activationSnap => {
 const activationData = activationSnap.val();
 examActive = activationData && activationData.active === true;
 updatePortalUI();
 });

 // Listen for Active Exam ID (RTDB & Firestore fallback)
 let examUnsubscribe = null;
 const batchOnlyKey = (student.batch || '').split(' ')[0].replace(/[\s-]/g, '_');

 function handleExamDocSnapshot(doc) {
 if (doc && doc.exists && doc.data().active !== false && Array.isArray(doc.data().questions) && doc.data().questions.length > 0) {
 hasExam = true;
 assignedExamData = { id: doc.id, ...doc.data() };
 updatePortalUI();
 return true;
 }
 return false;
 }

 function fallbackDirectFirestoreExamSearch() {
 if (typeof firestoreDb === 'undefined') return;
 firestoreDb.collection('ActiveExams').where('active', '==', true).get().then(snap => {
 let foundExam = null;
 const stBatch = (student.batch || '').toLowerCase();
 const stDiv = (student.division || '').toLowerCase();

 snap.forEach(doc => {
 const data = doc.data();
 const examBatch = (data.batch || '').toLowerCase();
 if (examBatch.includes(stBatch) || (stDiv && examBatch.includes(stDiv))) {
 if (Array.isArray(data.questions) && data.questions.length > 0) {
 foundExam = { id: doc.id, ...data };
 }
 }
 });

 if (foundExam) {
 hasExam = true;
 assignedExamData = foundExam;
 } else {
 hasExam = false;
 assignedExamData = null;
 }
 updatePortalUI();
 }).catch(err => {
 console.error(Direct Firestore exam query fallback error:, err);
 hasExam = false;
 assignedExamData = null;
 updatePortalUI();
 });
 }

 function bindExamDoc(newExamId) {
 if (examUnsubscribe) {
 examUnsubscribe();
 examUnsubscribe = null;
 }
 if (newExamId) {
 activeExamId = newExamId;
 examUnsubscribe = firestoreDb.collection('ActiveExams').doc(activeExamId)
 .onSnapshot(doc => {
 if (!handleExamDocSnapshot(doc)) {
 fallbackDirectFirestoreExamSearch();
 }
 }, err => {
 console.error(Error fetching active exam from Firestore:, err);
 fallbackDirectFirestoreExamSearch();
 });
 } else {
 database.ref('active_exams/' + batchOnlyKey).once('value').then(bSnap => {
 const bData = bSnap.val();
 if (bData && bData.firestoreId) {
 bindExamDoc(bData.firestoreId);
 } else {
 fallbackDirectFirestoreExamSearch();
 }
 }).catch(() => fallbackDirectFirestoreExamSearch());
 }
 }

 database.ref('active_exams/' + divKey).on('value', activeExamSnap => {
 const activeExamData = activeExamSnap.val();
 const newExamId = activeExamData ? activeExamData.firestoreId : null;
 bindExamDoc(newExamId);
 });

 // Listen for Active Homework ID (RTDB)
 let homeworkUnsubscribe = null;
 database.ref('active_homeworks/' + divKey).on('value', activeHwSnap => {
 const activeHwData = activeHwSnap.val();
 const newHwId = activeHwData ? activeHwData.firestoreId : null;

 if (homeworkUnsubscribe) {
 homeworkUnsubscribe();
 homeworkUnsubscribe = null;
 }

 if (newHwId) {
 activeHomeworkId = newHwId;
 homeworkUnsubscribe = firestoreDb.collection('ActiveAssignments').doc(activeHomeworkId)
 .onSnapshot(doc => {
 if (doc.exists && doc.data().active === true) {
 hasHomework = true;
 homeworkData = { id: doc.id, ...doc.data() };
 } else {
 hasHomework = false;
 homeworkData = null;
 }
 updatePortalUI();
 }, err => {
 console.error(Error fetching active homework from Firestore:, err);
 hasHomework = false;
 homeworkData = null;
 updatePortalUI();
 });
 } else {
 activeHomeworkId = null;
 hasHomework = false;
 homeworkData = null;
 updatePortalUI();
 }
 });
 }
 }).catch(err => {
 console.error(err);
 alert(Could not connect to database. Check your internet.);
 });
 } else {
 if (errorMsg) errorMsg.style.display = 'block';
 }
 }).catch(err => {
 console.error(Firebase read students error:, err);
 alert(Could not read student registry. Check your internet.);
 });
}
