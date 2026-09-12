import { Proctor, ProctorAttendanceRecord } from '../types';

// Crisp SVG signature data URLs in royal blue pen ink
const sampleSig1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M 20 40 Q 40 10 55 35 T 80 30 Q 100 20 120 45 Q 140 25 150 35 M 35 48 Q 80 52 140 45" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const sampleSig2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M 25 35 Q 35 15 50 38 Q 70 5 85 40 T 110 30 Q 130 20 145 35 M 40 50 L 135 46" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const sampleSig3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M 15 45 C 30 15 50 10 60 40 C 70 20 85 25 105 38 C 120 30 135 15 145 42 M 25 52 Q 85 54 135 48" fill="none" stroke="%230f172a" stroke-width="2.5" stroke-linecap="round"/></svg>`;
const sampleSig4 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M 20 35 Q 35 15 65 30 T 100 25 Q 120 35 140 28 M 30 45 Q 70 50 130 46" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/></svg>`;

export const getInitialAttendanceRecords = (
  proctors: Proctor[],
  scheduleId: string = 'sch-1',
  subject: string = 'Matematika'
): ProctorAttendanceRecord[] => {
  const sampleSignatures = [sampleSig1, sampleSig2, sampleSig3, sampleSig4];
  const assigned = proctors.filter((p) => p.assignedRoomId);
  
  // Seed first 6 proctors with realistic pre-checked-in data
  return assigned.slice(0, 6).map((p, idx) => {
    const min = 40 + idx * 3;
    const timeStr = `06.${min < 10 ? '0' + min : min} WIB`;
    return {
      id: `att-seed-${scheduleId}-${p.id}`,
      proctorId: p.id,
      proctorName: p.name,
      proctorNip: p.nip,
      scheduleId: scheduleId,
      subject: subject,
      examDate: '17 Maret 2025',
      sessionTime: '07.30 - 09.30',
      roomId: p.assignedRoomId,
      roomCode: p.assignedRoomCode,
      position: p.assignedPosition,
      status: 'Hadir' as const,
      checkInTime: timeStr,
      signatureUrl: sampleSignatures[idx % sampleSignatures.length],
      notes: 'Hadir tepat waktu',
      timestamp: Date.now() - (6 - idx) * 300000,
    };
  });
};
