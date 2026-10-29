import type { Confidence, Course, Evidence, Verdict } from './types.ts';

export const verdictLabels: Record<Verdict, string> = {
  'no-exams': '无考试线索', online: '线上考试线索', 'take-home': 'Take-home 考试',
  'no-final': '仅无期末考试', 'project-based': '项目 / 作品评分',
  'coursework-based':'作业 / 平时考核', 'section-dependent':'按教师 / 班次区分',
  'online-final': '仅线上期末线索', 'final-project': '仅期末项目 / 论文', 'scheduled-final': '历史期末排期 · 形式未知',
  'has-exams': '有考试依据', conflicting: '证据存在冲突', unknown: '考试形式未知',
};
export function resolveVerdict(evidence: Evidence[]): {verdict: Verdict; confidence: Confidence | null} {
  if (!evidence.length) return {verdict: 'unknown', confidence: null};
  const relevant = evidence.some(e => e.scope === 'current') ? evidence.filter(e => e.scope === 'current') : evidence;
  const overlaps=(a:Evidence,b:Evidence)=>!a.sectionCrns||!b.sectionCrns||a.sectionCrns.some(crn=>b.sectionCrns!.includes(crn));
  if (relevant.some(a=>a.verdict==='has-exams'&&relevant.some(b=>overlaps(a,b)&&(b.verdict==='no-exams'||a.examModality==='in-person'&&b.verdict==='online')))) return {verdict:'conflicting',confidence:'low'};
  // A final schedule only describes the final assessment. It never overrides a full-course policy.
  const detailed = relevant.filter(e=>e.sourceType!=='exam-schedule');
  const pool = detailed.length ? detailed : relevant;
  const ranks = {syllabus: 0, 'course-site': 1, handbook: 2, 'student-report': 3, 'exam-schedule': 4};
  const policyDate=(e:Evidence)=>e.sourceTermCode ? e.sourceTermCode.slice(0,6)+'01' : (e.sourceDate??'').replaceAll('-','');
  const sorted = [...pool].sort((a,b) => ranks[a.sourceType] - ranks[b.sourceType] || Number(a.verdict==='scheduled-final')-Number(b.verdict==='scheduled-final') || policyDate(b).localeCompare(policyDate(a)));
  return {verdict: sorted[0].verdict, confidence: sorted[0].confidence};
}
export function resolveCourseVerdict(sections:Course['sections'],evidence:Evidence[]) {
 const sectionAssessments=sections.map(s=>({crn:s.crn,...resolveVerdict(evidence.filter(e=>!e.sectionCrns||e.sectionCrns.includes(s.crn)))}));
 const distinct=new Set(sectionAssessments.map(s=>s.verdict));
 const overall=distinct.size>1?{verdict:'section-dependent' as Verdict,confidence:'low' as Confidence}:resolveVerdict(evidence);
 return {...overall,sectionAssessments};
}
export const candidateVerdicts = new Set<Verdict>(['no-exams','online','take-home','project-based','coursework-based','online-final','final-project']);
export const isCandidate=(c:Course)=>candidateVerdicts.has(c.verdict)||c.verdict==='section-dependent'&&c.sectionAssessments.some(s=>candidateVerdicts.has(s.verdict));
export interface Filters { query: string; status: string; subject: string; level: string; source: string; program?: string; archive?:string; savedOnly: boolean; sort: string; }
export function filterCourses(courses: Course[], f: Filters, saved: string[] = []): Course[] {
  const terms = f.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const rank: Record<Verdict,number> = {'no-exams':0,online:1,'take-home':2,'project-based':3,'coursework-based':4,'section-dependent':5,'online-final':6,'final-project':7,'no-final':8,conflicting:9,'has-exams':10,'scheduled-final':11,unknown:12};
  const scopedCourses = !f.program || f.program==='all' ? courses : courses.map(c=>{
    const evidence=c.evidence.filter(e=>f.program==='atwork' ? e.sectionPattern==='^H' : e.sectionPattern!=='^H');
    const sections=c.sections.filter(s=>f.program==='atwork'?s.sec.startsWith('H'):!s.sec.startsWith('H'));
    return {...c,evidence,...resolveCourseVerdict(sections,evidence)};
  });
  return scopedCourses.filter(c => {
    const haystack = [c.id,c.title,...c.sections.map(s=>s.title),c.department,c.subject,...c.instructors,...c.evidence.map(e=>e.summary)].join(' ').toLowerCase();
    return terms.every(t=>haystack.includes(t))
      && (f.status === 'all' || (f.status === 'candidates' ? isCandidate(c) : ['searched','initial','unsearched'].includes(f.status) ? c.research.state === f.status : c.verdict === f.status||c.verdict==='section-dependent'&&c.sectionAssessments.some(s=>s.verdict===f.status)))
      && (f.subject === 'all' || c.subject === f.subject)
      && (f.level === 'all' || c.level === f.level)
      && (!f.archive || f.archive==='all' || c.syllabusResearch.state===f.archive)
      && (f.source === 'all' || (f.source === 'official' ? c.evidence.some(e=>e.sourceType !== 'student-report') : c.evidence.some(e=>e.sourceType === 'student-report')))
      && (!f.program || f.program === 'all' || (f.program === 'atwork' ? c.evidence.some(e=>e.sectionPattern==='^H') : c.sections.some(s=>!s.sec.startsWith('H'))))
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
  const rows = [['课号','课程','教师','学分','考试形式','适用范围','依据','注意事项','来源链接','班次CRN','检索状态','证据适用CRN','来源定位','分班考核线索','归类说明'], ...courses.map(c=>[
    c.id,c.title,c.instructors.join('; '),`${c.creditMin}${c.creditMin!==c.creditMax?`–${c.creditMax}`:''}`,
    verdictLabels[c.verdict],c.evidence.map(e=>e.term).join('; '),c.evidence.map(e=>e.summary).join('; '),
    c.evidence.map(e=>e.caveat).join('; '),c.evidence.map(e=>e.url).join('; '),c.sections.map(s=>s.crn).join('; '),
    c.research.state,c.evidence.map(e=>`${e.id}: ${e.sectionCrns?.join(' / ')}`).join('; '),c.evidence.map(e=>e.sourceLocator??'').join('; '),
    c.sectionAssessments.map(s=>`${s.crn}: ${verdictLabels[s.verdict]}`).join('; '),c.classificationReview.reason,
  ])];
  return '\ufeff' + rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');
}
