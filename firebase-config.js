/**
 * ==============================================================================
 * STA STUDENT PORTAL - FIREBASE INITIALIZATION & CONFIGURATION
 * ==============================================================================
 */

const firebaseConfig = {
    apiKey: AIzaSyApnWnlnrTFQw5hsHVvjnK0kvwqIh3Nh5E,
    authDomain: sta-question-bank.firebaseapp.com,
    databaseURL: https://sta-question-bank-default-rtdb.asia-southeast1.firebasedatabase.app,
    projectId: sta-question-bank,
    storageBucket: sta-question-bank.firebasestorage.app,
    messagingSenderId: 632844417227,
    appId: 1:632844417227:web:6b60831113d49c18fd834e,
    measurementId: G-QPWV3ZFS14
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.database = firebase.database();
window.firestoreDb = firebase.firestore();
