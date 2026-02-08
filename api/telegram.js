// ✅ FORCE NODE.JS RUNTIME (VERY IMPORTANT)
export const config = {
  runtime: "nodejs"
};

import TelegramBot from "node-telegram-bot-api";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "firebase/firestore";

/* =========================
   TELEGRAM BOT TOKEN
========================= */
const BOT_TOKEN = process.env.BOT_TOKEN;

/* =========================
   FIREBASE CONFIG
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyDMg78IhwCT5y9DT-vuto2C_ZkoenYMW24",
  authDomain: "earny-bot.firebaseapp.com",
  projectId: "earny-bot",
  storageBucket: "earny-bot.firebasestorage.app",
  messagingSenderId: "711094202540",
  appId: "1:711094202540:web:2e8459f8cab083266b6f09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Telegram Bot (Webhook Mode)
const bot = new TelegramBot(BOT_TOKEN);

/* =========================
   CREATE OR ENSURE USER
========================= */
async function createOrEnsureUser(userId, firstName, photoURL, referralId) {
  const userRef = doc(db, "users", String(userId));
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      id: userId,
      name: firstName,
      photoURL: photoURL || null,
      coins: 0,
      reffer: 0,
      refferBy: referralId || null,
      tasksCompleted: 0,
      totalWithdrawals: 0,
      frontendOpened: true,
      rewardGiven: false
    });
  } else {
    await updateDoc(userRef, {
      frontendOpened: true
    });
  }
}

/* =========================
   PROCESS REFERRAL (ONE TIME)
========================= */
async function processReferralReward(userId) {
  const userRef = doc(db, "users", String(userId));
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const user = snap.data();

  if (
    user.frontendOpened === true &&
    user.rewardGiven === false &&
    user.refferBy
  ) {
    const referrerRef = doc(db, "users", String(user.refferBy));
    const refSnap = await getDoc(referrerRef);
    if (!refSnap.exists()) return;

    // Mark reward given first (idempotent safety)
    await updateDoc(userRef, {
      rewardGiven: true
    });

    // Reward referrer
    await updateDoc(referrerRef, {
      coins: increment(500),
      reffer: increment(1)
    });

    // Ledger entry
    await setDoc(doc(db, "ref_rewards", String(userId)), {
      userId: userId,
      referrerId: user.refferBy,
      reward: 500,
      createdAt: serverTimestamp()
    });
  }
}

/* =========================
   WEBHOOK HANDLER
========================= */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false });
    }

    const update = req.body;
    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || "User";
    const photoURL = msg.from.photo_url || null;
    const text = msg.text || "";

    // Extract referral ID
    let referralId = null;
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      if (parts.length > 1) referralId = parts[1];
    }

    // Create / update user
    await createOrEnsureUser(chatId, firstName, photoURL, referralId);

    // Process referral reward
    await processReferralReward(chatId);

    // Welcome Message
    const caption = `👋 Hi! Welcome ${firstName} ⭐

Yaha aap tasks complete karke real rewards kama sakte ho!

🔥 Daily Tasks
🔥 Video Watch
🔥 Mini Apps
🔥 Referral Bonus
🔥 Auto Wallet System

Ready to earn?
Tap START and your journey begins!`;

    await bot.sendPhoto(
      chatId,
      "https://i.ibb.co/CKK6Hyqq/1e48400d0ef9.jpg",
      {
        caption,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "▶ Open App",
                web_app: {
                  url: "https://khanbhai009-cloud.github.io/Telegram-bot-web"
                }
              }
            ],
            [
              { text: "📢 Channel", url: "https://t.me/finisher_tech" },
              { text: "🌐 Community", url: "https://t.me/finisher_techg" }
            ]
          ]
        }
      }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
}
/* =========================
   CREATE OR UPDATE USER
========================= */
async function createOrEnsureUser(userId, firstName, photoURL, referralId) {
  const userRef = doc(db, "users", String(userId));
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      id: userId,
      name: firstName,
      photoURL: photoURL || null,
      coins: 0,
      reffer: 0,
      refferBy: referralId || null,
      tasksCompleted: 0,
      totalWithdrawals: 0,
      frontendOpened: true,
      rewardGiven: false
    });
  } else {
    await updateDoc(userRef, {
      frontendOpened: true
    });
  }
}

/* =========================
   REFERRAL REWARD (ONE TIME)
========================= */
async function processReferralReward(userId) {
  const userRef = doc(db, "users", String(userId));
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const user = snap.data();

  if (
    user.frontendOpened === true &&
    user.rewardGiven === false &&
    user.refferBy
  ) {
    const referrerRef = doc(db, "users", String(user.refferBy));
    const refSnap = await getDoc(referrerRef);
    if (!refSnap.exists()) return;

    // Mark reward given (IDEMPOTENT)
    await updateDoc(userRef, { rewardGiven: true });

    // Reward referrer
    await updateDoc(referrerRef, {
      coins: increment(500),
      reffer: increment(1)
    });

    // Ledger entry
    await setDoc(doc(db, "ref_rewards", String(userId)), {
      userId: userId,
      referrerId: user.refferBy,
      reward: 500,
      createdAt: serverTimestamp()
    });
  }
}

/* =========================
   WEBHOOK HANDLER
========================= */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  const update = req.body;
  if (!update.message) {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message;
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "User";
  const photoURL = msg.from.photo_url || null;
  const text = msg.text || "";

  // Referral extract
  let referralId = null;
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    if (parts.length > 1) referralId = parts[1];
  }

  // User ensure
  await createOrEnsureUser(chatId, firstName, photoURL, referralId);

  // Referral reward
  await processReferralReward(chatId);

  // Welcome message
  const caption = `👋 Hi! Welcome ${firstName} ⭐

Yaha aap tasks complete karke real rewards kama sakte ho!

🔥 Daily Tasks
🔥 Video Watch
🔥 Mini Apps
🔥 Referral Bonus
🔥 Auto Wallet System

Ready to earn?
Tap START and your journey begins!`;

  await bot.sendPhoto(
    chatId,
    "https://i.ibb.co/CKK6Hyqq/1e48400d0ef9.jpg",
    {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "▶ Open App",
              web_app: {
                url: "https://khanbhai009-cloud.github.io/Telegram-bot-web"
              }
            }
          ],
          [
            { text: "📢 Channel", url: "https://t.me/finisher_tech" },
            { text: "🌐 Community", url: "https://t.me/finisher_techg" }
          ]
        ]
      }
    }
  );

  return res.status(200).json({ ok: true });
  }
