export type ExamCategory = 'STS' | 'SAS' | 'SAT' | 'US';

export interface ExamConfig {
  schoolName: string;
  npsn: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  examType: ExamCategory;
  examTitle: string;
  principalName: string;
  principalNip: string;
  committeeHeadName: string;
  committeeHeadNip: string;
  issueDate: string;
  issuePlace: string;
  stampEnabled: boolean;
  signatureEnabled?: boolean;
  signatureUrl?: string; // Base64 data URI or SVG for Tanda Tangan
  stampUrl?: string; // Base64 data URI or SVG for Stempel Sekolah / Madrasah
  signatureSigner?: 'principal' | 'committee'; // Penandatangan: Kepala Sekolah atau Ketua Panitia
  stampSize?: number; // Skala ukuran stempel (persen, default 100%, 50 - 200%)
  stampOffsetX?: number; // Geser horizontal stempel px (-60 s/d +60)
  stampOffsetY?: number; // Geser vertikal stempel px (-40 s/d +40)
  stampRotation?: number; // Rotasi derajat stempel (-45 s/d +45, default -7)
  stampOpacity?: number; // Transparansi/kepekatan stempel (40 s/d 100, default 90)
  stampAboveSignature?: boolean; // Posisi lapisan: stempel di atas TTD (default true)
  signatureSize?: number; // Skala ukuran TTD (persen, default 100%, 50 - 200%)
  signatureOffsetX?: number; // Geser horizontal TTD px (-60 s/d +60)
  signatureOffsetY?: number; // Geser vertikal TTD px (-40 s/d +40)
  schoolLevel: 'MTs' | 'MA' | 'MI' | 'SMP' | 'SMA' | 'SMK' | 'SD';
  codePrefix: string; // e.g. "26-04"
  logoUrl?: string; // Base64 data URI or SVG string of school/madrasah logo
}

export interface Student {
  id: string;
  examNumber: string;
  nisn: string;
  nis: string;
  name: string;
  className: string;
  gender: 'L' | 'P';
  session: number;
  roomId?: string;
  roomName?: string;
  seatNumber?: number;
}

export interface ExamRoom {
  id: string;
  roomCode: string;
  name: string;
  location: string;
  capacity: number;
  proctor1: string;
  proctor2?: string;
}

export type DistributionMethod = 'cross_class' | 'sequential';

export interface ExamScheduleItem {
  id: string;
  dayName: string;
  date: string;
  sessionTime: string;
  subject: string;
  targetLevel: string; // e.g., "Semua Kelas" or "Kelas X, XI, XII"
  isBreak?: boolean; // true if this item is a break session (Istirahat)
}

export type ActiveTab = 
  | 'dashboard'
  | 'config'
  | 'students'
  | 'schedules'
  | 'rooms'
  | 'proctors'
  | 'seating'
  | 'cards'
  | 'documents'
  | 'dispensation'
  | 'backup';

export type DispensationReasonCategory = 
  | 'Administrasi Keuangan' 
  | 'Persyaratan Berkas' 
  | 'Kesehatan / Sakit' 
  | 'Keterlambatan Hadir' 
  | 'Lainnya';

export type DispensationStatus = 'Aktif' | 'Selesai' | 'Dibatalkan';

export interface ExamDispensation {
  id: string;
  studentId: string;
  studentName: string;
  nisn: string;
  nis?: string;
  className: string;
  examNumber: string;
  roomName?: string;
  roomId?: string;
  reasonCategory: DispensationReasonCategory;
  reasonDetail: string;
  startDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  commitmentNote?: string; // Catatan janji pelunasan / pemenuhan syarat
  parentName?: string;
  parentPhone?: string;
  letterNumber: string; // Nomor Surat, e.g. 421/045/PAN-STS/DISP/2026
  status: DispensationStatus;
  approvedBy: string; // e.g. "Panitia Ujian" / "Bendahara Madrasah"
  createdAt: string;
  allowedSubjects?: string[]; // Daftar mapel yang diizinkan, kosong = semua mapel
}

export interface BackupData {
  version: string;
  appId: string;
  createdAt: string;
  exportedBy?: string;
  schoolName: string;
  examType: string;
  academicYear: string;
  metadata: {
    totalStudents: number;
    totalRooms: number;
    totalProctors: number;
    totalSchedules: number;
    totalAttendanceRecords?: number;
    totalDispensations?: number;
  };
  data: {
    config: ExamConfig;
    students: Student[];
    rooms: ExamRoom[];
    proctors: Proctor[];
    schedules: ExamScheduleItem[];
    attendanceRecords?: ProctorAttendanceRecord[];
    dispensations?: ExamDispensation[];
  };
}

export interface BackupSnapshot {
  id: string;
  title: string;
  createdAt: string;
  note?: string;
  schoolName: string;
  totalStudents: number;
  totalRooms: number;
  totalSchedules: number;
  backupData: BackupData;
}

export interface Proctor {
  id: string;
  name: string;
  nip: string;
  subject: string;
  role?: 'Pengawas Ruang' | 'Pengawas Cadangan' | 'Koordinator';
  phone?: string;
  assignedRoomId?: string;
  assignedRoomCode?: string;
  assignedPosition?: 1 | 2;
}

export interface ProctorAttendanceRecord {
  id: string;
  proctorId: string;
  proctorName: string;
  proctorNip: string;
  scheduleId: string;
  subject: string;
  examDate: string;
  sessionTime: string;
  roomId?: string;
  roomCode?: string;
  position?: 1 | 2;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Digantikan';
  checkInTime: string;
  checkOutTime?: string;
  signatureUrl?: string; // base64 PNG data URL of drawn signature
  notes?: string;
  timestamp: number;
}

export type UserRole = 'admin' | 'proctor' | 'student';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  nipOrNis?: string;
  proctorId?: string;
  studentId?: string;
  roomCode?: string;
  className?: string;
  examNumber?: string;
  avatar?: string;
  loginTime: string;
}
