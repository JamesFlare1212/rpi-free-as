import type { Confidence, Course, Evidence, Verdict } from './types.ts';

export const verdictLabels: Record<Verdict, string> = {
  'no-exams': '无考试线索', online: '线上考试线索', 'take-home': 'Take-home 考试',
  'no-final': '仅无期末考试', 'project-based': '项目制线索',
  'has-exams': '有考试依据', conflicting: '证据存在冲突', unknown: '考试形式未知',
};
export function resolveVerdict(evidence: Evidence[]): {verdict: Verdict; confidence: Confidence | null} {
  if (!evidence.length) return {verdict: 'unknown', confidence: null};
  const relevant = evidence.some(e => e.scope === 'current') ? evidence.filter(e => e.scope === 'current') : evidence;
  if (relevant.some(e => e.verdict === 'has-exams') && relevant.some(e => ['no-exams', 'online'].includes(e.verdict))) return {verdict:'conflicting',confidence:'low'};
  const ranks = {syllabus: 0, 'course-site': 1, handbook: 2, 'student-report': 3};
  const sorted = [...relevant].sort((a,b) => ranks[a.sourceType] - ranks[b.sourceType] || (b.sourceDate ?? '').localeCompare(a.sourceDate ?? ''));
  return {verdict: sorted[0].verdict, confidence: sorted[0].confidence};
}
export const candidateVerdicts = new Set<Verdict>(['no-exams','online','take-home','project-based']);
export interface Filters { query: string; status: string; subject: string; level: string; source: string; quizzes: boolean; savedOnly: boolean; sort: string; }
export function filterCourses(courses: Course[], f: Filters, saved: string[] = []): Course[] {
  const terms = f.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const rank: Record<Verdict,number> = {'no-exams':0,online:1,'take-home':2,'project-based':3,'no-final':4,conflicting:5,'has-exams':6,unknown:7};
  return courses.filter(c => {
    const haystack = [c.id,c.title,...c.sections.map(s=>s.title),c.department,c.subject,...c.instructors,...c.evidence.map(e=>e.summary)].join(' ').toLowerCase();
    return terms.every(t=>haystack.includes(t))
      && (f.status === 'all' || (f.status === 'candidates' ? candidateVerdicts.has(c.verdict) : c.verdict === f.status))
      && (f.subject === 'all' || c.subject === f.subject)
      && (f.level === 'all' || c.level === f.level)
      && (f.source === 'all' || (f.source === 'official' ? c.evidence.some(e=>e.sourceType !== 'student-report') : c.evidence.some(e=>e.sourceType === 'student-report')))
      && (!f.quizzes || !c.evidence.some(e=>e.hasQuizzes))
      && (!f.savedOnly || saved.includes(c.id));
  }).sort((a,b)=>f.sort==='code' ? a.id.localeCompare(b.id) : f.sort==='credits' ? a.creditMin-b.creditMin || a.id.localeCompare(b.id) : rank[a.verdict]-rank[b.verdict] || a.id.localeCompare(b.id));
}
export function csvEscape(value: unknown): string {
  let text = String(value ?? '');
  // Prevent spreadsheet formula execution when opening exported public text.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
}
export function exportCsv(courses: Course[]): string {
  const rows = [['课号','课程','教师','学分','考试形式','适用范围','依据','注意事项','来源链接','班次CRN'], ...courses.map(c=>[
    c.id,c.title,c.instructors.join('; '),`${c.creditMin}${c.creditMin!==c.creditMax?`–${c.creditMax}`:''}`,
    verdictLabels[c.verdict],c.evidence.map(e=>e.term).join('; '),c.evidence.map(e=>e.summary).join('; '),
    c.evidence.map(e=>e.caveat).join('; '),c.evidence.map(e=>e.url).join('; '),c.sections.map(s=>s.crn).join('; '),
  ])];
  return '\ufeff' + rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
}
