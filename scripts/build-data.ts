import { readFile, mkdir, writeFile } from 'node:fs/promises';
import type { Course, Dataset, Evidence, Section } from '../src/lib/types.ts';
import { candidateVerdicts, exportCsv, resolveVerdict } from '../src/lib/catalog.ts';

const read = async (name: string) => JSON.parse(await readFile(name, 'utf8'));
const [departments, catalog, schools, manifest, evidence] = await Promise.all([
  read('data/raw/courses.json') as Promise<{code: string; name: string; courses: {id: string; title: string; crse: number; sections: Section[]}[]}[]>,
  read('data/raw/catalog.json') as Promise<Record<string, {description?: string}>>,
  read('data/raw/schools.json') as Promise<{name: string; depts: {code: string; name: string}[]}[]>,
  read('data/raw/manifest.json'), read('data/evidence.json') as Promise<Evidence[]>,
]);
const sourceChecks = await read('data/source-checks.json') as {url:string;status:number|null}[];
const courses: Course[] = departments.flatMap(dept => dept.courses.map(course => {
  const matched = evidence.filter(e => e.courseIds.includes(course.id)).flatMap(e => {
    const sections = course.sections.filter(s => new RegExp(e.titlePattern, 'i').test(s.title) && (!e.matchInstructor || s.timeslots.some(t => new RegExp(e.matchInstructor!, 'i').test(t.instructor))));
    if (!sections.length) throw new Error(`Evidence ${e.id} title does not match ${course.id}; review topic reuse before attaching.`);
    return [{ ...e, sourceStatus: sourceChecks.find(s=>s.url===e.url)?.status, sectionCrns: sections.map(s => s.crn) }];
  });
  const instructors = [...new Set(course.sections.flatMap(s => s.timeslots.map(t => t.instructor)).filter(n => n && n !== 'TBA'))];
  const { verdict, confidence } = resolveVerdict(matched);
  return {
    id: course.id, title: course.title, subject: dept.code, department: dept.name,
    school: schools.find(s => s.depts.some(d => d.code === dept.code))?.name ?? 'Uncategorized',
    description: catalog[course.id]?.description ?? '', sections: course.sections, instructors,
    creditMin: Math.min(...course.sections.map(s => s.credMin)), creditMax: Math.max(...course.sections.map(s => s.credMax)),
    level: course.crse >= 6000 ? 'graduate' : 'undergraduate',
    evidence: matched, verdict, confidence,
    onlineSections: course.sections.filter(s => s.timeslots.some(t => /online|distance|remote/i.test(t.location))).length,
    reviewed: matched.length > 0,
  };
}));
const dataset: Dataset = {
  meta: {
    term: 'Spring 2027', semester: '202701', fetchedAt: manifest.fetchedAt,
    sourceCommit: manifest.commit, sourceUpdatedAt: manifest.sourceUpdatedAt,
    sourceUrl: 'https://quacs.org/spring2027/#/',
    rawUrl: `${manifest.base}/semester_data/202701/courses.json`,
    totalCourses: courses.length, totalSections: courses.reduce((n,c) => n + c.sections.length, 0),
    totalDepartments: departments.length, researchDate: '2026-10-28',
  }, courses,
};
await mkdir('public/data', { recursive: true });
await writeFile('public/data/courses.json', JSON.stringify(dataset));
await writeFile('public/data/evidence.json', JSON.stringify(evidence, null, 2));
await writeFile('public/data/candidates.csv', exportCsv(courses.filter(c=>candidateVerdicts.has(c.verdict))));
await writeFile('public/data/all-courses.csv', exportCsv(courses));
console.log(JSON.stringify({ ...dataset.meta, reviewedCourses: courses.filter(c => c.reviewed).length, evidenceRecords: evidence.length }, null, 2));
