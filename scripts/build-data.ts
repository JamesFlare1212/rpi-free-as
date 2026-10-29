import { readFile, mkdir, writeFile } from 'node:fs/promises';
import type { Course, Dataset, Evidence, Section } from '../src/lib/types.ts';
import { isCandidate, exportCsv, resolveCourseVerdict,verdictLabels } from '../src/lib/catalog.ts';
import {loadSyllabusResearch} from './lib/syllabus-research.ts';

const read = async (name: string) => JSON.parse(await readFile(name, 'utf8'));
const [departments, catalog, schools, manifest, curatedEvidence] = await Promise.all([
  read('data/raw/courses.json') as Promise<{code: string; name: string; courses: {id: string; title: string; crse: number; sections: Section[]}[]}[]>,
  read('data/raw/catalog.json') as Promise<Record<string, {description?: string}>>,
  read('data/raw/schools.json') as Promise<{name: string; depts: {code: string; name: string}[]}[]>,
  read('data/raw/manifest.json'), read('data/evidence.json') as Promise<Evidence[]>,
]);
const syllabi=await loadSyllabusResearch(departments.flatMap(d=>d.courses));
const evidence=[...curatedEvidence,...syllabi.evidence];
const sourceChecks = await read('data/source-checks.json') as {url:string;status:number|null}[];
const searches = [...await read('data/research/searches.json'),...await read('data/research/initial-searches.json')] as {id:string;courseIds:string[];query:string;kind:string}[];
const courses: Course[] = departments.flatMap(dept => dept.courses.map(course => {
  const matched = evidence.filter(e => e.courseIds.includes(course.id)).flatMap(e => {
    const sections = course.sections.filter(s => new RegExp(e.titlePattern, 'i').test(s.title) && (!e.sectionPattern || new RegExp(e.sectionPattern).test(s.sec)) && (!e.matchInstructor || s.timeslots.some(t => new RegExp(e.matchInstructor!, 'i').test(t.instructor))));
    if (!sections.length) throw new Error(`Evidence ${e.id} title does not match ${course.id}; review topic reuse before attaching.`);
    return [{ ...e, sourceStatus: sourceChecks.find(s=>s.url===e.url)?.status, sectionCrns: sections.map(s => s.crn) }];
  });
  const instructors = [...new Set(course.sections.flatMap(s => s.timeslots.map(t => t.instructor)).filter(n => n && n !== 'TBA'))];
  const { verdict, confidence,sectionAssessments } = resolveCourseVerdict(course.sections,matched);
  const searchIds = searches.filter(q => q.courseIds.includes(course.id)).map(q=>q.id);
  return {
    id: course.id, title: course.title, subject: dept.code, department: dept.name,
    school: schools.find(s => s.depts.some(d => d.code === dept.code))?.name ?? 'Uncategorized',
    description: catalog[course.id]?.description ?? '', sections: course.sections, instructors,
    creditMin: Math.min(...course.sections.map(s => s.credMin)), creditMax: Math.max(...course.sections.map(s => s.credMax)),
    level: course.crse >= 6000 ? 'graduate' : 'undergraduate',
    evidence: matched, verdict, confidence,sectionAssessments,
    onlineSections: course.sections.filter(s => s.timeslots.some(t => /online|distance|remote/i.test(t.location))).length,
    reviewed: matched.length > 0,
    research: { state: matched.length ? 'evidence' : searches.some(q=>q.courseIds.includes(course.id)&&q.kind!=='initial-search') ? 'searched' : searchIds.length ? 'initial' : 'unsearched', searchIds },
    syllabusResearch:syllabi.research.get(course.id)!,
    classificationReview:{checkedAt:'2026-10-29',state:matched.length&&verdict!=='scheduled-final'?'supported':'insufficient',reason:verdict==='section-dependent'?'不同教师或班次的可归属线索不同，请逐班查看；未知班次不继承其他班次政策。':verdict==='conflicting'?'可归属的历史政策存在冲突或歧义，保留双方，不能作为确定免考或全线上线索。':verdict==='scheduled-final'?'仅有历史期末排期；TBA 不能判定考试、项目或线上形式，其他考核亦未知。':matched.length?'按可归属来源的考核条款归类；只反映注明的历史／当前资料范围，不保证本学期完整政策。':syllabi.research.get(course.id)!.state==='title-or-program-mismatch'?'同课号历史资料的标题或班型不符，不能套用其考核政策，保留未知。':syllabi.research.get(course.id)!.usableDocuments?'相符资料未提供足以核准考试形式的考核条款，保留未知。':'尚无足以归属的考核依据；空页面或未收录不能推断免考。'},
  };
}));
const dataset: Dataset = {
  meta: {
    term: 'Spring 2027', semester: '202701', fetchedAt: manifest.fetchedAt,
    sourceCommit: manifest.commit, sourceUpdatedAt: manifest.sourceUpdatedAt,
    sourceUrl: 'https://quacs.org/spring2027/#/',
    rawUrl: `${manifest.base}/semester_data/202701/courses.json`,
    totalCourses: courses.length, totalSections: courses.reduce((n,c) => n + c.sections.length, 0),
    totalDepartments: departments.length, researchDate: '2026-10-29',syllabusArchive:syllabi.coverage,
  }, courses,
};
await mkdir('public/data', { recursive: true });
await writeFile('public/data/courses.json', JSON.stringify(dataset));
await writeFile('public/data/evidence.json', JSON.stringify(evidence, null, 2));
await writeFile('data/evidence-syllabi.json', JSON.stringify(syllabi.evidence,null,2)+'\n');
await writeFile('data/research/course-classification.json',JSON.stringify({checkedAt:dataset.meta.researchDate,totalCourses:courses.length,byVerdict:Object.fromEntries([...new Set(courses.map(c=>c.verdict))].sort().map(v=>[v,courses.filter(c=>c.verdict===v).length])),courses:courses.map(c=>({id:c.id,title:c.title,verdict:c.verdict,confidence:c.confidence,...c.classificationReview,archiveState:c.syllabusResearch.state,reviewedEvidenceIds:c.evidence.map(e=>e.id),sectionAssessments:c.sectionAssessments}))},null,2)+'\n');
const safe=(s:string)=>s.replaceAll('|','\\|').replaceAll('\n',' ');
await writeFile('data/research/course-classification.md',`# Spring 2027 全部课程归类复核\n\n核查：${dataset.meta.researchDate}。全部 ${courses.length} 门均有逐课裁决；只有历史资料的课程不构成本学期确认。大纲和匹配数据仅作为归类支撑，不作为网页功能展示。\n\n| 课号 | 课程 | 归类 | 依据数 | 归类说明 |\n| --- | --- | --- | ---: | --- |\n`+courses.map(c=>`| ${c.id} | ${safe(c.title)} | ${verdictLabels[c.verdict]} | ${c.evidence.length} | ${safe(c.classificationReview.reason)} |`).join('\n')+'\n');
await writeFile('public/data/searches.json', JSON.stringify(searches, null, 2));
await writeFile('public/data/coverage.json', JSON.stringify(departments.map(d=>{
  const group=courses.filter(c=>c.subject===d.code);
  return {subject:d.code,name:d.name,total:group.length,evidence:group.filter(c=>c.research.state==='evidence').length,searchedNoEvidence:group.filter(c=>c.research.state==='searched').length,initialSearch:group.filter(c=>c.research.state==='initial').length,unsearched:group.filter(c=>c.research.state==='unsearched').length,syllabus:group.filter(c=>c.syllabusResearch.state==='historical-syllabus').length};
}), null, 2));
await writeFile('public/data/candidates.csv', exportCsv(courses.filter(isCandidate)));
await writeFile('public/data/all-courses.csv', exportCsv(courses));
console.log(JSON.stringify({ ...dataset.meta, reviewedCourses: courses.filter(c => c.reviewed).length, evidenceRecords: evidence.length }, null, 2));
