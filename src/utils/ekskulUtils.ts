export interface PramukaCheckResult {
  allowed: boolean;
  grade?: 'Baik' | 'Sangat Baik';
}

/**
 * Official roster of 16 students enrolled in Pramuka with their assigned grades.
 * Pramuka is NOT mandatory for all students, only for these 16 students.
 */
export const PRAMUKA_ALLOWED_ROSTER: Record<string, 'Baik' | 'Sangat Baik'> = {
  // 7A
  'STD-183': 'Baik',
  'FAHDANAR': 'Baik',
  'FAHDANAR RAYA AL-FATH': 'Baik',
  'STD-189': 'Baik',
  'M. DEVIN ALFAUZAN': 'Baik',
  'DEVIN AL FAUZAN': 'Baik',

  // 7C
  'STD-246': 'Baik',
  'MUHAMMAD BAYU SYAHIDAN': 'Baik',
  'STD-254': 'Baik',
  'SUNIYYA RANA PUTRI': 'Baik',
  'STD-253': 'Baik',
  'SITI SARAH': 'Baik',
  'STD-249': 'Baik',
  'RAFA SYAHPUTRA': 'Baik',

  // 7E
  'STD-299': 'Sangat Baik',
  'NOVA RIANI': 'Sangat Baik',

  // 8A
  'STD-335': 'Sangat Baik',
  'TASYA AFRILIA': 'Sangat Baik',

  // 8B
  'STD-347': 'Sangat Baik',
  'DHISTI NAURA ANJANI': 'Sangat Baik',
  'STD-370': 'Sangat Baik',
  'SYAHDA AMELIA PUTRI': 'Sangat Baik',
  'STD-354': 'Sangat Baik',
  'GISELA PUTRI': 'Sangat Baik',
  'STD-367': 'Sangat Baik',
  'SABILA AULIA': 'Sangat Baik',
  'STD-360': 'Sangat Baik',
  'MUHAMMAD ADITYA RAMADHAN': 'Sangat Baik',
  'ADITYA RAMADHAN': 'Sangat Baik',

  // 8C
  'STD-380': 'Sangat Baik',
  'CITYEL FATIMAH KHELA NATASYA': 'Sangat Baik',
  'CITY EL FATIMAH KELA NATASYA': 'Sangat Baik',
  'STD-397': 'Sangat Baik',
  'RADYA NADIN': 'Sangat Baik',
  'STD-386': 'Baik',
  'HANABI ALKHAIRI': 'Baik',
  'HANABI AL KHAIRI': 'Baik',
};

/**
 * Checks if a given student belongs to the official Pramuka participants list
 */
export function isPramukaStudent(id?: string, name?: string): PramukaCheckResult {
  const normId = (id || '').toUpperCase().trim();
  const normName = (name || '').toUpperCase().trim();

  if (normId && PRAMUKA_ALLOWED_ROSTER[normId]) {
    return { allowed: true, grade: PRAMUKA_ALLOWED_ROSTER[normId] };
  }

  if (normName && PRAMUKA_ALLOWED_ROSTER[normName]) {
    return { allowed: true, grade: PRAMUKA_ALLOWED_ROSTER[normName] };
  }

  // Token / substring check for names
  for (const [key, grade] of Object.entries(PRAMUKA_ALLOWED_ROSTER)) {
    if (key.length > 5 && (normName.includes(key) || key.includes(normName))) {
      return { allowed: true, grade };
    }
  }

  return { allowed: false };
}
