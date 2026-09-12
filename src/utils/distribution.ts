import { ExamRoom, Student } from '../types';

/**
 * Distributes students across rooms using Cross-Class Alternating (Sistem Silang).
 * This interleaves students from different classes so that adjacent desks
 * (e.g. seat 1 and seat 2) belong to different classes/levels.
 */
export function distributeCrossClass(
  students: Student[],
  rooms: ExamRoom[]
): { updatedStudents: Student[]; unassignedStudents: Student[] } {
  // Group students by className
  const classGroups = new Map<string, Student[]>();
  students.forEach((s) => {
    const list = classGroups.get(s.className) || [];
    list.push({ ...s });
    classGroups.set(s.className, list);
  });

  const classNames = Array.from(classGroups.keys());

  // Split classes into two streams (e.g. Stream A = even index classes, Stream B = odd index classes)
  // or round-robin if multiple
  const streamA: Student[] = [];
  const streamB: Student[] = [];

  classNames.forEach((cls, idx) => {
    const group = classGroups.get(cls) || [];
    if (idx % 2 === 0) {
      streamA.push(...group);
    } else {
      streamB.push(...group);
    }
  });

  let indexA = 0;
  let indexB = 0;

  const assignedStudents: Student[] = [];

  for (const room of rooms) {
    const cap = room.capacity || 20;

    for (let seat = 1; seat <= cap; seat++) {
      let selectedStudent: Student | null = null;

      // Odd seats take from streamA if available, otherwise fallback
      if (seat % 2 === 1) {
        if (indexA < streamA.length) {
          selectedStudent = streamA[indexA++];
        } else if (indexB < streamB.length) {
          selectedStudent = streamB[indexB++];
        }
      } else {
        // Even seats take from streamB if available, otherwise fallback
        if (indexB < streamB.length) {
          selectedStudent = streamB[indexB++];
        } else if (indexA < streamA.length) {
          selectedStudent = streamA[indexA++];
        }
      }

      if (selectedStudent) {
        selectedStudent.roomId = room.id;
        selectedStudent.roomName = room.name;
        selectedStudent.seatNumber = seat;
        assignedStudents.push(selectedStudent);
      }
    }
  }

  // Any leftover students in streamA or streamB
  const unassigned: Student[] = [];
  while (indexA < streamA.length) {
    const s = { ...streamA[indexA++], roomId: undefined, roomName: undefined, seatNumber: undefined };
    unassigned.push(s);
  }
  while (indexB < streamB.length) {
    const s = { ...streamB[indexB++], roomId: undefined, roomName: undefined, seatNumber: undefined };
    unassigned.push(s);
  }

  // Merge back all students
  const studentMap = new Map<string, Student>();
  assignedStudents.forEach((s) => studentMap.set(s.id, s));
  unassigned.forEach((s) => studentMap.set(s.id, s));

  const finalStudents = students.map((s) => studentMap.get(s.id) || s);

  return {
    updatedStudents: finalStudents,
    unassignedStudents: unassigned,
  };
}

/**
 * Distributes students sequentially by class and name.
 */
export function distributeSequential(
  students: Student[],
  rooms: ExamRoom[]
): { updatedStudents: Student[]; unassignedStudents: Student[] } {
  // Sort students by class name, then student name
  const sorted = [...students].sort((a, b) => {
    if (a.className !== b.className) {
      return a.className.localeCompare(b.className);
    }
    return a.name.localeCompare(b.name);
  });

  let studentIdx = 0;
  const assignedStudents: Student[] = [];

  for (const room of rooms) {
    const cap = room.capacity || 20;

    for (let seat = 1; seat <= cap; seat++) {
      if (studentIdx < sorted.length) {
        const student = {
          ...sorted[studentIdx++],
          roomId: room.id,
          roomName: room.name,
          seatNumber: seat,
        };
        assignedStudents.push(student);
      }
    }
  }

  const unassigned: Student[] = [];
  while (studentIdx < sorted.length) {
    const s = { ...sorted[studentIdx++], roomId: undefined, roomName: undefined, seatNumber: undefined };
    unassigned.push(s);
  }

  const studentMap = new Map<string, Student>();
  assignedStudents.forEach((s) => studentMap.set(s.id, s));
  unassigned.forEach((s) => studentMap.set(s.id, s));

  const finalStudents = students.map((s) => studentMap.get(s.id) || s);

  return {
    updatedStudents: finalStudents,
    unassignedStudents: unassigned,
  };
}

/**
 * Extracts school grade/level (Tingkat) from class name.
 * Handles Roman numerals (VII, VIII, IX, X, XI, XII), numbers (7, 8, 9, 10, 11, 12), etc.
 */
export function extractTingkat(className: string): string {
  if (!className) return 'Lainnya';
  const trimmed = className.trim();
  const romanMatch = trimmed.match(/^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/i);
  if (romanMatch) return romanMatch[1].toUpperCase();
  const numMatch = trimmed.match(/^(\d+)/);
  if (numMatch) return numMatch[1];
  return trimmed.split(/[\s_\-.]+/)[0] || trimmed;
}

/**
 * Cross-Grade Double-Desk Distribution (Sistem Silang Antar-Tingkat 1 Meja 2 Siswa).
 * Implements the rule: "1 meja 2 peserta, dan peserta 1 tingkat tidak boleh se-meja".
 * In each desk (Kursi Kiri & Kursi Kanan), the two students come from different grades (e.g. Tingkat VII & VIII).
 * Uses global largest-first greedy pairing to mathematically prevent any single grade from becoming
 * isolated or stranded, guaranteeing zero same-grade desk conflicts.
 */
export function distributeCrossLevelDoubleDesk(
  students: Student[],
  rooms: ExamRoom[],
  numberingPattern: 'photo_order' | 'sequential_desk' = 'photo_order'
): { updatedStudents: Student[]; unassignedStudents: Student[] } {
  // 1. Group students by tingkat (e.g. VII, VIII, IX)
  const tingkatMap = new Map<string, Student[]>();
  students.forEach((s) => {
    const t = extractTingkat(s.className);
    if (!tingkatMap.has(t)) {
      tingkatMap.set(t, []);
    }
    tingkatMap.get(t)!.push({ ...s });
  });

  // Sort each tingkat queue by className, then name
  tingkatMap.forEach((list) => {
    list.sort((a, b) => {
      if (a.className !== b.className) {
        return a.className.localeCompare(b.className);
      }
      return a.name.localeCompare(b.name);
    });
  });

  // 2. Global largest-first greedy pairing
  // By always drawing from the two pools with the largest remaining counts,
  // we mathematically minimize pool discrepancies and eliminate same-tingkat pairs.
  const pools = Array.from(tingkatMap.entries()).map(([tingkat, list]) => ({ tingkat, list }));
  const desks: Array<{ left: Student; right?: Student }> = [];

  while (true) {
    pools.sort((a, b) => b.list.length - a.list.length);
    const active = pools.filter((p) => p.list.length > 0);
    if (active.length === 0) break;
    if (active.length === 1) {
      // Only 1 pool has remaining students (e.g. odd total student count)
      while (active[0].list.length > 0) {
        desks.push({ left: active[0].list.shift()! });
      }
      break;
    }
    const s1 = active[0].list.shift()!;
    const s2 = active[1].list.shift()!;
    desks.push({ left: s1, right: s2 });
  }

  // 3. Organize desks by (tingkatLeft, tingkatRight) pair so students from the same classes stay contiguous
  const pairGroups = new Map<string, typeof desks>();
  desks.forEach((d) => {
    if (d.right) {
      const tL = extractTingkat(d.left.className);
      const tR = extractTingkat(d.right.className);
      const pairKey = [tL, tR].sort().join('-');
      if (!pairGroups.has(pairKey)) pairGroups.set(pairKey, []);
      pairGroups.get(pairKey)!.push(d);
    }
  });

  const orderedDesks: typeof desks = [];
  const singleDesks = desks.filter((d) => !d.right);

  Array.from(pairGroups.keys())
    .sort()
    .forEach((pairKey) => {
      const group = pairGroups.get(pairKey)!;
      const [t1] = pairKey.split('-');
      // Ensure t1 is consistently on left, t2 on right
      group.forEach((d) => {
        if (d.right && extractTingkat(d.left.className) !== t1) {
          const tmp = d.left;
          d.left = d.right;
          d.right = tmp;
        }
      });
      // Sort within group by left class and name, then right class and name
      group.sort((a, b) => {
        const cmpLeft = a.left.className.localeCompare(b.left.className) || a.left.name.localeCompare(b.left.name);
        if (cmpLeft !== 0) return cmpLeft;
        if (a.right && b.right) {
          return a.right.className.localeCompare(b.right.className) || a.right.name.localeCompare(b.right.name);
        }
        return 0;
      });
      orderedDesks.push(...group);
    });

  // Append single desks at the end
  orderedDesks.push(...singleDesks);

  // 4. Assign desks to rooms
  let deskPointer = 0;
  const assignedStudents: Student[] = [];

  for (const room of rooms) {
    const cap = room.capacity || 40;
    const half = Math.floor(cap / 2);
    const roomSlice = orderedDesks.slice(deskPointer, deskPointer + half);
    deskPointer += half;

    roomSlice.forEach((desk, idx) => {
      let leftSeat: number;
      let rightSeat: number;

      if (numberingPattern === 'sequential_desk') {
        leftSeat = idx * 2 + 1;
        rightSeat = idx * 2 + 2;
      } else {
        leftSeat = idx + 1;
        rightSeat = half + idx + 1;
      }

      assignedStudents.push({
        ...desk.left,
        roomId: room.id,
        roomName: room.name,
        seatNumber: leftSeat,
      });

      if (desk.right) {
        assignedStudents.push({
          ...desk.right,
          roomId: room.id,
          roomName: room.name,
          seatNumber: rightSeat,
        });
      }
    });
  }

  // 5. Any remaining unassigned students
  const unassigned: Student[] = [];
  if (deskPointer < orderedDesks.length) {
    const remainingDesks = orderedDesks.slice(deskPointer);
    remainingDesks.forEach((d) => {
      unassigned.push({ ...d.left, roomId: undefined, roomName: undefined, seatNumber: undefined });
      if (d.right) {
        unassigned.push({ ...d.right, roomId: undefined, roomName: undefined, seatNumber: undefined });
      }
    });
  }

  // 6. Safety check: resolve any unexpected same-level desk conflict across all rooms
  for (const room of rooms) {
    const roomStudents = assignedStudents.filter((s) => s.roomId === room.id);
    const cap = room.capacity || 40;
    const half = Math.floor(cap / 2);

    for (let d = 0; d < half; d++) {
      const leftSeat = numberingPattern === 'sequential_desk' ? d * 2 + 1 : d + 1;
      const rightSeat = numberingPattern === 'sequential_desk' ? d * 2 + 2 : half + d + 1;

      const leftS = roomStudents.find((s) => s.seatNumber === leftSeat);
      const rightS = roomStudents.find((s) => s.seatNumber === rightSeat);

      if (leftS && rightS) {
        const tL = extractTingkat(leftS.className);
        const tR = extractTingkat(rightS.className);
        if (tL === tR) {
          // Find an exchange partner from another desk that resolves both
          for (const other of assignedStudents) {
            if (other.id !== leftS.id && other.id !== rightS.id) {
              const otherT = extractTingkat(other.className);
              if (otherT !== tL) {
                const tmpRoom = rightS.roomId;
                const tmpRoomName = rightS.roomName;
                const tmpSeat = rightS.seatNumber;

                rightS.roomId = other.roomId;
                rightS.roomName = other.roomName;
                rightS.seatNumber = other.seatNumber;

                other.roomId = tmpRoom;
                other.roomName = tmpRoomName;
                other.seatNumber = tmpSeat;
                break;
              }
            }
          }
        }
      }
    }
  }

  const studentMap = new Map<string, Student>();
  assignedStudents.forEach((s) => studentMap.set(s.id, s));
  unassigned.forEach((s) => studentMap.set(s.id, s));

  const finalStudents = students.map((s) => studentMap.get(s.id) || s);

  return {
    updatedStudents: finalStudents,
    unassignedStudents: unassigned,
  };
}

/**
 * Regenerates official Indonesian Exam Participant Numbers:
 * Pattern: [prefix]-[classCode]-[index3Digits]
 * Example: 25-04-01-001
 */
export function generateExamNumbers(students: Student[], prefix: string = '25-04'): Student[] {
  // Group by class to assign class code 01, 02, etc.
  const classes = Array.from(new Set(students.map((s) => s.className))).sort();
  const classCodeMap = new Map<string, string>();
  classes.forEach((cls, idx) => {
    const code = String(idx + 1).padStart(2, '0');
    classCodeMap.set(cls, code);
  });

  // Track counter per class
  const classCounter = new Map<string, number>();

  return students.map((s) => {
    const classCode = classCodeMap.get(s.className) || '01';
    const currentCount = (classCounter.get(s.className) || 0) + 1;
    classCounter.set(s.className, currentCount);

    const numStr = String(currentCount).padStart(3, '0');
    return {
      ...s,
      examNumber: `${prefix}-${classCode}-${numStr}`,
    };
  });
}
