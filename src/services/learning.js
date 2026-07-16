/**
 * GCSE subject specifications + revision planner.
 * Spreads topics across available study days toward mocks or final exams,
 * and compounds remaining topics when days are missed.
 */

export const GCSE_SUBJECTS = [
  {
    id: 'maths',
    name: 'Mathematics',
    board: 'GCSE',
    color: 'aqua',
    topics: [
      'Number · place value & rounding',
      'Fractions, decimals & percentages',
      'Ratio & proportion',
      'Algebra · expressions & equations',
      'Algebra · sequences & graphs',
      'Geometry · angles & shapes',
      'Geometry · area, volume & Pythagoras',
      'Trigonometry',
      'Probability',
      'Statistics · averages & charts',
      'Exam technique · calculator paper',
      'Exam technique · non-calculator paper'
    ]
  },
  {
    id: 'english-lang',
    name: 'English Language',
    board: 'GCSE',
    color: 'lilac',
    topics: [
      'Paper 1 · reading fiction',
      'Paper 1 · creative writing',
      'Paper 2 · non-fiction reading',
      'Paper 2 · transactional writing',
      'Language analysis · word & sentence',
      'Structure & form',
      'Comparing texts',
      'SPAG accuracy drills',
      'Timed writing practice',
      'Mark scheme familiarisation'
    ]
  },
  {
    id: 'english-lit',
    name: 'English Literature',
    board: 'GCSE',
    color: 'lilac',
    topics: [
      'Shakespeare · key scenes',
      'Shakespeare · character & themes',
      '19th-century novel · plot & context',
      '19th-century novel · character essays',
      'Modern text · themes',
      'Modern text · character & form',
      'Poetry anthology · comparison',
      'Unseen poetry',
      'Quotation banks',
      'Essay planning drills'
    ]
  },
  {
    id: 'biology',
    name: 'Biology',
    board: 'GCSE',
    color: 'green',
    topics: [
      'Cell biology',
      'Organisation',
      'Infection & response',
      'Bioenergetics',
      'Homeostasis',
      'Inheritance & evolution',
      'Ecology',
      'Required practicals review',
      'Exam questions · AO1/AO2',
      'Exam questions · AO3'
    ]
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    board: 'GCSE',
    color: 'rose',
    topics: [
      'Atomic structure & periodic table',
      'Bonding & structure',
      'Quantitative chemistry',
      'Chemical changes',
      'Energy changes',
      'Rate of reaction',
      'Organic chemistry',
      'Chemical analysis',
      'Atmosphere & resources',
      'Required practicals review'
    ]
  },
  {
    id: 'physics',
    name: 'Physics',
    board: 'GCSE',
    color: 'blue',
    topics: [
      'Energy',
      'Electricity',
      'Particle model of matter',
      'Atomic structure',
      'Forces',
      'Waves',
      'Magnetism & electromagnetism',
      'Space physics',
      'Equations recall',
      'Required practicals review'
    ]
  },
  {
    id: 'history',
    name: 'History',
    board: 'GCSE',
    color: 'grey',
    topics: [
      'Period study · overview',
      'Period study · key events',
      'Depth study · causes',
      'Depth study · consequences',
      'Historic environment',
      'Source analysis practice',
      'Essay structure',
      'Timeline & fact drills'
    ]
  },
  {
    id: 'geography',
    name: 'Geography',
    board: 'GCSE',
    color: 'green',
    topics: [
      'Physical landscapes',
      'Weather hazards',
      'Climate change',
      'Urban issues',
      'Changing economic world',
      'Resource management',
      'Fieldwork skills',
      'Map & graph skills',
      'Case study recall'
    ]
  }
];

const SUBJECT_MAP = Object.fromEntries(GCSE_SUBJECTS.map((s) => [s.id, s]));

export function getSubject(id) {
  return SUBJECT_MAP[id] || null;
}

export function defaultStudentProfile(students = []) {
  const first = students.find((s) => String(s.Programme || '').toLowerCase().includes('super')) || students[0];
  const name = first?.['Student name'] || 'Demo student';
  const id = first?.['Student ID'] || 'STU-DEMO';
  return {
    studentId: id,
    name,
    yearGroup: 'Year 10',
    age: 15,
    mocksDate: '2027-01-20',
    examDate: '2027-05-18',
    dailyMinutes: 90,
    topicMinutes: 45,
    studyWeekdays: [1, 2, 3, 4, 5, 6], // Mon–Sat
    subjectIds: ['maths', 'english-lang', 'english-lit', 'biology', 'chemistry', 'physics'],
    completedTopics: {},
    missedDays: []
  };
}

export function loadStudentProfile(students) {
  try {
    const raw = localStorage.getItem('nova_student_profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultStudentProfile(students), ...parsed };
    }
  } catch (_) {}
  return defaultStudentProfile(students);
}

export function saveStudentProfile(profile) {
  localStorage.setItem('nova_student_profile', JSON.stringify(profile));
}

function parseISO(d) {
  if (!d) return null;
  const x = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return Number.isNaN(x.getTime()) ? null : x;
}

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Pick the nearer milestone (mocks vs exam) as the planning target.
 */
export function planningTarget(profile, from = new Date()) {
  const today = startOfDay(from);
  const mocks = parseISO(profile.mocksDate);
  const exam = parseISO(profile.examDate);
  const candidates = [mocks, exam].filter((d) => d && d >= today);
  if (!candidates.length) {
    const fallback = new Date(today);
    fallback.setDate(fallback.getDate() + 60);
    return { date: fallback, kind: 'exam', label: 'Exam window' };
  }
  candidates.sort((a, b) => a - b);
  const date = candidates[0];
  const kind = mocks && iso(date) === iso(mocks) ? 'mocks' : 'exam';
  return {
    date,
    kind,
    label: kind === 'mocks' ? 'Mocks' : 'Final exams'
  };
}

function collectTopics(profile) {
  const out = [];
  for (const sid of profile.subjectIds || []) {
    const subject = SUBJECT_MAP[sid];
    if (!subject) continue;
    subject.topics.forEach((topic, i) => {
      const key = `${sid}:${i}`;
      if (profile.completedTopics?.[key]) return;
      out.push({
        key,
        subjectId: sid,
        subject: subject.name,
        color: subject.color,
        topic,
        index: i
      });
    });
  }
  return out;
}

function studyDaysBetween(from, to, profile) {
  const missed = new Set((profile.missedDays || []).map((d) => String(d).slice(0, 10)));
  const weekdays = new Set(profile.studyWeekdays || [1, 2, 3, 4, 5, 6]);
  const days = [];
  const cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    const jsDay = cursor.getDay(); // 0 Sun
    const mondayBased = jsDay === 0 ? 7 : jsDay;
    const key = iso(cursor);
    if (weekdays.has(mondayBased) && !missed.has(key)) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Build a day → topic[] plan. Missed days shrink the window so remaining
 * topics are compounded into fewer slots.
 */
export function buildRevisionPlan(profile, from = new Date()) {
  const target = planningTarget(profile, from);
  const topics = collectTopics(profile);
  const topicMinutes = Math.max(20, Number(profile.topicMinutes) || 45);
  const dailyMinutes = Math.max(topicMinutes, Number(profile.dailyMinutes) || 90);
  const slotsPerDay = Math.max(1, Math.floor(dailyMinutes / topicMinutes));

  const days = studyDaysBetween(from, target.date, profile);
  const planByDate = {};
  if (!days.length || !topics.length) {
    return {
      target,
      topicMinutes,
      dailyMinutes,
      slotsPerDay,
      totalTopics: topics.length,
      daysAvailable: days.length,
      byDate: planByDate,
      events: []
    };
  }

  // Round-robin subjects so the week stays balanced, then fill days.
  const bySubject = {};
  topics.forEach((t) => {
    (bySubject[t.subjectId] ||= []).push(t);
  });
  const queues = Object.values(bySubject);
  const ordered = [];
  let guard = 0;
  while (queues.some((q) => q.length) && guard < 5000) {
    queues.forEach((q) => {
      if (q.length) ordered.push(q.shift());
    });
    guard += 1;
  }

  let ti = 0;
  days.forEach((day) => {
    const key = iso(day);
    const slot = [];
    for (let s = 0; s < slotsPerDay && ti < ordered.length; s += 1, ti += 1) {
      slot.push({ ...ordered[ti], minutes: topicMinutes });
    }
    if (slot.length) planByDate[key] = slot;
  });

  // If topics remain after the window, compound onto the last study days.
  if (ti < ordered.length) {
    const remain = ordered.slice(ti);
    const lastDays = days.slice(-Math.min(days.length, 14)).reverse();
    let di = 0;
    remain.forEach((topic) => {
      const day = lastDays[di % lastDays.length];
      const key = iso(day);
      (planByDate[key] ||= []).push({ ...topic, minutes: topicMinutes, compounded: true });
      di += 1;
    });
  }

  const events = [];
  Object.entries(planByDate).forEach(([date, items]) => {
    items.forEach((item) => {
      events.push({
        date,
        title: `${item.subject} · ${item.topic}`,
        sub: `${item.minutes} min${item.compounded ? ' · catch-up' : ''} · toward ${target.label}`,
        type: 'revision',
        subjectId: item.subjectId,
        topicKey: item.key,
        compounded: !!item.compounded
      });
    });
  });

  return {
    target,
    topicMinutes,
    dailyMinutes,
    slotsPerDay,
    totalTopics: topics.length,
    daysAvailable: days.length,
    byDate: planByDate,
    events
  };
}

export function revisionEventsForDate(plan, date) {
  if (!plan?.byDate) return [];
  const key = iso(date instanceof Date ? date : new Date(date));
  return (plan.byDate[key] || []).map((item) => ({
    title: `${item.subject} · ${item.topic}`,
    sub: `${item.minutes} min${item.compounded ? ' · catch-up' : ''} · toward ${plan.target.label}`,
    type: 'revision',
    subjectId: item.subjectId,
    topicKey: item.key,
    compounded: !!item.compounded
  }));
}

export function markMissedDay(profile, dateIso) {
  const key = String(dateIso).slice(0, 10);
  const missed = new Set(profile.missedDays || []);
  missed.add(key);
  return { ...profile, missedDays: [...missed].sort() };
}

export function unmarkMissedDay(profile, dateIso) {
  const key = String(dateIso).slice(0, 10);
  return {
    ...profile,
    missedDays: (profile.missedDays || []).filter((d) => String(d).slice(0, 10) !== key)
  };
}

export function subjectsForProfile(profile) {
  return (profile.subjectIds || []).map((id) => SUBJECT_MAP[id]).filter(Boolean);
}
