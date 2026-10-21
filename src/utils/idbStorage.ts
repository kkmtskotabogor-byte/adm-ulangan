import { ExamGradeItem } from '../types';

const DB_NAME = 'sim_ujian_mts_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_keyval';

/**
 * Open or create IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic IndexedDB get
 */
export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('idbGet warning:', err);
    return null;
  }
}

/**
 * Generic IndexedDB set
 */
export async function idbSet<T>(key: string, val: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(val, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('idbSet warning:', err);
  }
}

/**
 * Generic IndexedDB delete
 */
export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('idbDelete warning:', err);
  }
}

/**
 * Safe localStorage setter that never crashes the app on QuotaExceededError
 */
export function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: unknown) {
    const isQuota =
      err instanceof Error &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        (err as { code?: number }).code === 22 ||
        (err as { code?: number }).code === 1014);

    if (isQuota) {
      console.warn(
        `[Storage] QuotaExceededError on localStorage.setItem("${key}"). Gracefully bypassed.`
      );
    } else {
      console.warn(`[Storage] Failed to set localStorage key "${key}":`, err);
    }
    return false;
  }
}

/**
 * Persists grades reliably across IndexedDB (unlimited quota) and localStorage (when size permits)
 */
export async function persistGradesReliably(grades: ExamGradeItem[]): Promise<void> {
  if (!Array.isArray(grades)) return;

  // 1. Always store in IndexedDB (handles 10,000+ student grades without 5MB limits)
  await idbSet('sim_ujian_grades_v1', grades);

  // 2. Attempt saving to localStorage for instant synchronous startup
  const jsonStr = JSON.stringify(grades);
  const ok = safeSetLocalStorage('sim_ujian_grades_v1', jsonStr);

  if (!ok) {
    // If quota was exceeded, write a lightweight metadata pointer
    safeSetLocalStorage(
      'sim_ujian_grades_v1_meta',
      JSON.stringify({ inIdb: true, count: grades.length, updatedAt: new Date().toISOString() })
    );
  }
}

/**
 * Loads grades checking IndexedDB first, with localStorage fallback
 */
export async function loadGradesReliably(): Promise<ExamGradeItem[] | null> {
  // 1. Check IndexedDB
  try {
    const fromIdb = await idbGet<ExamGradeItem[]>('sim_ujian_grades_v1');
    if (Array.isArray(fromIdb) && fromIdb.length > 0) {
      return fromIdb;
    }
  } catch (err) {
    console.warn('loadGradesReliably IDB note:', err);
  }

  // 2. Check localStorage
  try {
    const saved = localStorage.getItem('sim_ujian_grades_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Backfill into IndexedDB asynchronously
        idbSet('sim_ujian_grades_v1', parsed).catch(() => {});
        return parsed;
      }
    }
  } catch (err) {
    console.warn('loadGradesReliably localStorage note:', err);
  }

  return null;
}
