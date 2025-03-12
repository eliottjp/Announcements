import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
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

// 🔹 Ensure Control Document Exists
async function ensureControlDocumentExists() {
  try {
    const controlSnap = await getDoc(controlRef);
    if (!controlSnap.exists()) {
      await setDoc(controlRef, {
        command: "none",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("❌ Error ensuring control document exists:", error);
    alert("❌ Permission issue detected. Please check Firestore rules.");
  }
}
ensureControlDocumentExists();

// 🔹 Real-Time Remote Control Listener
onSnapshot(controlRef, (doc) => {
  const commandData = doc.data();
  if (!commandData || !commandData.command) return;

  const command = commandData.command;
  console.log(`🔹 Received Command: ${command}`);

  switch (command) {
    case "playNow":
      playNextAnnouncement();
      break;
    case "pause":
      if (currentAudio) currentAudio.pause();
      break;
    case "resume":
      if (currentAudio) currentAudio.play();
      break;
    case "stop":
      stopAudio();
      break;
    default:
      if (command.startsWith("volume:")) {
        const volume = parseFloat(command.split(":")[1]);
        if (currentAudio) currentAudio.volume = volume;
      } else {
        console.warn(`⚠️ Unknown Command Received: ${command}`);
      }
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
paSound.volume = 0.5;

// 🔹 Real-Time Firestore Listener with `orderBy` for Correct Sorting
onSnapshot(
  query(collection(db, "announcements"), orderBy("order")),
  (snapshot) => {
    announcements = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (announcements.length === 0) {
      nextAnnouncementEl.textContent = "No upcoming announcements.";
      countdownTimerEl.textContent = "";
      return;
    }

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
  },
  (error) => {
    console.error("❌ Firestore Permission Error:", error.message);
    alert("❌ Permission denied. Please check Firestore rules.");
  }
);

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
  const interval = setInterval(() => {
    timeUntilNext -= 1000;

    if (timeUntilNext <= 0) {
      countdownTimerEl.textContent = "🟢 Playing now!";
      clearInterval(interval);
    } else {
      countdownTimerEl.textContent = `⏳ Time remaining: ${Math.floor(
        timeUntilNext / 60000
      )}:${String(Math.floor((timeUntilNext % 60000) / 1000)).padStart(
        2,
        "0"
      )}`;
    }
  }, 1000);
}

// 🔹 Play Audio with PA Sound and Progress Bar
function playAudio(url, title) {
  stopAudio();

  paSound
    .play()
    .then(() => {
      paSound.onended = () => {
        startAnnouncement(url);
      };
    })
    .catch((err) => {
      console.error("❌ Error playing PA sound:", err);
      startAnnouncement(url); // Start announcement if PA sound fails
    });
}

// 🔹 Start Announcement After PA Sound
function startAnnouncement(url) {
  currentAudio = new Audio(url);
  currentAudio.volume = parseFloat(volumeControl.value);

  currentAudio.play().catch((err) => {
    console.error("Error playing audio:", err);
    alert("❌ Error playing the announcement.");
  });

  // 🔹 Progress Bar
  progressFill.style.width = "0%";
  const interval = setInterval(() => {
    if (currentAudio && !isNaN(currentAudio.duration)) {
      const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
      progressFill.style.width = `${progress}%`;
    }

    if (!currentAudio || currentAudio.ended) {
      clearInterval(interval);
    }
  }, 500);

  nextAnnouncementEl.className = "now-playing";
}

// 🔹 Stop Audio Function
function stopAudio() {
  if (paSound) {
    paSound.pause();
    paSound.currentTime = 0;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    progressFill.style.width = "0%";
    currentAudio = null;
  }
}

// 🔹 "Play Now" Button
playNowButton.addEventListener("click", () => {
  playNextAnnouncement();
});

// 🔹 "Stop" Button
stopButton.addEventListener("click", stopAudio);

// 🔹 Play Next Announcement Function
function playNextAnnouncement() {
  if (announcements.length === 0) {
    alert("No announcements to play.");
    return;
  }

  const nextAnnouncement = announcements[0];
  playAudio(nextAnnouncement.audioURL, nextAnnouncement.title);
}
