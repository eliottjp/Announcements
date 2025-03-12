import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
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
const controlRef = doc(db, "globalControls", "commands");

// 🔹 Predefined Sound Queue (Short Durations)
const soundQueue = [
  { title: "5 Mins", url: "sounds/5-mins.mp3", duration: 8 }, // 8 seconds
  { title: "2 Mins", url: "sounds/2-mins.mp3", duration: 6 }, // 6 seconds
  { title: "5 Mins Interval", url: "sounds/5-mins-interval.mp3", duration: 5 }, // 5 seconds
  { title: "2 Mins Interval", url: "sounds/2-mins-interval.mp3", duration: 4 }, // 4 seconds
];

let currentSoundIndex = 0;
let playedAnnouncements = [];

// 🔹 Sign in Anonymously
signInAnonymously(auth)
  .then(() => console.log("✅ Successfully signed in anonymously"))
  .catch((error) => {
    console.error("❌ Error signing in:", error);
    alert("❌ Authentication error. Please refresh the page.");
  });

// 🔹 Update "Next Up" Display
function updateNextUp() {
  const nextSound = soundQueue[currentSoundIndex];
  document.getElementById(
    "nextUp"
  ).textContent = `🎶 Next Up: ${nextSound.title}`;
}
updateNextUp(); // Initialize on page load

// 🔹 Real-Time Listener for "Now Playing", Progress Bar, and Played List
onSnapshot(controlRef, (docSnap) => {
  const data = docSnap.data();
  if (!data) return;

  // 🔹 Update "Now Playing" in Real-Time
  document.getElementById("currentPlaying").textContent = `🎵 Now Playing: ${
    data.nowPlaying || "None"
  }`;

  // 🔹 Start Progress Bar when new sound plays
  if (data.duration && data.startTime) {
    startProgressBar(data.duration, data.startTime);
  }

  // 🔹 Update Played List (Highlight Played)
  if (data.playedList) {
    playedAnnouncements = data.playedList;
    updatePlayedList();
  }
});

// 🔹 Start Progress Bar & Countdown Timer (Fix for Short Durations)
function startProgressBar(duration, startTime) {
  const progressBar = document.getElementById("progressFill");
  const countdownEl = document.getElementById("countdownTimer");

  let endTime = startTime + duration * 1000; // Convert seconds to milliseconds

  function updateProgress() {
    const now = Date.now();
    let remainingTime = Math.max((endTime - now) / 1000, 0); // Prevent negative values
    let elapsedTime = duration - remainingTime;

    let progress = (elapsedTime / duration) * 100;
    progressBar.style.width = `${progress}%`;

    // 🔹 Update countdown text (e.g., "0:03 remaining")
    let seconds = Math.floor(remainingTime);
    countdownEl.textContent = `⏳ ${seconds
      .toString()
      .padStart(2, "0")} sec remaining`;

    if (remainingTime > 0) {
      requestAnimationFrame(updateProgress);
    } else {
      progressBar.style.width = "100%";
      countdownEl.textContent = "✅ Announcement Complete";
    }
  }

  updateProgress(); // Start the progress update loop
}

// 🔹 Play Next Sound in Queue
async function playNextInQueue() {
  const nextSound = soundQueue[currentSoundIndex];
  currentSoundIndex = (currentSoundIndex + 1) % soundQueue.length;

  updateNextUp(); // Update "Next Up" display

  // 🔹 Track Played Announcements
  playedAnnouncements.push(nextSound.title);

  await updateDoc(controlRef, {
    command: `play:${nextSound.url}`,
    nowPlaying: nextSound.title,
    duration: nextSound.duration,
    startTime: Date.now(),
    playedList: playedAnnouncements, // Save played announcements
    timestamp: new Date().toISOString(),
  });

  showFeedback(`▶️ Sent Command: Play "${nextSound.title}"`, "green");
}

// 🔹 Update Played Announcements List
function updatePlayedList() {
  const playedListEl = document.getElementById("playedAnnouncements");
  playedListEl.innerHTML = "";

  soundQueue.forEach((sound) => {
    const listItem = document.createElement("li");
    listItem.textContent = sound.title;

    if (playedAnnouncements.includes(sound.title)) {
      listItem.style.color = "green"; // ✅ Highlight played sounds
    }

    playedListEl.appendChild(listItem);
  });
}

// 🔹 Pause Announcement
async function pauseSound() {
  await sendCommand("pause");
}

// 🔹 Resume Announcement
async function resumeSound() {
  await sendCommand("resume");
}

// 🔹 Stop Announcement
async function stopSound() {
  await sendCommand("stop");
}

// 🔹 Set Volume
function setVolume(volume) {
  sendCommand(`volume:${volume}`);
}

// 🔹 Send Command to Firestore
async function sendCommand(command) {
  try {
    await updateDoc(controlRef, {
      command,
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
document
  .getElementById("playNowButton")
  .addEventListener("click", playNextInQueue);
document.getElementById("pauseButton").addEventListener("click", pauseSound);
document.getElementById("resumeButton").addEventListener("click", resumeSound);
document.getElementById("stopButton").addEventListener("click", stopSound);
document.getElementById("volumeSlider").addEventListener("input", (e) => {
  setVolume(parseFloat(e.target.value));
});
