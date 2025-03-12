import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
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

const controlRef = doc(db, "globalControls", "commands");

onSnapshot(controlRef, (doc) => {
  const command = doc.data().command;

  if (command === "playNow") {
    playNextAnnouncement();
  } else if (command === "pause") {
    if (currentAudio) currentAudio.pause();
  } else if (command === "resume") {
    if (currentAudio) currentAudio.play();
  } else if (command === "stop") {
    stopAudio();
  } else if (command.startsWith("volume:")) {
    const volume = parseFloat(command.split(":")[1]);
    if (currentAudio) currentAudio.volume = volume;
  }
});

// 🔹 DOM Elements
const nextAnnouncementEl = document.getElementById("nextAnnouncement");
const countdownTimerEl = document.getElementById("countdownTimer");
const progressFill = document.getElementById("progressFill");
const volumeControl = document.getElementById("volumeControl");
const playNowButton = document.getElementById("playNowButton");
const stopButton = document.getElementById("stopButton");
const currentAnnouncementsEl = document.getElementById("currentAnnouncements");

let announcements = [];
let playedAnnouncements =
  JSON.parse(localStorage.getItem("playedAnnouncements")) || [];
let currentAudio = null;

// 🔹 PA Sound Effect (Ensure this file exists in your project)
const paSound = new Audio("sounds/pa-sound.mp3");
paSound.volume = 0.5; // Default volume for PA sound

// 🔹 Real-Time Firestore Listener
onSnapshot(collection(db, "announcements"), (snapshot) => {
  announcements = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (announcements.length === 0) {
    nextAnnouncementEl.textContent = "No upcoming announcements.";
    countdownTimerEl.textContent = "";
    return;
  }

  announcements.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  // 🔹 Display Upcoming Announcements
  currentAnnouncementsEl.innerHTML = "";
  announcements.forEach((announcement) => {
    const listItem = document.createElement("li");
    listItem.textContent = `🎵 ${announcement.title} - ${
      announcement.scheduledTime || "No time set"
    }`;
    currentAnnouncementsEl.appendChild(listItem);
  });

  scheduleNextAnnouncement();
});

// 🔹 Schedule the Next Announcement
function scheduleNextAnnouncement() {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  const nextAnnouncement = announcements.find(
    (announcement) =>
      announcement.scheduledTime > currentTime &&
      !playedAnnouncements.includes(announcement.id)
  );

  if (!nextAnnouncement) {
    nextAnnouncementEl.textContent = "✅ All announcements played.";
    countdownTimerEl.textContent = "";
    return;
  }

  const [hour, minute] = nextAnnouncement.scheduledTime.split(":").map(Number);
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute
  );

  const timeUntilNext = scheduledTime.getTime() - now.getTime();

  // 🔹 Visual Cues
  if (timeUntilNext <= 300000) {
    nextAnnouncementEl.className = "coming-soon"; // 🟠 Less than 5 mins
  } else {
    nextAnnouncementEl.className = ""; // Default state
  }

  nextAnnouncementEl.textContent = `Next: ${nextAnnouncement.title} at ${nextAnnouncement.scheduledTime}`;
  updateCountdownTimer(timeUntilNext);

  setTimeout(() => {
    playAudio(nextAnnouncement.audioURL, nextAnnouncement.title);
    playedAnnouncements.push(nextAnnouncement.id);
    localStorage.setItem(
      "playedAnnouncements",
      JSON.stringify(playedAnnouncements)
    );

    scheduleNextAnnouncement();
  }, timeUntilNext);
}

// 🔹 Countdown Timer
function updateCountdownTimer(timeUntilNext) {
  function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  const interval = setInterval(() => {
    timeUntilNext -= 1000;

    if (timeUntilNext <= 0) {
      countdownTimerEl.textContent = "🟢 Playing now!";
      clearInterval(interval);
    } else {
      countdownTimerEl.textContent = `⏳ Time remaining: ${formatTime(
        timeUntilNext
      )}`;
    }
  }, 1000);
}

// 🔹 Play Audio with PA Sound and Progress Bar
function playAudio(url, title) {
  stopAudio(); // Stop any currently playing audio

  // Step 1: Play the PA Sound First
  paSound
    .play()
    .then(() => {
      // Step 2: After PA Sound Ends, Play the Announcement
      paSound.onended = () => {
        currentAudio = new Audio(url);
        currentAudio.volume = parseFloat(volumeControl.value);

        currentAudio.play().catch((err) => {
          console.error("Error playing audio:", err);
          alert("❌ Error playing the announcement.");
        });

        // 🔹 Progress Bar
        progressFill.style.width = "0%";
        const interval = setInterval(() => {
          const progress =
            (currentAudio.currentTime / currentAudio.duration) * 100;
          progressFill.style.width = `${progress}%`;

          if (progress >= 100) clearInterval(interval);
        }, 500);

        nextAnnouncementEl.className = "now-playing"; // 🟢 Visual Cue for "Now Playing"
      };
    })
    .catch((err) => {
      console.error("Error playing PA sound:", err);
      alert("❌ Error playing the PA sound.");
    });
}

// 🔹 Stop Audio Function
function stopAudio() {
  if (paSound) {
    paSound.pause();
    paSound.currentTime = 0;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0; // Reset audio to start
    progressFill.style.width = "0%"; // Clear progress bar
    currentAudio = null; // Clear reference
  }
}

// 🔹 "Play Now" Button
playNowButton.addEventListener("click", () => {
  if (announcements.length === 0) {
    alert("No announcements to play.");
    return;
  }

  const nextAnnouncement = announcements[0];
  playAudio(nextAnnouncement.audioURL, nextAnnouncement.title);
});

// 🔹 "Stop" Button
stopButton.addEventListener("click", stopAudio);
