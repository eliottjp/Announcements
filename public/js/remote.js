import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
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

// 🔹 DOM Elements
const playNowButton = document.getElementById("playNowButton");
const pauseButton = document.getElementById("pauseButton");
const resumeButton = document.getElementById("resumeButton");
const stopButton = document.getElementById("stopButton");
const volumeSlider = document.getElementById("volumeSlider");
const upcomingAnnouncementsEl = document.getElementById(
  "upcomingAnnouncements"
);

// 🔹 Sync with Firestore for Upcoming Announcements
onSnapshot(collection(db, "announcements"), (snapshot) => {
  const announcements = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  upcomingAnnouncementsEl.innerHTML = "";

  announcements.forEach((announcement) => {
    const listItem = document.createElement("li");
    listItem.textContent = `🎵 ${announcement.title} - ${
      announcement.scheduledTime || "No time set"
    }`;
    upcomingAnnouncementsEl.appendChild(listItem);
  });
});

// 🔹 Remote Control Commands
async function sendControlCommand(command) {
  const controlRef = doc(db, "globalControls", "commands");

  await updateDoc(controlRef, { command, timestamp: new Date().toISOString() });
}

playNowButton.addEventListener("click", () => sendControlCommand("playNow"));
pauseButton.addEventListener("click", () => sendControlCommand("pause"));
resumeButton.addEventListener("click", () => sendControlCommand("resume"));
stopButton.addEventListener("click", () => sendControlCommand("stop"));

// 🔹 Volume Control
volumeSlider.addEventListener("input", () => {
  sendControlCommand(`volume:${volumeSlider.value}`);
});
