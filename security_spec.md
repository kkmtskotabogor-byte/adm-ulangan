# Security Specification: SIM Ujian Sekolah Real-time Firestore

## 1. Data Invariants
1. **Config Document (`/exam_config/{configId}`)**:
   - Only valid IDs allowed (e.g. 'current').
   - Contains required fields: `schoolName`, `academicYear`, `examType`, `examTitle`.
   - String limits must not be exceeded (Denial-of-wallet protection).
2. **Exam Rooms (`/rooms/{roomId}`)**:
   - `id`, `roomCode`, `name` are mandatory strings with strict length constraints.
   - `capacity` must be a positive number.
3. **Students (`/students/{studentId}`)**:
   - `id`, `examNumber`, `name`, `className`, `gender` are required.
   - `gender` can only be 'L' or 'P'.
4. **Proctors (`/proctors/{proctorId}`)**:
   - `id` and `name` are required strings with bounded length.
5. **Exam Schedules (`/schedules/{scheduleId}`)**:
   - `id`, `dayName`, `date`, `sessionTime`, `subject` are required.
6. **Attendance Records (`/attendance_records/{recordId}`)**:
   - `id`, `proctorId`, `proctorName`, `scheduleId`, `subject`, `examDate`, `status` are required.
   - `status` can only be 'Hadir', 'Izin', 'Sakit', or 'Digantikan'.
   - `signatureUrl` cannot exceed 200KB.
7. **Proctor Matrix (`/proctor_matrix/{matrixId}`)**:
   - `id` is required.

## 2. The "Dirty Dozen" Malicious Payloads (Phase 0 TDD)
1. **Payload 1 (Config - Giant String Attack)**: Payload with 500KB string in `schoolName`. Expected: REJECT.
2. **Payload 2 (Config - Invalid Enum)**: Payload setting `semester` to `"Summer"`. Expected: REJECT.
3. **Payload 3 (Room - Negative Capacity)**: Payload setting `capacity` to `-10`. Expected: REJECT.
4. **Payload 4 (Room - Giant Room Code)**: Room code > 50 characters. Expected: REJECT.
5. **Payload 5 (Student - Missing Name)**: Student payload without required `name`. Expected: REJECT.
6. **Payload 6 (Student - Invalid Gender)**: Student payload setting `gender` to `"X"`. Expected: REJECT.
7. **Payload 7 (Proctor - Malicious Script ID)**: Proctor document ID containing path traversal `../../bad`. Expected: REJECT.
8. **Payload 8 (Proctor - Invalid Role)**: Proctor setting `role` to `"SuperHacker"`. Expected: REJECT.
9. **Payload 9 (Schedule - Empty Subject)**: Schedule payload with empty subject string. Expected: REJECT.
10. **Payload 10 (Attendance - Overweight Signature)**: Signature payload exceeding max character size (1MB). Expected: REJECT.
11. **Payload 11 (Attendance - Invalid Status)**: Attendance record status set to `"Skipped"`. Expected: REJECT.
12. **Payload 12 (Catch-all Injection)**: Writing to undeclared collection `/system_secrets/test`. Expected: REJECT.
