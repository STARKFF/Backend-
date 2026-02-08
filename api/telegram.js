// FORCE NODE.JS RUNTIME
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

const BOT_TOKEN = process.env.BOT_TOKEN;

const firebaseConfig = {
  apiKey: "AIzaSyDMg78IhwCT5y9DT-vuto2C_ZkoenYMW24",
  authDomain: "earny-bot.firebaseapp.com",
  projectId: "earny-bot",
  storageBucket: "earny-bot.firebasestorage.app",
  messagingSenderId: "711094202540",
  appId: "1:711094202540:web:2e8459f8cab083266b6f09"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const bot = new TelegramBot(BOT_TOKEN);

/* CREATE USER */
async function createOrEnsureUser(userId, firstName, photoURL, referralId) {
  const ref = doc(db, "users", String(userId));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
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
    await updateDoc(ref, { frontendOpened: true });
  }
}

/* REFERRAL REWARD */
async function processReferralReward(userId) {
  const ref = doc(db, "users", String(userId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const user = snap.data();
  if (!user.refferBy || user.rewardGiven !== false) return;

  await updateDoc(ref, { rewardGiven: true });

  const referrerRef = doc(db, "users", String(user.refferBy));
  await updateDoc(referrerRef, {
    coins: increment(500),
    reffer: increment(1)
  });

  await setDoc(doc(db, "ref_rewards", String(userId)), {
    userId,
    referrerId: user.refferBy,
    reward: 500,
    createdAt: serverTimestamp()
  });
}

/* WEBHOOK */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const msg = req.body.message;
    if (!msg) return res.status(200).end();

    const chatId = msg.chat.id;
    const name = msg.from.first_name || "User";
    const text = msg.text || "";

    let referralId = null;
    if (text.startsWith("/start")) {
      const p = text.split(" ");
      if (p[1]) referralId = p[1];
    }

    await createOrEnsureUser(chatId, name, null, referralId);
    await processReferralReward(chatId);

    await bot.sendMessage(chatId, `👋 Welcome ${name}!`);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false });
  }
}
