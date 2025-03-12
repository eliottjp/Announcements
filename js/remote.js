import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔹 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBV9yPD8G3YVP32CgeI1M1kGB8avkQJpV0",
  authDomain: "announcements-ea459.firebaseapp.com",
  projectId: "announcements-ea459",
  storageBucket: "announcements-ea459.appspot.com",
  messagingSenderId: "426382283941",
  appId: "1:426382283941:web:a1372f98060834e7fee94c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔹 Sign in Anonymously
signInAnonymously(auth)
  .then(() => {
    console.log("✅ Successfully signed in anonymously");
  })
  .catch((error) => {
    console.error("❌ Error signing in:", error);
    alert("❌ Authentication error. Please refresh the page.");
  });

// 🔹 DOM Elements
const playNowButton = document.getElementById("playNowButton");
const pauseButton = document.getElementById("pauseButton");
const resumeButton = document.getElementById("resumeButton");
const stopButton = document.getElementById("stopButton");
const volumeSlider = document.getElementById("volumeSlider");
const upcomingAnnouncementsEl = document.getElementById(
  "upcomingAnnouncements"
);
const refreshListButton = document.getElementById("refreshListButton");

// 🔹 Ensure Control Document Exists
async function ensureControlDocumentExists() {
  const controlRef = doc(db, "globalControls", "commands");

  const controlSnap = await getDoc(controlRef);
  if (!controlSnap.exists()) {
    await setDoc(controlRef, {
      command: "none",
      commandId: "",
      timestamp: new Date().toISOString(),
    });
  }
}
ensureControlDocumentExists();

// 🔹 Sync with Firestore for Upcoming Announcements
function loadUpcomingAnnouncements() {
  onSnapshot(collection(db, "announcements"), (snapshot) => {
    const announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    upcomingAnnouncementsEl.innerHTML = "";

    if (announcements.length === 0) {
      upcomingAnnouncementsEl.innerHTML = "<li>❌ No announcements found.</li>";
      return;
    }

    announcements.forEach((announcement) => {
      const listItem = document.createElement("li");
      listItem.textContent = `🎵 ${announcement.title} - ${
        announcement.scheduledTime || "No time set"
      }`;
      upcomingAnnouncementsEl.appendChild(listItem);
    });
  });
}
loadUpcomingAnnouncements();

// 🔹 Remote Control Commands (With Unique Command ID)
async function sendControlCommand(command) {
  const controlRef = doc(db, "globalControls", "commands");

  try {
    await updateDoc(controlRef, {
      command,
      commandId: crypto.randomUUID(), // Ensure each command is unique
      timestamp: new Date().toISOString(),
    });
    showFeedback(`✅ Command Sent: ${command}`, "green");
  } catch (error) {
    console.error(`❌ Error sending command: ${error}`);
    showFeedback(`❌ Error: ${error.message}`, "red");
  }
}

// 🔹 Feedback Display
function showFeedback(message, color) {
  const feedbackEl = document.getElementById("feedback");
  feedbackEl.textContent = message;
  feedbackEl.style.color = color;
  setTimeout(() => (feedbackEl.textContent = ""), 3000);
}

// 🔹 Button Click Handlers
playNowButton.addEventListener("click", () => sendControlCommand("playNow"));
pauseButton.addEventListener("click", () => sendControlCommand("pause"));
resumeButton.addEventListener("click", () => sendControlCommand("resume"));
stopButton.addEventListener("click", () => sendControlCommand("stop"));
refreshListButton.addEventListener("click", loadUpcomingAnnouncements);

// 🔹 Volume Control (Ensures Precision to Avoid Failures)
volumeSlider.addEventListener("input", () => {
  const volume = parseFloat(volumeSlider.value).toFixed(2);
  sendControlCommand(`volume:${volume}`);
});
