import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
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
const controlRef = doc(db, "globalControls", "commands");

// 🔹 Predefined Sound Queue
const soundQueue = [
  { title: "5 Mins", url: "sounds/5-mins.mp3" },
  { title: "2 Mins", url: "sounds/2-mins.mp3" },
  { title: "5 Mins Interval", url: "sounds/5-mins-interval.mp3" },
  { title: "2 Mins Interval", url: "sounds/2-mins-interval.mp3" },
];

// 🔹 Chime Sound
const chimeSound = new Audio("sounds/chime.mp3");

let currentAudio = null;
let isPlaying = false;
let currentSoundIndex = 0;
let hasUserInteracted = false;

// 🔹 Ensure User Interaction
document.addEventListener("click", () => {
  hasUserInteracted = true;
});

// 🔹 Update "Next Up" Display
function updateNextUp() {
  const nextSound = soundQueue[currentSoundIndex];
  document.getElementById(
    "nextUp"
  ).textContent = `🎶 Next Up: ${nextSound.title}`;
}
updateNextUp(); // Initialize on page load

// 🔹 Real-Time Firestore Listener for Remote Commands
onSnapshot(controlRef, async (docSnap) => {
  const data = docSnap.data();
  if (!data || !data.command) return;

  const command = data.command;
  console.log(`🔹 Received Command: ${command}`);

  if (command.startsWith("play:")) {
    const soundUrl = command.split("play:")[1];
    if (!isPlaying) {
      await playSoundByUrl(soundUrl);
    }
  } else if (command === "pause") {
    pauseSound();
  } else if (command === "resume") {
    resumeSound();
  } else if (command === "stop") {
    stopSound();
  } else if (command.startsWith("volume:")) {
    setVolume(parseFloat(command.split(":")[1]));
  }
});

// 🔹 Play Sound with Chime Before Announcement
async function playSoundByUrl(url) {
  if (!hasUserInteracted) {
    console.warn("⚠️ User interaction required before playing audio.");
    alert("⚠️ Please click anywhere on the page before playing audio.");
    return;
  }

  if (isPlaying) {
    console.log("⚠️ Already playing, ignoring new play request.");
    return;
  }

  const sound = soundQueue.find((s) => s.url === url);
  if (!sound) {
    console.warn("❌ Sound not found:", url);
    return;
  }

  console.log(`▶️ Playing: ${sound.title}`);

  try {
    isPlaying = true;

    // 🔹 Play Chime First
    chimeSound
      .play()
      .then(() => {
        chimeSound.onended = async () => {
          currentAudio = new Audio(url);
          currentAudio.volume = parseFloat(
            document.getElementById("volumeControl").value
          );

          currentAudio
            .play()
            .then(() => {
              document.getElementById(
                "nextAnnouncement"
              ).textContent = `🎵 Now Playing: ${sound.title}`;
              updateProgressBar();
            })
            .catch((error) => {
              console.error("❌ Error playing announcement:", error);
              isPlaying = false;
            });

          currentAudio.onended = () => {
            isPlaying = false;
            document.getElementById("nextAnnouncement").textContent =
              "Next announcement will appear here.";
            updateNextUp();
          };
        };
      })
      .catch((error) => {
        console.error("❌ Error playing chime:", error);
        isPlaying = false;
      });
  } catch (error) {
    console.error("❌ Error playing audio:", error);
    isPlaying = false;
  }
}

// 🔹 Play Next Sound in Queue
async function playNextInQueue() {
  if (isPlaying) {
    console.log("⚠️ Already playing, ignoring request.");
    return;
  }

  const nextSound = soundQueue[currentSoundIndex];
  currentSoundIndex = (currentSoundIndex + 1) % soundQueue.length;

  updateNextUp(); // Update "Next Up" display

  await updateDoc(controlRef, {
    command: `play:${nextSound.url}`,
    timestamp: new Date().toISOString(),
  });
}

// 🔹 Pause Sound
function pauseSound() {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    console.log("⏸️ Paused");
  }
}

// 🔹 Resume Sound
function resumeSound() {
  if (currentAudio && currentAudio.paused) {
    currentAudio
      .play()
      .catch((error) => console.error("❌ Error resuming audio:", error));
    console.log("▶️ Resumed");
  }
}

// 🔹 Stop Sound
function stopSound() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    isPlaying = false;
    document.getElementById("progressFill").style.width = "0%";
  }
}

// 🔹 Set Volume
function setVolume(volume) {
  if (currentAudio) {
    currentAudio.volume = volume;
  }
}

// 🔹 Update Progress Bar
function updateProgressBar() {
  if (!currentAudio) return;
  const progressBar = document.getElementById("progressFill");

  const interval = setInterval(() => {
    if (!currentAudio || currentAudio.ended) {
      clearInterval(interval);
      return;
    }

    const progress = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressBar.style.width = `${progress}%`;
  }, 500);
}

// 🔹 "Play Now" Button
document
  .getElementById("playNowButton")
  .addEventListener("click", playNextInQueue);

// 🔹 "Stop" Button
document.getElementById("stopButton").addEventListener("click", stopSound);
