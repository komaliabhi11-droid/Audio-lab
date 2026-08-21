/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import {
  Menu,
  Sparkles,
  Volume2,
  Play,
  Pause,
  Download,
  X,
  User as UserIcon,
  Crown,
  History as HistoryIcon,
  RotateCw,
  LogOut,
  Moon,
  Sun,
  Eye,
  EyeOff,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Info,
  HelpCircle,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAnAWxCI4LO7jeUDkb4oGVpCp5rIvf46mQ",
  authDomain: "vj-music-9870c.firebaseapp.com",
  databaseURL: "https://vj-music-9870c-default-rtdb.firebaseio.com",
  projectId: "vj-music-9870c",
  storageBucket: "vj-music-9870c.firebasestorage.app",
  messagingSenderId: "34328318780",
  appId: "1:34328318780:web:db6ef9548a81882caf0439",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- PREBUILT VOICES ---
const VOICES = [
  { id: "aditya", name: "Aditya", gender: "Male", description: "Breezy and bright, perfect for stories" },
  { id: "ritu", name: "Ritu", gender: "Female", description: "Informative, formal, ideal for narration" },
  { id: "kavya", name: "Kavya", gender: "Female", description: "Excitable, highly dramatic, engaging tone" },
  { id: "rahul", name: "Rahul", gender: "Male", description: "Firm, calm, authoritative tone for guides" },
  { id: "neha", name: "Neha", gender: "Female", description: "Upbeat, casual, extremely energetic" },
  { id: "rohan", name: "Rohan", gender: "Male", description: "Deep and resonant, great for dramatic reading" },
];

const LANGUAGES = [
  { code: "en-IN", name: "English" },
  { code: "hi-IN", name: "Hindi" },
  { code: "te-IN", name: "Telugu" }
];

// --- TOAST TYPES ---
interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

// --- HISTORY ITEM TYPE ---
interface HistoryItem {
  id: string;
  text: string;
  voiceName: string;
  timestamp: string;
  audioUrl: string;
}

// --- MAIN COMPONENT ---
export default function App() {
  // Splash State
  const [showSplash, setShowSplash] = useState(true);

  // Authentication States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // User Profile / Subscription States
  const [userCredits, setUserCredits] = useState(10);
  const [premiumActive, setPremiumActive] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null);
  const [premiumCountdown, setPremiumCountdown] = useState("");
  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);
  const [premiumSpinCount, setPremiumSpinCount] = useState<number>(0);
  const [profilePic, setProfilePic] = useState<string>("");

  // App Main Shell States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Text-to-Speech States
  const [script, setScript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [voiceSelectorOpen, setVoiceSelectorOpen] = useState(false);
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Background Video Playlist for Home Dashboard
  const backgroundPlaylist = [
    "https://res.cloudinary.com/axtyenqr/video/upload/v1787284389/abdziz3737_pindown.io_1787284204.mp4",
    "https://res.cloudinary.com/axtyenqr/video/upload/v1787285112/The_Honored1_pindown.io_1787284278.mp4",
    "https://res.cloudinary.com/axtyenqr/video/upload/v1787285317/The_Honored1_pindown.io_1787284344.mp4"
  ];
  const [bgVideoIndex, setBgVideoIndex] = useState(0);

  const handleVideoEnded = () => {
    setBgVideoIndex((prev) => (prev + 1) % backgroundPlaylist.length);
  };

  // Audio Player States
  const [currentAudio, setCurrentAudio] = useState<{ url: string; title: string; base64?: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // Modals States
  const [activeModal, setActiveModal] = useState<"spin" | "history" | "profile" | "about" | "payment" | null>(null);
  const [showDomainWarning, setShowDomainWarning] = useState(false);

  // Download States
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [downloadFilename, setDownloadFilename] = useState("");

  // Spin Wheel States
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);

  // Local History Fallback
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- AUDIO HELPER: Base64 PCM16 to WAV ---
  const convertPcmToWav = (base64Pcm: string, sampleRate = 24000): Blob => {
    const raw = window.atob(base64Pcm);
    const rawLength = raw.length;
    const arrayBuffer = new ArrayBuffer(rawLength);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < rawLength; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }

    const pcmData = new Int16Array(arrayBuffer);
    const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(wavBuffer);

    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmData.length * 2, true); // file length - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // format chunk identifier
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // format chunk size
    view.setUint16(20, 1, true); // sample format (raw PCM)
    view.setUint16(22, 1, true); // channel count (mono)
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate (sample rate * block align)
    view.setUint16(32, 2, true); // block align (channel count * bytes per sample)
    view.setUint16(34, 16, true); // bits per sample

    // data chunk identifier
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmData.length * 2, true); // chunk length

    // write PCM audio samples
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      view.setInt16(offset, pcmData[i], true);
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
  };

  // --- TOAST NOTIFICATIONS TRIGGER ---
  const showToast = (type: "success" | "error" | "warning" | "info", message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- COMPONENT MOUNT HOOK ---
  useEffect(() => {
    // 2 Seconds Splash Screen Timer
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);

    // Auth Change Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        setProfilePic(fbUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120");
        await syncUserData(fbUser);
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });

    // Dark/Light Theme Initialization
    const savedTheme = localStorage.getItem("audio_labs_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }

    // Load local history from localStorage
    const savedHistory = localStorage.getItem("audio_labs_local_history");
    if (savedHistory) {
      setLocalHistory(JSON.parse(savedHistory));
    }

    return () => {
      clearTimeout(splashTimer);
      unsubscribeAuth();
    };
  }, []);

  // --- RE-SYNCHRONIZE USER DATA ---
  const syncUserData = async (fbUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, "users", fbUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        
        // 1. Quota & Daily Reset checks
        const todayStr = new Date().toISOString().split("T")[0];
        let quota = data.quota ?? 10;
        let lastReset = data.lastResetDate;

        if (lastReset !== todayStr) {
          quota = 10;
          lastReset = todayStr;
          await updateDoc(userDocRef, {
            quota: 10,
            lastResetDate: todayStr,
          });
          showToast("success", "Your 10 daily credits are ready!");
        }

        setUserCredits(quota);
        setLastSpinDate(data.lastSpinDate || null);
        setPremiumSpinCount(data.premiumSpinCount || 0);

        // 2. Premium Check
        let isPremium = !!data.premiumActive;
        if (isPremium && data.premiumExpiresAt) {
          const expires = new Date(data.premiumExpiresAt);
          if (expires < new Date()) {
            isPremium = false;
            await updateDoc(userDocRef, { premiumActive: false });
            showToast("warning", "Your Premium membership has expired.");
          } else {
            setPremiumExpiresAt(data.premiumExpiresAt);
          }
        }
        setPremiumActive(isPremium);
        if (data.dpUrl) {
          setProfilePic(data.dpUrl);
        }
        if (data.name) {
          setFullName(data.name);
        } else if (fbUser.displayName) {
          setFullName(fbUser.displayName);
        }
      } else {
        // Create user document if missing
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(userDocRef, {
          uid: fbUser.uid,
          name: fbUser.displayName || fullName || "Audio Labs User",
          email: fbUser.email,
          quota: 10,
          lastResetDate: todayStr,
          premiumActive: false,
          premiumSpinCount: 0,
          createdAt: serverTimestamp(),
        });
        setUserCredits(10);
        setPremiumActive(false);
        setPremiumSpinCount(0);
      }
    } catch (err: any) {
      console.error("Error syncing user data:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  // --- PREMIUM COUNTDOWN TICKER ---
  useEffect(() => {
    if (!premiumActive || !premiumExpiresAt) return;

    const interval = setInterval(() => {
      const expiry = new Date(premiumExpiresAt).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setPremiumActive(false);
        setPremiumExpiresAt(null);
        setPremiumCountdown("");
        showToast("warning", "Premium access expired!");
        if (user) syncUserData(user);
        clearInterval(interval);
      } else {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setPremiumCountdown(
          `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [premiumActive, premiumExpiresAt]);

  // --- AUDIO ELEMENT CONTROL ---
  useEffect(() => {
    if (!currentAudio) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(currentAudio.url);
    audioRef.current = audio;

    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleTimeUpdate = () => setAudioCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    audio.play()
      .then(() => setIsPlaying(true))
      .catch((e) => console.error("Auto-play failed:", e));

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [currentAudio]);

  // --- PLAY/PAUSE TRIGGER ---
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.error("Error playing:", e));
    }
  };

  // --- AUDIO SEEK CONTROL ---
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setAudioCurrentTime(seekTime);
  };

  // --- FORMAT TIMER ---
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --- AUTHENTICATION ACTION ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("error", "Please fill in all fields.");
      return;
    }

    setAuthLoading(true);

    try {
      if (authTab === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("success", "Welcome back to Audio Labs!");
      } else {
        if (password !== confirmPassword) {
          showToast("error", "Passwords do not match.");
          setAuthLoading(false);
          return;
        }
        if (password.length < 6) {
          showToast("error", "Password must be at least 6 characters.");
          setAuthLoading(false);
          return;
        }

        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await fbUpdateProfile(credential.user, { displayName: fullName });

        // Build User document in Firestore
        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid,
          name: fullName,
          email,
          quota: 10,
          lastResetDate: todayStr,
          premiumActive: false,
          premiumSpinCount: 0,
          createdAt: serverTimestamp(),
        });

        setUser(credential.user);
        setUserCredits(10);
        setPremiumActive(false);
        setPremiumSpinCount(0);
        showToast("success", "Account registered successfully!");
      }
    } catch (err: any) {
      let friendlyMessage = "Authentication failed.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        friendlyMessage = "Incorrect email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "This email is already registered.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Invalid email format.";
      }
      showToast("error", friendlyMessage);
      if (err.code !== "auth/invalid-credential" && err.code !== "auth/user-not-found" && err.code !== "auth/wrong-password") {
        console.error("Auth error:", err);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // --- GOOGLE SIGN-IN METHOD ---
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      showToast("success", `Welcome, ${result.user.displayName || "User"}!`);
    } catch (err: any) {
      console.error("Google login error:", err);
      let errorMessage = "Google sign-in failed.";
      
      const isUnauthorizedDomain = err.code === "auth/unauthorized-domain" || 
        (err.message && err.message.toLowerCase().includes("unauthorized-domain"));

      if (isUnauthorizedDomain) {
        setShowDomainWarning(true);
        showToast("error", "Domain not whitelisted in Firebase Auth.");
        return;
      }

      if (err.code === "auth/popup-blocked") {
        errorMessage = "Sign-in popup blocked. Please allow popups for Audio Labs.";
      } else if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-in popup closed before completion.";
      }
      showToast("error", errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  // --- MAGICAL TEXT FILL ---
  const handleMagicFill = () => {
    setScript("Welcome to Audio Labs. Turn your words into natural-sounding speech in seconds. Select a voice below and experience our state-of-the-art Voice AI!");
    showToast("info", "Sample script loaded successfully.");
  };

  // --- GENERATE TTS SPEECH ---
  const handleGenerateTTS = async () => {
    if (!script.trim()) {
      showToast("warning", "Please write or paste some text first.");
      return;
    }

    if (!premiumActive && userCredits <= 0) {
      showToast("error", "No daily credits remaining! Upgrade to Premium.");
      setActiveModal("payment");
      return;
    }

    setIsGenerating(true);

    try {
      const idToken = user && typeof user.getIdToken === "function" ? await user.getIdToken() : `mock-uid-dev`;
      const response = await fetch("/api/generate-tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          text: script,
          voiceName: selectedVoice.id,
          languageCode: selectedLanguage.code
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate text-to-speech audio.");
      }

      // Convert raw PCM to Playable WAV if needed, otherwise use raw base64
      let audioBlob: Blob;
      if (data.mimeType?.includes("pcm")) {
        audioBlob = convertPcmToWav(data.audioContent);
      } else {
        const byteCharacters = window.atob(data.audioContent);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        audioBlob = new Blob([byteArray], { type: data.mimeType || "audio/mp3" });
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const textTitle = script.length > 25 ? script.substring(0, 25) + "..." : script;

      // Update Audio Player
      setCurrentAudio({
        url: audioUrl,
        title: textTitle,
        base64: data.audioContent,
      });

      // Save to local history
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        text: script,
        voiceName: selectedVoice.id,
        timestamp: new Date().toLocaleString(),
        audioUrl: audioUrl,
      };

      const updatedHistory = [newHistoryItem, ...localHistory].slice(0, 30);
      setLocalHistory(updatedHistory);
      localStorage.setItem("audio_labs_local_history", JSON.stringify(updatedHistory));

      // Refresh credits locally if not premium
      if (!premiumActive) {
        setUserCredits((prev) => Math.max(0, prev - 1));
      }

      showToast("success", "Speech generated successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to connect to Audio generation server.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- AUDIO DOWNLOAD CONTROLLER ---
  const handleDownload = () => {
    if (!currentAudio) return;

    setIsDownloading(true);
    setDownloadProgress(10);
    const cleanFilename = `AudioLabs_${selectedVoice.id}_${Date.now()}.wav`;
    setDownloadFilename(cleanFilename);

    // Simulate preparation stages to give elegant UX
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          triggerActualDownload(cleanFilename);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  const triggerActualDownload = (cleanFilename: string) => {
    try {
      if (!currentAudio) return;

      let blob: Blob;
      if (currentAudio.base64) {
        blob = convertPcmToWav(currentAudio.base64);
      } else {
        showToast("error", "Audio data corrupted or missing.");
        setIsDownloading(false);
        return;
      }

      // Convert to Base64 data URI to be extremely compatible with Android Chrome/WebView
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64DataUri = reader.result as string;
        const link = document.createElement("a");
        link.href = base64DataUri;
        link.download = cleanFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Success Sequence
        setIsDownloading(false);
        setShowDownloadSuccess(true);
        setTimeout(() => {
          setShowDownloadSuccess(false);
        }, 3000);
      };
      reader.readAsDataURL(blob);

    } catch (err) {
      console.error("Download failed:", err);
      showToast("error", "Download operation failed.");
      setIsDownloading(false);
    }
  };

  // --- DAILY SPIN & WIN CONTROLLER ---
  const handleSpinWheel = async () => {
    if (isSpinning) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const isPremiumSpin = lastSpinDate === todayStr && premiumSpinCount > 0;

    if (lastSpinDate === todayStr && !isPremiumSpin) {
      showToast("warning", "You have already used your free daily spin! Purchase Premium to get extra spin chances.");
      return;
    }

    setIsSpinning(true);

    // 7 potential segments: 7, 6, 1, 5, 4, 2, 0
    const rewards = [7, 6, 1, 5, 4, 2, 0];
    const randomIndex = Math.floor(Math.random() * rewards.length);
    const winningReward = rewards[randomIndex];

    // Conic gradient slice calculation
    const sectorAngle = 360 / rewards.length;
    const baseRotations = 5 * 360; // 5 full loops
    const targetAngle = baseRotations + (360 - (randomIndex * sectorAngle)) - (sectorAngle / 2);

    setSpinDeg(targetAngle);

    setTimeout(async () => {
      setIsSpinning(false);
      
      // Update Balance
      const updatedCredits = userCredits + winningReward;
      setUserCredits(updatedCredits);

      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          if (isPremiumSpin) {
            const nextPremiumSpinCount = Math.max(0, premiumSpinCount - 1);
            setPremiumSpinCount(nextPremiumSpinCount);
            await updateDoc(userDocRef, {
              quota: updatedCredits,
              premiumSpinCount: nextPremiumSpinCount
            });
            showToast("success", `Premium Spin used! Congratulations! You won +${winningReward} credits!`);
          } else {
            setLastSpinDate(todayStr);
            await updateDoc(userDocRef, {
              quota: updatedCredits,
              lastSpinDate: todayStr,
            });
            showToast("success", `Daily Spin used! Congratulations! You won +${winningReward} credits!`);
          }
        } catch (err) {
          console.error("Failed to update credits in DB after spin:", err);
        }
      } else {
        // Guest mode/dev fallback
        if (isPremiumSpin) {
          setPremiumSpinCount((prev) => Math.max(0, prev - 1));
          showToast("success", `Premium Spin used! Congratulations! You won +${winningReward} credits!`);
        } else {
          setLastSpinDate(todayStr);
          showToast("success", `Daily Spin used! Congratulations! You won +${winningReward} credits!`);
        }
      }
    }, 3200);
  };

  // --- SIMULATED UPI PREMIUM TRANSACTION ---
  const handlePremiumPurchase = async () => {
    if (!user) {
      showToast("error", "Please login to purchase premium.");
      setActiveModal(null);
      setAuthTab("login");
      return;
    }

    showToast("info", "Connecting to Indian UPI payment gateway...");

    try {
      const idToken = user && typeof user.getIdToken === "function" ? await user.getIdToken() : `mock-uid-dev`;
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ amount: 5 }),
      });

      const orderData = await response.json();
      if (!response.ok) {
        throw new Error(orderData.error || "Payment gateway connection failed.");
      }

      // Open dynamic payment simulated gate modal
      setActiveModal("payment");
      (window as any).activeOrder = orderData;

    } catch (err: any) {
      showToast("error", err.message || "Failed to initiate payment.");
    }
  };

  // --- VERIFY UPI TRANSACTION SECURELY ---
  const handleVerifySimulatedPayment = async () => {
    const orderData = (window as any).activeOrder;
    if (!orderData || !user) return;

    showToast("info", "Securing verification with payment provider...");

    try {
      const idToken = user && typeof user.getIdToken === "function" ? await user.getIdToken() : `mock-uid-dev`;
      const response = await fetch("/api/payments/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paymentId: orderData.paymentId,
          orderId: orderData.orderId,
          transactionRef: "Simulated_UPI_" + Math.floor(Math.random() * 10000000),
        }),
      });

      const verificationData = await response.json();

      if (!response.ok) {
        throw new Error(verificationData.error || "Transaction verification failed.");
      }

      // Success
      setPremiumActive(true);
      setPremiumExpiresAt(verificationData.premiumExpiresAt);
      setActiveModal(null);
      showToast("success", "₹5 INR payment verified! Unlimited Premium Active!");

      // Refresh DB
      await syncUserData(user);

    } catch (err: any) {
      showToast("error", err.message || "Verification failed. Secure state untouched.");
    }
  };

  // --- IMAGE PROFILE UPLOAD (IMGBB FALLBACK) ---
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast("error", "Profile photo must be under 8MB");
      return;
    }

    showToast("info", "Uploading profile photo to Audio Labs CDN...");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Pic = reader.result as string;

        try {
          const idToken = user && typeof user.getIdToken === "function" ? await user.getIdToken() : `mock-uid-dev`;
          const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ imageBase64: base64Pic }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to host photo on CDN.");
          }

          const hostedUrl = data.url;
          setProfilePic(hostedUrl);

          // Update in Firestore User Doc
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { dpUrl: hostedUrl });
          showToast("success", "Profile picture hosted & updated!");
        } catch (uploadErr: any) {
          console.error("Upload proxy error:", uploadErr);
          showToast("error", uploadErr.message || "Failed to host profile photo.");
        }
      };
      reader.readAsDataURL(file);

    } catch (err) {
      console.error(err);
      showToast("error", "Failed to load photo file.");
    }
  };

  // --- ALTERNATING LIGHT / DARK THEME ---
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("audio_labs_theme", nextTheme);
    showToast("info", `${nextTheme === "dark" ? "Dark Mode" : "Light Mode"} activated.`);
  };

  // --- LOGOUT DISPATCHER ---
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSidebarOpen(false);
      showToast("info", "Successfully logged out.");
    } catch (err) {
      showToast("error", "Logout failed.");
    }
  };

  return (
    <div
      className={`relative min-h-[100dvh] w-full flex items-center justify-center overflow-x-hidden ${
        theme === "dark" ? "bg-[#050505] text-white" : "bg-neutral-100 text-neutral-900"
      }`}
      style={{ overscrollBehaviorY: "none" }}
    >
      {/* 1. SPLASH SCREEN (Glowing pulsing logo & scaling) */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            id="splash_screen"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <div className="relative flex flex-col items-center">
              {/* Pulsing Outer Glow */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-orange-600 to-red-600 rounded-full blur-3xl opacity-40 w-44 h-44"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />

              {/* Glowing Logo */}
              <motion.div
                className="relative z-10 flex items-center justify-center bg-gradient-to-tr from-orange-500 to-red-600 p-6 rounded-2xl shadow-[0_0_50px_rgba(255,90,0,0.5)]"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                <Volume2 className="w-16 h-16 text-white stroke-[2.5]" />
              </motion.div>

              {/* Fading In Title */}
              <motion.h1
                className="mt-8 text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                Audio Labs
              </motion.h1>

              <motion.p
                className="mt-2 text-xs uppercase tracking-widest text-neutral-500 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 1.1, duration: 0.6 }}
              >
                Text To Speech Engine
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE CONTAINER (Simulates Native Android View Centered on Desktop) */}
      <div
        id="app_shell"
        className={`relative w-full max-w-md min-h-[100dvh] flex flex-col shadow-2xl overflow-y-auto ${
          theme === "dark" ? "bg-[#0d0d0d]" : "bg-white"
        }`}
      >
        {/* 2. AUTHENTICATION (Segmented Control + Visibility toggle) */}
        {!authLoading && !user && (
          <div id="auth_container" className="relative flex-1 flex flex-col justify-center px-6 py-12 overflow-hidden">
            {/* Background Repeating Muted Video */}
            <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
              <video
                src="https://res.cloudinary.com/axtyenqr/video/upload/v1787278349/dexteromlhighlights_pindown.io_1787277328.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-70 filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[0.5px]" />
            </div>

            {/* Auth Content Elements - Contained in a high-contrast glass card */}
            <div className="relative z-10 w-full max-w-md mx-auto bg-neutral-950/80 border border-neutral-800/60 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col justify-center">
              <div className="flex flex-col items-center mb-6">
                <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-3.5 rounded-xl shadow-lg mb-3">
                  <Volume2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-center text-white">
                  Welcome to Audio Labs
                </h2>
                <p className="text-xs text-neutral-400 text-center mt-1">
                  Convert your scripts to natural voices instantly
                </p>
              </div>

              {/* Segmented Controller Tab */}
              <div className="flex bg-neutral-900/60 p-1 rounded-lg border border-neutral-800/80 mb-5">
                <button
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    authTab === "login" ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md" : "text-neutral-400"
                  }`}
                  onClick={() => setAuthTab("login")}
                >
                  LOG IN
                </button>
                <button
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    authTab === "register" ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md" : "text-neutral-400"
                  }`}
                  onClick={() => setAuthTab("register")}
                >
                  REGISTER
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {authTab === "register" && (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs focus:outline-none focus:border-orange-500 text-white transition-colors"
                      placeholder="Enter full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs focus:outline-none focus:border-orange-500 text-white transition-colors"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full px-4 py-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs focus:outline-none focus:border-orange-500 text-white pr-10 transition-colors"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-200"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authTab === "register" && (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      className="w-full px-4 py-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs focus:outline-none focus:border-orange-500 text-white transition-colors"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-extrabold rounded-xl shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all mt-2.5 text-xs tracking-wide"
                >
                  {authTab === "login" ? "LOG IN" : "REGISTER ACCOUNT"}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-x-0 h-px bg-neutral-800" />
                <span className="relative bg-neutral-950 px-3 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Or Continue With
                </span>
              </div>

              {/* Google Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-2.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs text-neutral-200 active:scale-[0.98]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.63 15.01 1 12 1 7.37 1 3.4 3.67 1.52 7.56l3.89 3.02C6.35 7.42 8.94 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.87 3.39-8.49z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.41 14.42c-.24-.71-.37-1.47-.37-2.25s.13-1.54.37-2.25L1.52 6.9C.55 8.84 0 11.02 0 13.3c0 2.28.55 4.46 1.52 6.4l3.89-3.02c-.24-.71-.37-1.47-.37-2.26z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.08-3.9 1.08-3.06 0-5.65-2.38-6.59-5.54L1.52 15.8C3.4 19.69 7.37 23 12 23z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="mt-5 flex flex-col items-center">
                <span className="text-[10px] text-neutral-500 font-semibold mb-1.5">TRY WITHOUT AN ACCOUNT</span>
                <button
                  onClick={() => setUser({ uid: "mock-uid-dev", email: "guest@audiolabs.io", displayName: "Guest User" } as any)}
                  className="px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 rounded-lg text-[10px] font-bold border border-neutral-800"
                >
                  Demo Sandbox Mode
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOADING INDICATOR */}
        {authLoading && !showSplash && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <RotateCw className="w-10 h-10 text-orange-500 animate-spin" />
            <span className="text-sm font-bold text-neutral-400 mt-4">Loading system...</span>
          </div>
        )}

        {/* MAIN APPLICATION FRAME */}
        {user && !authLoading && (
          <>
            {/* Background Playlist Video Player - 3 videos in sequence */}
            <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
              <video
                key={bgVideoIndex}
                src={backgroundPlaylist[bgVideoIndex]}
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnded}
                className="w-full h-full object-cover opacity-70 filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[0.5px]" />
            </div>

            {/* 3. MAIN APP HEADER */}
            <header
              id="app_header"
              className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between backdrop-blur-md border-b bg-neutral-950/50 border-neutral-800/40"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-1 rounded-lg hover:bg-neutral-800/20"
                  aria-label="Open sidebar"
                >
                  <Menu className="w-6 h-6 text-white" />
                </button>
                <div className="flex items-center gap-1.5">
                  <div className="bg-gradient-to-tr from-orange-500 to-red-500 p-1.5 rounded-lg">
                    <Volume2 className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text">
                    Audio Labs
                  </h1>
                </div>
              </div>

              {/* Header Right Credit Panel */}
              <div className="flex items-center gap-2">
                {premiumActive ? (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1.5 rounded-full shadow-lg border border-orange-400/20 cursor-pointer active:scale-95 transition-transform" onClick={() => setActiveModal("payment")}>
                    <Crown className="w-3.5 h-3.5 text-white animate-bounce" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">PREMIUM</span>
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveModal("payment")}
                    className="flex items-center gap-1 bg-neutral-950/80 border border-neutral-800/80 hover:border-orange-500/40 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-extrabold text-orange-500">⚡</span>
                    <span className="text-xs font-black text-white">{userCredits} Credits</span>
                  </div>
                )}
              </div>
            </header>

            {/* 24-HOUR PREMIUM EXPIRY WARNING CARD */}
            {premiumActive && (
              <div className="mx-4 mt-3 p-3 bg-red-950/30 backdrop-blur-md border border-red-900/40 rounded-xl flex items-center justify-between shadow-[0_0_15px_rgba(239,68,68,0.1)] relative z-10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-xs font-black text-red-400 tracking-wide">PREMIUM EXPIRES IN:</span>
                </div>
                <span className="text-xs font-black bg-red-900/40 px-2.5 py-1 rounded-md text-red-300 font-mono">
                  {premiumCountdown || "calculating..."}
                </span>
              </div>
            )}

            {/* MAIN APP CONTAINER */}
            <main className="flex-1 px-4 py-4 space-y-4 relative z-10">
              {/* 4. SCRIPT EDITOR CONTAINER */}
              <div className="space-y-3 bg-neutral-950/70 border border-neutral-800/40 p-4.5 rounded-2xl shadow-xl backdrop-blur-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                    Script Editor
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMagicFill}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-orange-600/10 to-red-600/10 hover:from-orange-600/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-500/40 rounded-lg text-xs font-black text-orange-500 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Magic Fill
                    </button>
                    {script && (
                      <button
                        onClick={() => setScript("")}
                        className="px-2.5 py-1.5 bg-neutral-900/60 border border-neutral-800 hover:border-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg text-xs font-bold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    className="w-full h-44 px-4 py-3.5 bg-neutral-900/40 border border-neutral-800/60 focus:border-orange-500/50 rounded-xl text-sm focus:outline-none text-white resize-none transition-colors leading-relaxed font-medium placeholder-neutral-600"
                    placeholder="Write or paste your script here..."
                    maxLength={5000}
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                  />
                  <div className="absolute bottom-3 right-4 text-[10px] font-bold text-neutral-500">
                    {script.length} / 5000
                  </div>
                </div>
              </div>

              {/* 5. CUSTOM VOICE & LANGUAGE SELECTOR CONTROLS */}
              <div className="grid grid-cols-2 gap-4 bg-neutral-950/70 border border-neutral-800/40 p-4.5 rounded-2xl shadow-xl backdrop-blur-md">
                
                {/* Language Selector */}
                <div className="space-y-3 relative">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                    Language
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLanguageSelectorOpen(!languageSelectorOpen);
                      setVoiceSelectorOpen(false);
                    }}
                    className="w-full px-3 py-3 bg-neutral-900/50 border border-neutral-800/40 hover:border-orange-500/30 rounded-xl flex items-center justify-between text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-extrabold text-white">
                        {selectedLanguage.name}
                      </div>
                    </div>
                    <ChevronUp
                      className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${
                        languageSelectorOpen ? "" : "rotate-180"
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {languageSelectorOpen && (
                      <motion.div
                        className="absolute top-16 left-0 right-0 z-40 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              setSelectedLanguage(lang);
                              setLanguageSelectorOpen(false);
                              showToast("info", `Language set to: ${lang.name}`);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center justify-between border-b border-neutral-900/60 last:border-0 hover:bg-neutral-900/50 transition-colors ${
                              selectedLanguage.code === lang.code ? "bg-orange-500/5 text-white" : ""
                            }`}
                          >
                            <span className="text-sm font-extrabold">{lang.name}</span>
                            {selectedLanguage.code === lang.code && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Voice Selector */}
                <div className="space-y-3 relative">
                  <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">
                    Voice Model
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceSelectorOpen(!voiceSelectorOpen);
                      setLanguageSelectorOpen(false);
                    }}
                    className="w-full px-3 py-3 bg-neutral-900/50 border border-neutral-800/40 hover:border-orange-500/30 rounded-xl flex items-center justify-between text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-extrabold text-white truncate max-w-[100px]">
                        {selectedVoice.name}
                      </div>
                    </div>
                    <ChevronUp
                      className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${
                        voiceSelectorOpen ? "" : "rotate-180"
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {voiceSelectorOpen && (
                      <motion.div
                        className="absolute top-16 left-0 right-0 z-40 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto w-[250px] right-auto origin-top-left"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {VOICES.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setSelectedVoice(v);
                              setVoiceSelectorOpen(false);
                              showToast("info", `Voice set to: ${v.name}`);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center justify-between border-b border-neutral-900/60 last:border-0 hover:bg-neutral-900/50 transition-colors ${
                              selectedVoice.id === v.id ? "bg-orange-500/5 text-white" : ""
                            }`}
                          >
                            <div>
                              <div className="text-sm font-extrabold flex items-center gap-2">
                                {v.name}
                                <span className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400">
                                  {v.gender}
                                </span>
                              </div>
                            </div>
                            {selectedVoice.id === v.id && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 6. CREATE ACTION BUTTON */}
              <button
                onClick={handleGenerateTTS}
                disabled={isGenerating}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:from-neutral-800 disabled:to-neutral-900 disabled:text-neutral-500 text-white font-extrabold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RotateCw className="w-5 h-5 animate-spin text-orange-500" />
                    <span>SYNTHESIZING...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5 text-white" />
                    <span>CREATE VOICE TRACK</span>
                  </>
                )}
              </button>

              {/* 7. TTS GENERATION LOADING WAVE ANIMATION */}
              {isGenerating && (
                <div className="p-6 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl flex flex-col items-center justify-center space-y-4">
                  <div className="flex gap-1.5 items-center justify-center h-12">
                    {[1, 2, 3, 4, 5, 6, 7].map((b) => (
                      <motion.div
                        key={b}
                        className="w-1.5 bg-gradient-to-t from-orange-500 to-red-600 rounded-full"
                        animate={{ height: ["15px", "45px", "15px"] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.6,
                          delay: b * 0.08,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-orange-500">Creating your audio...</p>
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-widest font-bold">
                      Do not exit the page
                    </p>
                  </div>
                </div>
              )}

              {/* 8. CUSTOM AUDIO PLAYER CARD */}
              <AnimatePresence>
                {currentAudio && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="p-4 bg-gradient-to-tr from-neutral-950 to-neutral-900 border border-orange-500/10 rounded-2xl shadow-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-gradient-to-tr from-orange-600 to-red-600 p-2.5 rounded-lg text-white">
                          <Play className="w-4 h-4 fill-white" />
                        </div>
                        <div className="max-w-[200px]">
                          <span className="text-xs font-black text-orange-500 uppercase tracking-wider block">
                            PREVIEW TRACK
                          </span>
                          <span className="text-sm font-extrabold text-white block truncate">
                            {currentAudio.title}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setCurrentAudio(null)}
                        className="text-neutral-500 hover:text-neutral-300"
                        aria-label="Close audio player"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Progress Slider Bar */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="0"
                        max={audioDuration || 1}
                        value={audioCurrentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <div className="flex justify-between text-[10px] font-black text-neutral-500 font-mono">
                        <span>{formatTime(audioCurrentTime)}</span>
                        <span>{formatTime(audioDuration)}</span>
                      </div>
                    </div>

                    {/* Controls Actions */}
                    <div className="flex justify-between items-center pt-1.5">
                      <button
                        onClick={togglePlay}
                        className="p-2.5 bg-neutral-900 hover:bg-neutral-800 rounded-xl text-white flex items-center justify-center border border-neutral-800/80 active:scale-95 transition-transform"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                      </button>

                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <>
                            <RotateCw className="w-4 h-4 animate-spin text-white" />
                            <span>PREPARING...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>DOWNLOAD WAV</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 9. DOWNLOAD SUCCESS DIALOG ANIMATION (Circular check transition) */}
              <AnimatePresence>
                {showDownloadSuccess && (
                  <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl flex flex-col items-center max-w-sm text-center shadow-2xl"
                      initial={{ scale: 0.9, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 15 }}
                    >
                      {/* Circular Progress Transform checkmark */}
                      <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                        <motion.div
                          className="absolute inset-0 border-4 border-orange-500 rounded-full"
                          initial={{ pathLength: 0, rotate: -90 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.2, ease: "easeInOut" }}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8, duration: 0.4 }}
                        >
                          <CheckCircle className="w-10 h-10 text-orange-500 fill-orange-500/10" />
                        </motion.div>
                      </div>

                      <h3 className="text-lg font-black text-white">Successfully Downloaded</h3>
                      <p className="text-xs text-neutral-400 mt-2 font-semibold truncate max-w-[250px]">
                        {downloadFilename}
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* SIDE DRAWER (Slides from Left) */}
            <AnimatePresence>
              {sidebarOpen && (
                <>
                  <motion.div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSidebarOpen(false)}
                  />
                  <motion.aside
                    id="sidebar_menu"
                    className="fixed top-0 bottom-0 left-0 z-50 w-72 bg-neutral-950 border-r border-neutral-900 flex flex-col"
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  >
                    {/* Drawer Header Profile */}
                    <div className="p-5 border-b border-neutral-900 flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={profilePic || undefined}
                          alt="Profile Pic"
                          className="w-12 h-12 rounded-full border-2 border-orange-500 object-cover"
                        />
                        {premiumActive && (
                          <div className="absolute -top-1 -right-1 bg-gradient-to-tr from-orange-500 to-red-500 p-0.5 rounded-full border border-neutral-950">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="max-w-[150px]">
                        <h4 className="font-extrabold text-sm text-white truncate">
                          {user.displayName || "User"}
                        </h4>
                        <span className="text-[10px] text-neutral-400 block truncate font-mono">{user.email}</span>
                      </div>
                    </div>

                    {/* Drawer Navigation List */}
                    <nav className="flex-1 p-4 space-y-1.5">
                      <button
                        onClick={() => {
                          setActiveModal("spin");
                          setSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 rounded-xl text-sm font-bold text-neutral-200 transition-all text-left"
                      >
                        <RotateCw className="w-4 h-4 text-orange-500" />
                        <span>Daily Spin & Win</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal("history");
                          setSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 rounded-xl text-sm font-bold text-neutral-200 transition-all text-left"
                      >
                        <HistoryIcon className="w-4 h-4 text-orange-500" />
                        <span>Generation History</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal("profile");
                          setSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 rounded-xl text-sm font-bold text-neutral-200 transition-all text-left"
                      >
                        <UserIcon className="w-4 h-4 text-orange-500" />
                        <span>My Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveModal("about");
                          setSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 rounded-xl text-sm font-bold text-neutral-200 transition-all text-left"
                      >
                        <Info className="w-4 h-4 text-orange-500" />
                        <span>About Audio Labs</span>
                      </button>

                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-900 hover:border-neutral-800 rounded-xl text-sm font-bold text-neutral-200 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          {theme === "dark" ? <Sun className="w-4 h-4 text-orange-500" /> : <Moon className="w-4 h-4 text-orange-500" />}
                          <span>Theme</span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
                          {theme}
                        </span>
                      </button>
                    </nav>

                    {/* Logout Button */}
                    <div className="p-4 border-t border-neutral-900">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 rounded-xl text-sm font-extrabold transition-all active:scale-[0.98]"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            {/* MODALS CONTROLLER */}
            <AnimatePresence>
              {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                  {/* Backdrop Closer */}
                  <div className="absolute inset-0" onClick={() => setActiveModal(null)} />

                  <motion.div
                    className="relative z-10 w-full max-w-sm bg-neutral-950 border border-neutral-800 p-6 rounded-3xl shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  >
                    {/* Header closer */}
                    <button
                      onClick={() => setActiveModal(null)}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>

                    {/* A. SPIN & WIN MODAL */}
                    {activeModal === "spin" && (
                      <div className="text-center space-y-4">
                        <div className="flex flex-col items-center">
                          <RotateCw className="w-10 h-10 text-orange-500 mb-2" />
                          <h3 className="text-lg font-black text-white">Daily Spin & Win</h3>
                          <p className="text-xs text-neutral-400">Spin the wheel daily to receive extra free credits!</p>
                          {premiumSpinCount > 0 && (
                            <span className="mt-2 inline-flex items-center gap-1 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                              🔥 {premiumSpinCount} Premium Spin{premiumSpinCount > 1 ? "s" : ""} Available!
                            </span>
                          )}
                        </div>

                        {/* Interactive Conic Gradient Wheel Graphic */}
                        <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
                          {/* Indicator Arrow pointer */}
                          <div className="absolute -top-2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-orange-500" />

                          <div
                            id="wheel_canvas"
                            className="w-full h-full rounded-full border-4 border-neutral-800 shadow-2xl relative transition-transform overflow-hidden"
                            style={{
                              transform: `rotate(${spinDeg}deg)`,
                              transition: isSpinning ? "transform 3.2s cubic-bezier(0.1, 0.8, 0.1, 1)" : "none",
                              background: "conic-gradient(#ff5a00 0% 14.28%, #151515 14.28% 28.56%, #e11d2e 28.56% 42.84%, #151515 42.84% 57.12%, #ff6a00 57.12% 71.4%, #151515 71.4% 85.68%, #e13d00 85.68% 100%)",
                            }}
                          >
                            {/* Slice reward indicators */}
                            {[7, 6, 1, 5, 4, 2, 0].map((r, i) => {
                              const angle = (360 / 7) * i + (360 / 14);
                              return (
                                <div
                                  key={i}
                                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-black text-sm select-none"
                                  style={{
                                    transform: `rotate(${angle}deg) translate(0, -75px) rotate(${-angle}deg)`,
                                  }}
                                >
                                  +{r}
                                </div>
                              );
                            })}
                          </div>

                          {/* Center hub */}
                          <div className="absolute w-12 h-12 bg-neutral-900 border-4 border-neutral-800 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-xs font-black text-orange-500">GO!</span>
                          </div>
                        </div>

                        <button
                          onClick={handleSpinWheel}
                          disabled={isSpinning}
                          className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold rounded-xl shadow-md disabled:opacity-50"
                        >
                          {isSpinning ? "SPINNING..." : "SPIN NOW"}
                        </button>
                      </div>
                    )}

                    {/* B. HISTORY MODAL */}
                    {activeModal === "history" && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <HistoryIcon className="w-5 h-5 text-orange-500" />
                          <h3 className="text-lg font-black text-white">Generation History</h3>
                        </div>

                        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                          {localHistory.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500 text-xs font-bold">
                              No audios generated yet.
                            </div>
                          ) : (
                            localHistory.map((item) => (
                              <div
                                key={item.id}
                                className="p-3 bg-neutral-900/50 border border-neutral-900 hover:border-neutral-800 rounded-xl flex items-center justify-between"
                              >
                                <div className="max-w-[200px]">
                                  <div className="text-xs font-black text-orange-500 flex items-center gap-1.5 uppercase">
                                    <span>Voice: {item.voiceName}</span>
                                    <span className="text-neutral-500">•</span>
                                    <span className="text-[10px] text-neutral-500 normal-case">{item.timestamp}</span>
                                  </div>
                                  <p className="text-xs font-medium text-neutral-200 mt-1 truncate">
                                    {item.text}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setCurrentAudio({ url: item.audioUrl, title: item.text.substring(0, 25) + "..." });
                                    setActiveModal(null);
                                  }}
                                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white"
                                >
                                  <Play className="w-4 h-4 fill-white" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* C. PROFILE MODAL */}
                    {activeModal === "profile" && (
                      user.uid === "mock-uid-dev" ? (
                        <div className="text-center space-y-6 py-6">
                          <div className="bg-neutral-900 rounded-full w-24 h-24 mx-auto flex items-center justify-center border-4 border-neutral-800">
                            <UserIcon className="w-10 h-10 text-neutral-500" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white">Guest Profile</h3>
                            <p className="text-sm text-neutral-400 mt-2">Create an account or log in to manage your profile, history, and premium features.</p>
                          </div>
                          <button
                            onClick={() => {
                              setUser(null);
                              setActiveModal(null);
                              setAuthTab("login");
                            }}
                            className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                          >
                            LOG IN / SIGN UP
                          </button>
                          
                          {/* Refer a Friend Section */}
                          <div className="mt-8 pt-6 border-t border-neutral-800">
                            <h4 className="text-md font-black text-white mb-2 text-left">Refer a Friend</h4>
                            <p className="text-xs text-neutral-400 text-left mb-4">
                              Invite your friends to Audio Labs and share the magic of AI voice generation!
                            </p>
                            <button
                              onClick={() => {
                                const shareUrl = ""; // Blank by default, as requested
                                const text = encodeURIComponent("Check out Audio Labs! ");
                                window.open(`https://wa.me/?text=${text}${shareUrl}`, '_blank');
                              }}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-xl shadow-md transition-colors"
                            >
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.12.553 4.184 1.6 6.002L.15 23.85l6.002-1.45A12.022 12.022 0 0012.031 24c6.645 0 12.031-5.385 12.031-12.031C24.062 5.385 18.676 0 12.031 0zM12.031 22.012c-1.785 0-3.535-.478-5.075-1.39l-.364-.216-3.77.908.922-3.676-.236-.376a9.988 9.988 0 01-1.49-5.251c0-5.545 4.512-10.057 10.057-10.057 5.545 0 10.057 4.512 10.057 10.057 0 5.545-4.512 10.057-10.057 10.057zm5.522-7.551c-.302-.152-1.792-.885-2.07-.987-.276-.101-.478-.152-.68.152-.202.304-.783.987-.961 1.19-.178.203-.356.228-.658.076-.303-.152-1.28-.472-2.438-1.505-.904-.805-1.512-1.798-1.69-2.102-.178-.304-.019-.469.133-.62.135-.135.303-.355.454-.533.15-.178.202-.304.303-.507.101-.203.05-.38-.025-.533-.076-.152-.68-1.642-.932-2.25-.246-.593-.497-.512-.68-.521-.178-.008-.38-.01-.582-.01-.202 0-.53.076-.807.38-.276.304-1.057 1.034-1.057 2.52 0 1.488 1.082 2.927 1.233 3.13.152.203 2.138 3.262 5.177 4.57.722.312 1.286.498 1.725.638.725.23 1.385.198 1.9.12.576-.088 1.792-.733 2.044-1.442.252-.71.252-1.318.178-1.442-.075-.125-.276-.201-.58-.354z" />
                              </svg>
                              SHARE VIA WHATSAPP
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-4">
                          <h3 className="text-lg font-black text-white">My Profile</h3>

                          <div className="flex flex-col items-center space-y-2">
                            <div className="relative group cursor-pointer" onClick={triggerImageUpload}>
                              <img
                                src={profilePic || undefined}
                                alt="Profile Picture"
                                className="w-20 h-20 rounded-full border-4 border-orange-500 object-cover shadow-lg"
                              />
                              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={handleFileChange}
                            />
                            <span className="text-[10px] uppercase font-black tracking-widest text-neutral-500">
                              Tap to change photo
                            </span>
                          </div>

                          <div className="space-y-3 text-left">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                                Display Name
                              </label>
                              <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-white"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-1">
                                Registered Email (Read Only)
                              </label>
                              <div className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-900 rounded-xl text-sm text-neutral-400 font-mono">
                                {user.email}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              if (!fullName.trim()) return;
                              try {
                                await fbUpdateProfile(user, { displayName: fullName });
                                const userDocRef = doc(db, "users", user.uid);
                                await updateDoc(userDocRef, { name: fullName });
                                showToast("success", "Profile details updated successfully!");
                                setActiveModal(null);
                              } catch (err) {
                                showToast("error", "Failed to update profile.");
                              }
                            }}
                            className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold rounded-xl shadow-md"
                          >
                            SAVE CHANGES
                          </button>

                          {/* Refer a Friend Section */}
                          <div className="mt-8 pt-6 border-t border-neutral-800">
                            <h4 className="text-md font-black text-white mb-2 text-left">Refer a Friend</h4>
                            <p className="text-xs text-neutral-400 text-left mb-4">
                              Invite your friends to Audio Labs and share the magic of AI voice generation!
                            </p>
                            <button
                              onClick={() => {
                                const shareUrl = ""; // Blank by default, as requested
                                const text = encodeURIComponent("Check out Audio Labs! ");
                                window.open(`https://wa.me/?text=${text}${shareUrl}`, '_blank');
                              }}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold rounded-xl shadow-md transition-colors"
                            >
                              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.12.553 4.184 1.6 6.002L.15 23.85l6.002-1.45A12.022 12.022 0 0012.031 24c6.645 0 12.031-5.385 12.031-12.031C24.062 5.385 18.676 0 12.031 0zM12.031 22.012c-1.785 0-3.535-.478-5.075-1.39l-.364-.216-3.77.908.922-3.676-.236-.376a9.988 9.988 0 01-1.49-5.251c0-5.545 4.512-10.057 10.057-10.057 5.545 0 10.057 4.512 10.057 10.057 0 5.545-4.512 10.057-10.057 10.057zm5.522-7.551c-.302-.152-1.792-.885-2.07-.987-.276-.101-.478-.152-.68.152-.202.304-.783.987-.961 1.19-.178.203-.356.228-.658.076-.303-.152-1.28-.472-2.438-1.505-.904-.805-1.512-1.798-1.69-2.102-.178-.304-.019-.469.133-.62.135-.135.303-.355.454-.533.15-.178.202-.304.303-.507.101-.203.05-.38-.025-.533-.076-.152-.68-1.642-.932-2.25-.246-.593-.497-.512-.68-.521-.178-.008-.38-.01-.582-.01-.202 0-.53.076-.807.38-.276.304-1.057 1.034-1.057 2.52 0 1.488 1.082 2.927 1.233 3.13.152.203 2.138 3.262 5.177 4.57.722.312 1.286.498 1.725.638.725.23 1.385.198 1.9.12.576-.088 1.792-.733 2.044-1.442.252-.71.252-1.318.178-1.442-.075-.125-.276-.201-.58-.354z" />
                              </svg>
                              SHARE VIA WHATSAPP
                            </button>
                          </div>
                        </div>
                      )
                    )}

                    {/* D. ABOUT MODAL */}
                    {activeModal === "about" && (
                      <div className="space-y-3">
                        <div className="flex flex-col items-center text-center">
                          <Volume2 className="w-10 h-10 text-orange-500 mb-2" />
                          <h3 className="text-lg font-black text-white">Audio Labs v1.1</h3>
                          <p className="text-xs text-neutral-500">Premium Text-to-Speech Web Engine</p>
                        </div>
                        <div className="text-xs text-neutral-400 leading-relaxed space-y-2.5 bg-neutral-900/40 p-4 border border-neutral-900 rounded-2xl">
                          <p>
                            Audio Labs utilizes Google Gemini 2.0 multi-speaker capabilities to convert standard scripts into natural, emotionally resonant voices in seconds.
                          </p>
                          <p>
                            Enjoy 10 free credits daily, spin our wheel of luck for bonuses, or unlock unlimited premium access for 24 hours at just ₹5 INR.
                          </p>
                        </div>
                        <div className="text-center text-[10px] text-neutral-600 font-bold">
                          © 2026 Audio Labs Inc. All rights reserved.
                        </div>
                      </div>
                    )}

                    {/* E. PREMIUM PAYMENT MODAL */}
                    {activeModal === "payment" && (
                      <div className="space-y-4">
                        {!(window as any).activeOrder ? (
                          <div className="text-center space-y-4 py-2">
                            <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-4 rounded-full inline-flex shadow-lg mb-2">
                              <Crown className="w-8 h-8 text-white fill-white/10 animate-bounce" />
                            </div>
                            <h3 className="text-xl font-black text-white">Unlock Audio Labs Premium</h3>
                            <p className="text-xs text-neutral-400">
                              Generate unlimited natural text-to-speech voice tracks for the next 24 hours.
                            </p>

                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center space-y-2">
                              <div className="text-[10px] font-black uppercase text-orange-500 tracking-widest">
                                PREMIUM BENEFITS
                              </div>
                              <ul className="text-xs text-neutral-300 space-y-1 font-semibold">
                                <li>✨ Unlimited audio generations</li>
                                <li>🚀 Zero limit/No credit deduction</li>
                                <li>🎧 Access lasts exactly 24 hours</li>
                              </ul>
                            </div>

                            <button
                              onClick={handlePremiumPurchase}
                              className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold rounded-2xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex justify-between px-6 items-center"
                            >
                              <span>GET UNLIMITED GENERATION</span>
                              <span className="bg-white/20 px-2.5 py-1 rounded-md text-xs font-black">₹5</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-center space-y-4">
                            <div className="flex items-center gap-1.5 justify-center">
                              <Clock className="w-5 h-5 text-orange-500 animate-pulse" />
                              <span className="text-xs font-black text-orange-500 uppercase tracking-wider">
                                Securing Transaction Gateway
                              </span>
                            </div>

                            <h4 className="text-sm font-extrabold text-white">Simulated Indian UPI Portal</h4>
                            
                            {/* Simulated UPI QR panel */}
                            <div className="bg-white p-4 rounded-2xl max-w-[180px] mx-auto border border-neutral-200">
                              <img
                                src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=180&h=180&fit=crop"
                                alt="UPI QR"
                                className="w-full h-full object-contain grayscale opacity-80"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            <div className="text-left bg-neutral-900 p-3 rounded-xl space-y-1 text-xs">
                              <div className="flex justify-between font-semibold">
                                <span className="text-neutral-500">Pay To:</span>
                                <span className="text-neutral-200">audiolabs@upi</span>
                              </div>
                              <div className="flex justify-between font-semibold">
                                <span className="text-neutral-500">Amount:</span>
                                <span className="text-orange-500">₹5.00 INR</span>
                              </div>
                            </div>

                            <button
                              onClick={handleVerifySimulatedPayment}
                              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-[0.98]"
                            >
                              CONFIRM UPI TRANSFER
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* CUSTOM TOAST COMPONENT NOTIFICATION OVERLAYS */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs space-y-2 px-4 pointer-events-none">
              <AnimatePresence>
                {toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 shadow-lg pointer-events-auto w-full ${
                      t.type === "success"
                        ? "bg-neutral-950/90 border-orange-500/30 text-white"
                        : t.type === "error"
                        ? "bg-neutral-950/90 border-red-500/30 text-white"
                        : t.type === "warning"
                        ? "bg-neutral-950/90 border-orange-500/30 text-white"
                        : "bg-neutral-950/90 border-neutral-800 text-neutral-200"
                    }`}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    {t.type === "success" && <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />}
                    {t.type === "error" && <X className="w-5 h-5 text-red-500 shrink-0" />}
                    {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />}
                    {t.type === "info" && <Info className="w-5 h-5 text-orange-500 shrink-0" />}
                    <span className="text-xs font-bold leading-tight">{t.message}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 10. FIREBASE AUTHORIZED DOMAINS TROUBLESHOOTING GUIDE */}
            <AnimatePresence>
              {showDomainWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4 py-6 overflow-y-auto">
                  <motion.div
                    className="w-full max-w-sm bg-neutral-950 border border-neutral-800 p-6 rounded-3xl shadow-2xl space-y-5"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="bg-red-950/40 p-3.5 rounded-2xl border border-red-900/30 mb-3.5 animate-pulse">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-lg font-black text-white leading-tight">
                        Firebase Domain Whitelist Guide
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                        Firebase Authentication blocks Google Sign-In requests from unauthorized hosting domains. Follow these steps to grant access:
                      </p>
                    </div>

                    {/* Copier Panel */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1.5 text-left">
                      <div className="text-[10px] font-black uppercase text-orange-500 tracking-wider">
                        Your Current Domain
                      </div>
                      <div className="flex items-center justify-between gap-2.5">
                        <code className="text-xs font-mono font-bold text-neutral-200 select-all truncate bg-neutral-950 px-2.5 py-1.5 rounded-lg flex-1 border border-neutral-900">
                          {window.location.hostname}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.hostname);
                            showToast("success", "Domain copied to clipboard!");
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black rounded-lg text-xs hover:from-orange-500 hover:to-red-500 active:scale-95 transition-all"
                        >
                          COPY
                        </button>
                      </div>
                    </div>

                    {/* Interactive step checklist */}
                    <div className="space-y-3 text-left">
                      <div className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                        Follow Steps Programmatically
                      </div>
                      <ol className="text-xs space-y-2.5 text-neutral-300 font-semibold list-decimal pl-4">
                        <li>
                          Open your{" "}
                          <a
                            href="https://console.firebase.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:underline"
                          >
                            Firebase Console
                          </a>
                        </li>
                        <li>Select your active project directory</li>
                        <li>
                          Navigate to <strong className="text-white">Authentication</strong> &gt;{" "}
                          <strong className="text-white">Settings</strong> (tab)
                        </li>
                        <li>
                          Scroll to <strong className="text-white">Authorized Domains</strong> and click{" "}
                          <strong className="text-white">Add Domain</strong>
                        </li>
                        <li>Paste your copied domain and click save</li>
                      </ol>
                    </div>

                    <button
                      onClick={() => setShowDomainWarning(false)}
                      className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl font-extrabold text-xs text-neutral-300 transition-all"
                    >
                      CLOSE TROUBLESHOOTER
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
