/**
 * Teacher class attendance helpers (mock + Supabase-shaped records).
 */

export function loadTeacherClass() {
  return localStorage.getItem('nova_teacher_class') || 'PreNova';
}

export function saveTeacherClass(programme) {
  localStorage.setItem('nova_teacher_class', programme);
}

export function loadAttendanceStore() {
  try {
    const raw = localStorage.getItem('nova_attendance_records');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

export function saveAttendanceStore(store) {
  localStorage.setItem('nova_attendance_records', JSON.stringify(store));
}

function iso(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function sessionKey(programme, date) {
  return `${programme}|${iso(date)}`;
}

export function weekdayName(date) {
  return (date instanceof Date ? date : new Date(date)).toLocaleDateString('en-GB', { weekday: 'long' });
}

/**
 * Students expected on a given date for a programme (from attendance_days).
 */
export function expectedStudentsForDate(students, date, programme) {
  const day = weekdayName(date);
  const prog = String(programme || '').toLowerCase();
  return (students || []).filter((s) => {
    if (String(s.Status || '').toLowerCase() === 'inactive') return false;
    if (prog && String(s.Programme || '').toLowerCase() !== prog) return false;
    const days = String(s['Attendance days'] || '')
      .split(';')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    if (!days.length || days.some((d) => d.includes('not yet'))) {
      // Still show on teaching days for the programme so teachers can take a register.
      const teaching = ['monday', 'tuesday', 'wednesday', 'thursday', 'saturday', 'sunday'];
      return teaching.includes(day.toLowerCase());
    }
    return days.includes(day.toLowerCase());
  });
}

export function getSessionAttendance(store, programme, date) {
  return store[sessionKey(programme, date)] || {};
}

export function setStudentAttendance(store, programme, date, studentId, status, meta = {}) {
  const key = sessionKey(programme, date);
  const next = { ...store, [key]: { ...(store[key] || {}) } };
  next[key][studentId] = {
    status,
    updated_at: new Date().toISOString(),
    ...meta
  };
  return next;
}

export function attendanceSummary(records, students) {
  const ids = students.map((s) => s['Student ID']);
  let present = 0;
  let absent = 0;
  let late = 0;
  let unmarked = 0;
  ids.forEach((id) => {
    const st = records[id]?.status;
    if (st === 'present') present += 1;
    else if (st === 'absent') absent += 1;
    else if (st === 'late') late += 1;
    else unmarked += 1;
  });
  return { present, absent, late, unmarked, total: ids.length };
}

/**
 * Map organisation_members.role (+ optional linked fields) toward an app mode.
 */
export function modeFromMembership(membership) {
  if (!membership) return null;
  const role = String(membership.role || '').toLowerCase();
  if (membership.linked_student_id || role === 'student') return 'student';
  if (membership.linked_staff_id || role === 'tutor') return 'teacher';
  if (['owner', 'admin', 'manager', 'finance'].includes(role)) return 'org';
  return null;
}
