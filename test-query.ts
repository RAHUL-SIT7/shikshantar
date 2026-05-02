import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, getDocs, setDoc, where, limit } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const summarySnap = await getDocs(query(collection(db, 'resultSummary'), limit(10)));
    console.log("Summaries in DB:");
    summarySnap.forEach(d => console.log(d.data()));

    const usersSnap = await getDocs(query(collection(db, 'users'), limit(5)));
    console.log("Users in DB:");
    usersSnap.forEach(d => console.log(d.id, d.data()));

  } catch(e: any) {
    console.error("FAIL:", e);
  }
  process.exit();
}
run();
