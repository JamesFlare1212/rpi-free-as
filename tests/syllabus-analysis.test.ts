import {describe,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {extractFindings,matchSections,type ArchiveRow} from '../scripts/lib/syllabus-analysis.ts';
import {filterCourses,resolveVerdict} from '../src/lib/catalog.ts';
import type {Dataset,Evidence} from '../src/lib/types.ts';
const {courses,meta}=JSON.parse(readFileSync('public/data/courses.json','utf8')) as Dataset;
const scan=(body:string)=>extractFindings('---\ncourseSectionId: 1\n---\n## Grading Criteria\n'+body);
const kinds=(body:string)=>scan(body).map(f=>f.kind);
const filters={query:'',status:'all',subject:'all',level:'all',source:'all',savedOnly:false,sort:'code'};
describe('historical syllabus identity, extraction and integration',()=>{
 test('every current course has an explicit archive outcome',()=>{
  expect(courses).toHaveLength(1009);
  expect(Object.values(meta.syllabusArchive.states).reduce((n,v)=>n+v,0)).toBe(1009);
  expect(courses.filter(c=>c.syllabusResearch.usableDocuments>0)).toHaveLength(meta.syllabusArchive.coursesWithSyllabus);
  expect(courses.flatMap(c=>c.evidence).filter(e=>e.archivePath).every(e=>e.scope==='historical')).toBe(true);
 });
 test('a reused topics number and H section do not pass a title/program match',()=>{
  const row={courseId:'CSCI-4964',title:'GRAPH MINING',section:'01'} as ArchiveRow;
  expect(matchSections(row,[{title:'Deep Learning On Graphs',sec:'01',crn:1}]).crns).toEqual([]);
  expect(matchSections(row,[{title:'Graph Mining',sec:'H1',crn:1}]).crns).toEqual([]);
  expect(courses.find(c=>c.id==='CSCI-4964')!.syllabusResearch.state).toBe('title-or-program-mismatch');
 });
 test('a reviewed alias is exact and course-specific',()=>{
  const row={courseId:'CIVL-4920',title:'CIVIL ENGR CAPSTONE DESIGN',section:'01'} as ArchiveRow;
  const sections=[{title:'Civil Engineering Capstone Design',sec:'01',crn:1}];
  const aliases=[{courseId:row.courseId,archiveTitle:row.title,currentTitle:sections[0].title,reason:'ENGR abbreviation'}];
  expect(matchSections(row,sections,aliases)).toEqual({crns:[1],kind:'reviewed-alias'});
  expect(matchSections({...row,courseId:'CIVL-4960'},sections,aliases).crns).toEqual([]);
 });
 test('no final, project names and online submission cannot prove no exams or remote exams',()=>{
  const result=kinds('There will be no final exam.\nMidterm team presentation, 25%\nAll exams are open-notes. You are not permitted to search online.\nAll assignments and exams will be submitted online via LMS.\nA take-home project and final performance are required.');
  expect(result).toContain('no-final');
  for(const invalid of ['no-exams','exam-weight','online-exams','take-home'])expect(result).not.toContain(invalid);
 });
 test('conditional remote arrangements and institution-wide boilerplate are not course policies',()=>{
  expect(kinds('Unit tests will be posted to Black Board if we have to go remote.\nIn the event of campus closure, exams are online.\n## Academic Integrity\nAll examinations will be done online.')).not.toContain('online-exams');
 });
 test('positive exam and quiz weights preserve quiz warnings beside no-exams wording',()=>{
  const result=scan('There are no exams.\n### Criteria Details:\n| Quizzes | 15% |\n| Final Exam | 0% |');
  expect(result.some(f=>f.kind==='no-exams')).toBe(true);
  expect(result.some(f=>f.kind==='quiz-weight'&&f.weight===15)).toBe(true);
  expect(result.some(f=>f.kind==='exam-weight')).toBe(false);
 });
 test('exam existence alone does not contradict an online policy',()=>{
  const base=courses.find(c=>c.id==='CSCI-4220')!.evidence[0];
  const exists={...base,verdict:'has-exams',examModality:undefined} as Evidence;
  const online={...base,verdict:'online'} as Evidence;
  expect(resolveVerdict([exists,online]).verdict).not.toBe('conflicting');
  expect(resolveVerdict([{...exists,examModality:'in-person'},online]).verdict).toBe('conflicting');
  expect(resolveVerdict([{...exists,sectionCrns:[1]},{...online,verdict:'no-exams',sectionCrns:[2]}]).verdict).not.toBe('conflicting');
 });
 test('reviewed changes preserve material restrictions',()=>{
  const hardware=courses.find(c=>c.id==='ECSE-4770')!;
  expect(hardware.verdict).toBe('no-exams');expect(hardware.evidence.some(e=>e.hasQuizzes)).toBe(true);
  expect(courses.find(c=>c.id==='MGMT-6140')!.evidence.some(e=>e.hasQuizzes&&e.summary.includes('35%'))).toBe(true);
  expect(courses.find(c=>c.id==='CSCI-2800')!.verdict).toBe('has-exams');
  expect(courses.find(c=>c.id==='ENGR-4010')!.verdict).toBe('has-exams');
  const money=courses.find(c=>c.id==='ECON-4130')!;
  expect(money.verdict).toBe('conflicting');
  expect(money.evidence.some(e=>e.id==='aefis-19504'&&e.examModality==='in-person'&&e.matchInstructor==='Greene')).toBe(true);
  const marketing=courses.find(c=>c.id==='MGMT-2430')!;
  const agrawal=marketing.evidence.find(e=>e.id==='aefis-20035')!;
  expect(agrawal.sectionCrns!.every(crn=>marketing.sections.find(s=>s.crn===crn)!.timeslots.some(t=>/Agrawal/.test(t.instructor)))).toBe(true);
  expect(marketing.evidence.some(e=>e.matchInstructor==='Jain'&&e.verdict==='take-home')).toBe(true);
  expect(courses.find(c=>c.id==='MGMT-4100')!.verdict).toBe('take-home');
 });
 test('archive matching leaves unknown classifications unchanged',()=>{
  expect(filterCourses(courses,{...filters,archive:'historical-syllabus'})).toHaveLength(meta.syllabusArchive.coursesWithSyllabus);
  const unknownCourse=courses.find(c=>c.verdict==='unknown'&&c.syllabusResearch.quizSignals.length)!;
  expect(unknownCourse).toBeDefined();
  expect(filterCourses([unknownCourse],filters)).toHaveLength(1);
  expect(unknownCourse.verdict).toBe('unknown');
 });
 test('all 1009 decisions and every section are preserved',()=>{
  const ledger=JSON.parse(readFileSync('data/research/course-classification.json','utf8'));
  expect(ledger.courses).toHaveLength(1009);
  expect(new Set(ledger.courses.map((c:{id:string})=>c.id)).size).toBe(1009);
  expect(courses.every(c=>c.classificationReview.reason&&c.sectionAssessments.length===c.sections.length)).toBe(true);
 });
 test('full-course exams displace misleading project or remote-only shortcuts',()=>{
  for(const id of ['CSCI-4480','ECSE-4480','MANE-4560','PHYS-2210','CSCI-4550','BMED-4010'])expect(courses.find(c=>c.id===id)!.verdict).toBe('has-exams');
  expect(courses.find(c=>c.id==='CSCI-2300')!.verdict).toBe('conflicting');
  expect(courses.find(c=>c.id==='CHME-2100')!.evidence.some(e=>e.verdict==='no-exams'&&e.hasQuizzes)).toBe(true);
 });
 test('project reviews and midterm papers are not exams',()=>{
  for(const id of ['ARCH-4325','ARCH-5325','ARCH-6830','COMM-4897','MANE-4620'])expect(courses.find(c=>c.id===id)!.verdict).toBe('project-based');
 });
 test('teacher and H/campus differences produce separate section conclusions',()=>{
  for(const id of ['MGMT-2430','ISYE-6620','MANE-4640'])expect(courses.find(c=>c.id===id)!.verdict).toBe('section-dependent');
  const c=courses.find(c=>c.id==='MANE-4640')!;
  expect(filterCourses([c],{...filters,program:'campus'})[0].verdict).toBe('has-exams');
  expect(filterCourses([c],{...filters,program:'atwork'})[0].verdict).toBe('no-exams');
  expect(courses.find(c=>c.id==='COGS-2120')!.verdict).toBe('coursework-based');
 });
});
