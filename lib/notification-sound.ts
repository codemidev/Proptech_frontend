"use client";

const DB_NAME = "aviritech-notification-preferences";
const STORE = "audio";
const KEY = "custom-notification-sound";
const ENABLED_KEY = "aviritech-notification-sound-enabled";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function soundIsEnabled() {
  try { return localStorage.getItem(ENABLED_KEY) !== "false"; }
  catch { return true; }
}

export function setSoundEnabled(enabled: boolean) {
  try { localStorage.setItem(ENABLED_KEY, String(enabled)); } catch {}
}

export async function saveCustomSound(file: File) {
  if (!file.type.startsWith("audio/") || file.size > 2_000_000) {
    throw new Error("Choose an audio file smaller than 2 MB.");
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function hasCustomSound() {
  try {
    const db = await openDb();
    const result = await new Promise<boolean>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getKey(KEY);
      request.onsuccess = () => resolve(request.result !== undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  } catch { return false; }
}

export async function playNotificationSound() {
  if (!soundIsEnabled()) return;
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result as Blob | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (blob) {
      const audio = new Audio(URL.createObjectURL(blob));
      audio.volume = 0.65;
      audio.onended = () => URL.revokeObjectURL(audio.src);
      await audio.play();
      return;
    }
  } catch {}
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(1174, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.34);
    oscillator.onended = () => void context.close();
  } catch {}
}
