import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ExamConfig,
  ExamRoom,
  Student,
  Proctor,
  ExamScheduleItem,
  ProctorAttendanceRecord,
  ExamGradeItem,
  SubjectGradingConfig,
  ExamDispensation,
} from '../types';

// Suppress noisy Firestore connection warnings in browser preview/sandboxes
setLogLevel('silent');

// Initialize Firebase App safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICAL: Initialize Firestore with custom databaseId and long polling
// to prevent 10-second backend timeout warnings in web iframes and proxied environments
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);

// Error Handling Enum and Interface
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn(`Firestore [${operationType}] note on ${path}:`, errInfo.error);
}

// Helper to prevent any Firebase promise from hanging indefinitely
export async function withTimeout<T>(promise: Promise<T>, ms: number = 3500): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firebase timeout (${ms}ms)`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// Connection Validation on Boot
export async function testConnection(): Promise<boolean> {
  try {
    const probe = getDoc(doc(db, 'exam_config', 'current'));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    );
    await Promise.race([probe, timeout]);
    return true;
  } catch {
    return false;
  }
}

// --- REAL-TIME LISTENERS & CRUD METHODS ---

// 1. Exam Configuration
export function subscribeToExamConfig(
  onUpdate: (config: ExamConfig | null) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, 'exam_config', 'current');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as ExamConfig);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'exam_config/current');
    }
  );
}

export async function saveExamConfigToCloud(config: ExamConfig): Promise<void> {
  const path = 'exam_config/current';
  try {
    const docRef = doc(db, 'exam_config', 'current');
    // Ensure clean serializable object
    const cleanConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, cleanConfig);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 2. Exam Rooms
export function subscribeToRooms(
  onUpdate: (rooms: ExamRoom[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'rooms');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ExamRoom[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<ExamRoom, 'id'>) });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    }
  );
}

export async function saveRoomToCloud(room: ExamRoom): Promise<void> {
  const path = `rooms/${room.id}`;
  try {
    await setDoc(doc(db, 'rooms', room.id), {
      ...room,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRoomFromCloud(roomId: string): Promise<void> {
  const path = `rooms/${roomId}`;
  try {
    await deleteDoc(doc(db, 'rooms', roomId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncRoomsToCloud(rooms: ExamRoom[]): Promise<void> {
  try {
    // Write in batches of up to 400
    const batchSize = 400;
    for (let i = 0; i < rooms.length; i += batchSize) {
      const chunk = rooms.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((r) => {
        const ref = doc(db, 'rooms', r.id);
        batch.set(ref, {
          ...r,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'rooms');
  }
}

// 3. Students
export function subscribeToStudents(
  onUpdate: (students: Student[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'students');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Student[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<Student, 'id'>) });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'students');
    }
  );
}

export async function saveStudentToCloud(student: Student): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(doc(db, 'students', student.id), {
      ...student,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentFromCloud(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteStudentsBatchFromCloud(studentIds: string[]): Promise<void> {
  if (!db || studentIds.length === 0) return;
  try {
    const batchSize = 400;
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const chunk = studentIds.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        batch.delete(doc(db, 'students', id));
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'students');
  }
}

export async function clearAllStudentsFromCloud(): Promise<void> {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'students'));
    const batchSize = 400;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'students');
  }
}


export async function syncStudentsToCloud(students: Student[]): Promise<void> {
  try {
    const batchSize = 400;
    for (let i = 0; i < students.length; i += batchSize) {
      const chunk = students.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((s) => {
        const ref = doc(db, 'students', s.id);
        batch.set(ref, {
          ...s,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'students');
  }
}

// 4. Proctors
export function subscribeToProctors(
  onUpdate: (proctors: Proctor[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'proctors');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Proctor[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<Proctor, 'id'>) });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'proctors');
    }
  );
}

export async function saveProctorToCloud(proctor: Proctor): Promise<void> {
  const path = `proctors/${proctor.id}`;
  try {
    await setDoc(doc(db, 'proctors', proctor.id), {
      ...proctor,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProctorFromCloud(proctorId: string): Promise<void> {
  const path = `proctors/${proctorId}`;
  try {
    await deleteDoc(doc(db, 'proctors', proctorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncProctorsToCloud(proctors: Proctor[]): Promise<void> {
  try {
    const batchSize = 400;
    for (let i = 0; i < proctors.length; i += batchSize) {
      const chunk = proctors.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((p) => {
        const ref = doc(db, 'proctors', p.id);
        batch.set(ref, {
          ...p,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'proctors');
  }
}

// 5. Schedules
export function subscribeToSchedules(
  onUpdate: (schedules: ExamScheduleItem[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'schedules');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: (ExamScheduleItem & { orderIndex?: number })[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<ExamScheduleItem, 'id'>) });
      });
      // Sort by orderIndex to keep exact sequence as arranged or imported
      items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'schedules');
    }
  );
}

export async function clearAllSchedulesFromCloud(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'schedules'));
    const batchSize = 400;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'schedules');
  }
}

export async function syncSchedulesToCloud(schedules: ExamScheduleItem[]): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'schedules'));
    const newIds = new Set(schedules.map((s) => s.id));
    const staleDocs = snap.docs.filter((d) => !newIds.has(d.id));

    const batchSize = 400;
    // 1. Delete all stale/removed docs so old schedules don't persist or reappear
    for (let i = 0; i < staleDocs.length; i += batchSize) {
      const chunk = staleDocs.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    // 2. Set/update active schedules with orderIndex
    for (let i = 0; i < schedules.length; i += batchSize) {
      const chunk = schedules.slice(i, i + batchSize);
      const batch = writeBatch(db);
      chunk.forEach((s, idx) => {
        const ref = doc(db, 'schedules', s.id);
        batch.set(ref, {
          ...s,
          orderIndex: i + idx,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'schedules');
  }
}

// 6. Attendance Records (Real-Time Digital Proctor Presensi)
export function subscribeToAttendanceRecords(
  onUpdate: (records: ProctorAttendanceRecord[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'attendance_records');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ProctorAttendanceRecord[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<ProctorAttendanceRecord, 'id'>) });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'attendance_records');
    }
  );
}

export async function saveAttendanceRecordToCloud(
  record: ProctorAttendanceRecord
): Promise<void> {
  const path = `attendance_records/${record.id}`;
  try {
    await setDoc(doc(db, 'attendance_records', record.id), {
      ...record,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAttendanceRecordFromCloud(recordId: string): Promise<void> {
  const path = `attendance_records/${recordId}`;
  try {
    await deleteDoc(doc(db, 'attendance_records', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 7. Proctor Schedule Matrix
export function subscribeToProctorMatrix(
  onUpdate: (matrix: Record<string, { proctorId?: string; proctorName: string; nip?: string }> | null) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, 'proctor_matrix', 'current');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate(data.allocations || null);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'proctor_matrix/current');
    }
  );
}

export async function saveProctorMatrixToCloud(
  allocations: Record<string, { proctorId?: string; proctorName: string; nip?: string }>
): Promise<void> {
  const path = 'proctor_matrix/current';
  try {
    await setDoc(doc(db, 'proctor_matrix', 'current'), {
      id: 'current',
      allocations,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Master check if Cloud Database is empty
export async function isCloudDatabaseInitialized(): Promise<boolean> {
  try {
    const configDoc = await getDocs(collection(db, 'rooms'));
    return !configDoc.empty;
  } catch {
    // If backend is unreachable or offline, do not trigger auto-sync flood
    return true;
  }
}

export async function isCloudGradesEmpty(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'subject_grades'));
    return snap.empty;
  } catch {
    return false;
  }
}

export async function getCloudGrades(): Promise<ExamGradeItem[]> {
  try {
    const colRef = collection(db, 'subject_grades');
    const snapshot = await withTimeout(getDocs(colRef), 3500);
    const allGrades: ExamGradeItem[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data && Array.isArray(data.grades)) {
        allGrades.push(...data.grades);
      }
    });
    return allGrades;
  } catch (err) {
    console.warn('Error fetching cloud grades:', err);
    return [];
  }
}

// --- GRADES REAL-TIME SYNCHRONIZATION ---

export function getSafeSubjectKey(subject: string): string {
  // Safe document ID from subject name (handles spaces, symbols, slashes)
  return encodeURIComponent(subject.trim().toLowerCase()).replace(/%/g, '_');
}

// 8. Subject Grades (Real-time Cross-device Sync)
export function subscribeToSubjectGrades(
  onUpdate: (grades: ExamGradeItem[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'subject_grades');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const allGrades: ExamGradeItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data && Array.isArray(data.grades)) {
          allGrades.push(...data.grades);
        }
      });
      onUpdate(allGrades);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'subject_grades');
    }
  );
}

export async function saveSubjectGradesToCloud(
  subject: string,
  subjectGrades: ExamGradeItem[]
): Promise<void> {
  const safeKey = getSafeSubjectKey(subject);
  const path = `subject_grades/${safeKey}`;
  try {
    const docRef = doc(db, 'subject_grades', safeKey);
    // Sanitize grades to ensure no undefined values are written to Firestore
    const sanitized = subjectGrades.map((g) => {
      const clean: Record<string, any> = {};
      Object.entries(g).forEach(([k, v]) => {
        if (v !== undefined) clean[k] = v;
      });
      return clean;
    });

    await withTimeout(
      setDoc(docRef, {
        subject,
        safeKey,
        grades: sanitized,
        updatedAt: new Date().toISOString(),
      }),
      3500
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function syncAllGradesToCloud(grades: ExamGradeItem[]): Promise<void> {
  try {
    // Group grades by subject
    const bySubject = new Map<string, ExamGradeItem[]>();
    grades.forEach((g) => {
      const s = g.subject || 'Lainnya';
      if (!bySubject.has(s)) bySubject.set(s, []);
      bySubject.get(s)!.push(g);
    });

    for (const [subject, list] of bySubject.entries()) {
      await saveSubjectGradesToCloud(subject, list).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'subject_grades');
  }
}

// 9. Grading Configs (KKM and weights per subject)
export function subscribeToGradingConfigs(
  onUpdate: (configs: Record<string, SubjectGradingConfig>) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, 'grading_configs', 'current');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.configs) {
          onUpdate(data.configs as Record<string, SubjectGradingConfig>);
        }
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'grading_configs/current');
    }
  );
}

export async function saveGradingConfigsToCloud(
  configs: Record<string, SubjectGradingConfig>
): Promise<void> {
  const path = 'grading_configs/current';
  try {
    const docRef = doc(db, 'grading_configs', 'current');
    await setDoc(docRef, {
      id: 'current',
      configs,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 10. Custom Master Subjects (Daftar Mata Pelajaran)
export function subscribeToCustomSubjects(
  onUpdate: (subjects: string[]) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, 'custom_subjects', 'current');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.subjects) && data.subjects.length > 0) {
          onUpdate(data.subjects);
        }
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'custom_subjects/current');
    }
  );
}

export async function saveCustomSubjectsToCloud(subjects: string[]): Promise<void> {
  const path = 'custom_subjects/current';
  try {
    const docRef = doc(db, 'custom_subjects', 'current');
    await setDoc(docRef, {
      id: 'current',
      subjects,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 11. Dispensations (Surat Dispensasi)
export function subscribeToDispensations(
  onUpdate: (dispensations: ExamDispensation[]) => void,
  onError?: (err: unknown) => void
) {
  const colRef = collection(db, 'dispensations');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ExamDispensation[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<ExamDispensation, 'id'>) });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'dispensations');
    }
  );
}

export async function saveDispensationToCloud(disp: ExamDispensation): Promise<void> {
  const path = `dispensations/${disp.id}`;
  try {
    await setDoc(doc(db, 'dispensations', disp.id), {
      ...disp,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDispensationFromCloud(dispId: string): Promise<void> {
  const path = `dispensations/${dispId}`;
  try {
    await deleteDoc(doc(db, 'dispensations', dispId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
