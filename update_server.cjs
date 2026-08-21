const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Replace getGeminiClient with getSarvamKey
serverCode = serverCode.replace(
  /const getGeminiClient = \(\) => {[\s\S]*?};\n/,
  `const getSarvamKey = () => {
  const apiKey = "sk_04uxes9a_nRmkhW2PbkPLLHz0mWrWWFEb";
  if (!apiKey) {
    throw new Error("SARVAM API KEY is missing");
  }
  return apiKey;
};\n`
);

// We need to change the implementation of /api/generate-tts
const generateEndpointStart = serverCode.indexOf('// 1. Text-to-Speech Generation Endpoint');
const generateEndpointEnd = serverCode.indexOf('// 2. Mock Payment Endpoints'); // Let's check if this exists

if (generateEndpointStart === -1) {
  console.log("Could not find endpoint start");
  process.exit(1);
}

const replacement = `// 1. Text-to-Speech Generation Endpoint
app.post("/api/generate-tts", verifyUser, async (req, res) => {
  const { text, voiceName, languageCode = "en-IN" } = req.body;
  const user = (req as any).user;

  if (!text || !voiceName) {
    return res.status(400).json({ error: "Missing text or voiceName" });
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: "Text exceeds the 5000 character limit" });
  }

  try {
    let hasAccess = false;
    let isPremium = false;
    let currentQuota = 0;

    // Check quota / Premium status from Firestore safely
    if (isFirebaseAdminInitialized && firebaseApp) {
      const db = getFirestore(firebaseApp);
      const userDocRef = db.collection("users").doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        await userDocRef.set({
          uid: user.uid,
          name: user.name || "Audio Labs User",
          email: user.email || "",
          quota: 10,
          lastResetDate: new Date().toISOString().split("T")[0],
          premiumActive: false,
          premiumSpinCount: 0,
          createdAt: FieldValue.serverTimestamp(),
        });
        hasAccess = true;
        currentQuota = 10;
      } else {
        const userData = userDoc.data();
        const todayStr = new Date().toISOString().split("T")[0];
        if (userData.lastResetDate !== todayStr) {
          userData.quota = 10;
          userData.lastResetDate = todayStr;
          await userDocRef.update({
            quota: 10,
            lastResetDate: todayStr,
          });
        }
        isPremium = !!userData.premiumActive;
        if (isPremium && userData.premiumExpiresAt) {
          const expiryDate = new Date(userData.premiumExpiresAt._seconds ? userData.premiumExpiresAt._seconds * 1000 : userData.premiumExpiresAt);
          if (expiryDate < new Date()) {
            isPremium = false;
            await userDocRef.update({ premiumActive: false });
          }
        }
        if (isPremium) {
          hasAccess = true;
        } else if (userData.quota > 0) {
          hasAccess = true;
          currentQuota = userData.quota;
        }
      }
    } else {
      hasAccess = true;
      isPremium = false;
      currentQuota = 10;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: "Credits exhausted. Purchase Premium for unlimited generations!" });
    }

    console.log(\`Generating TTS using Sarvam with voice \${voiceName} and language \${languageCode}\`);

    const sarvamApiKey = getSarvamKey();
    
    // Default to a known voice if not recognized
    const safeVoiceName = voiceName.toLowerCase() || "anushka";

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "API-Subscription-Key": sarvamApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: languageCode,
        speaker: safeVoiceName,
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 24000,
        enable_preprocessing: true,
        model: "bulbul:v3"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam API Error:", errText);
      throw new Error("Failed to generate voice via Sarvam API");
    }

    const data = await response.json();
    let base64Audio = "";
    
    if (data && data.audios && data.audios.length > 0) {
      base64Audio = data.audios[0];
    } else {
      throw new Error("No audio returned from Sarvam API");
    }

    if (isFirebaseAdminInitialized && firebaseApp && !isPremium) {
      const db = getFirestore(firebaseApp);
      const userDocRef = db.collection("users").doc(user.uid);
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(userDocRef);
        if (doc.exists) {
          const data = doc.data();
          const currentCredits = data.quota || 0;
          if (currentCredits > 0) {
            transaction.update(userDocRef, { quota: currentCredits - 1 });
          }
        }
      });
    }

    return res.json({
      audioContent: base64Audio,
      mimeType: "audio/wav",
    });

  } catch (error) {
    console.error("Error generating TTS:", error);
    return res.status(500).json({ error: "Failed to generate audio." });
  }
});`;

const endIdx = serverCode.indexOf('// 2. Mock Payment Endpoints');
if (endIdx !== -1) {
  serverCode = serverCode.substring(0, generateEndpointStart) + replacement + "\n\n" + serverCode.substring(endIdx);
} else {
  // If it's the last endpoint?
  console.log("Could not find endpoint end marker");
}

fs.writeFileSync('server.ts', serverCode);
