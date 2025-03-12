// admin.js

// Cloudinary Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dq6nfmu1g/upload";
const CLOUDINARY_UPLOAD_PRESET = "announcement_preset";

// Firestore Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBV9yPD8G3YVP32CgeI1M1kGB8avkQJpV0",
  authDomain: "announcements-ea459.firebaseapp.com",
  projectId: "announcements-ea459",
  storageBucket: "announcements-ea459.firebasestorage.app",
  messagingSenderId: "426382283941",
  appId: "1:426382283941:web:a1372f98060834e7fee94c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const scheduleList = document.getElementById("scheduleList");

// Enable Drag-and-Drop
const sortable = new Sortable(scheduleList, {
  animation: 150,
  onEnd: async (event) => {
    const items = Array.from(scheduleList.children);
    items.forEach(async (item, index) => {
      const id = item.dataset.id;
      await updateDoc(doc(db, "announcements", id), { order: index });
    });
  },
});

// Form Submission
const uploadForm = document.getElementById("uploadForm");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("announcementTitle").value;
  const audioFile = document.getElementById("audioFile").files[0];
  const scheduledTime =
    document.getElementById("announcementTime").value || null;

  if (!title || !audioFile) {
    alert("Please fill in all fields.");
    return;
  }

  const formData = new FormData();
  formData.append("file", audioFile);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    const audioURL = data.secure_url;

    // Save to Firestore
    await addDoc(collection(db, "announcements"), {
      title,
      audioURL,
      scheduledTime,
      timestamp: new Date().toISOString(),
    });

    alert("✅ Announcement uploaded successfully!");
    displayAnnouncements();
  } catch (error) {
    console.error("Error uploading file:", error);
    alert("❌ Failed to upload announcement. Please try again.");
  }
});

// Display Announcements
async function displayAnnouncements() {
  scheduleList.innerHTML = ""; // Clear existing content
  const querySnapshot = await getDocs(collection(db, "announcements"));

  if (querySnapshot.empty) {
    scheduleList.innerHTML = "<li>No announcements scheduled yet.</li>";
    return;
  }

  querySnapshot.forEach((doc) => {
    const { title, audioURL } = doc.data();
    const listItem = document.createElement("li");
    listItem.innerHTML = `🎵 <strong>${title}</strong> - <a href="${audioURL}" target="_blank">Listen</a>`;
    scheduleList.appendChild(listItem);
  });
}

displayAnnouncements();

// Load Announcements from Firestore
async function loadAnnouncements() {
  const querySnapshot = await getDocs(collection(db, "announcements"));
  scheduleList.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const listItem = document.createElement("li");
    listItem.textContent = `${data.title} - ${
      data.scheduledTime || "No time set"
    }`;
    listItem.dataset.id = doc.id;
    scheduleList.appendChild(listItem);
  });
}

loadAnnouncements();

// Real-Time Firestore Listener
onSnapshot(collection(db, "announcements"), (snapshot) => {
  scheduleList.innerHTML = ""; // Clear old list

  if (snapshot.empty) {
    scheduleList.innerHTML = `<li class="no-announcements">No announcements scheduled yet.</li>`;
    return;
  }

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const listItem = document.createElement("li");

    listItem.textContent = `🎵 ${data.title} - ${
      data.scheduledTime || "No Time Set"
    }`;
    scheduleList.appendChild(listItem);
  });
});
