import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { csvEscape, exportCsv, filterCourses, resolveVerdict } from '../src/lib/catalog';
import type { Dataset, Evidence } from '../src/lib/types';
const {courses}=JSON.parse(readFileSync('public/data/courses.json','utf8')) as Dataset;
const filters={query:'',status:'all',subject:'all',level:'all',source:'all',quizzes:false,savedOnly:false,sort:'evidence'};
describe('evidence correctness and useful filters',()=>{
  test('unknown does not imply no exams',()=>expect(resolveVerdict([])).toEqual({verdict:'unknown',confidence:null}));
  test('contradictory exam records stay visible',()=>{
    const c=courses.find(c=>c.id==='CSCI-4220')!;expect(c.verdict).toBe('conflicting');expect(c.evidence.some(e=>e.verdict==='has-exams')).toBe(true);
  });
  test('current evidence supersedes old policy',()=>{
    const old=courses.find(c=>c.id==='CSCI-4220')!.evidence;
    const current={...old[0],verdict:'online',scope:'current',term:'Spring 2027'} as Evidence;
    expect(resolveVerdict([...old,current]).verdict).toBe('online');
  });
  test('online classroom does not create online-exam classification',()=>{
    const onlineUnknown=courses.filter(c=>c.onlineSections>0&&!c.evidence.length);
    expect(onlineUnknown.length).toBeGreaterThan(0);expect(onlineUnknown.every(c=>c.verdict==='unknown')).toBe(true);
  });
  test('professor-scoped economics evidence excludes Wint Thu',()=>{
    const c=courses.find(c=>c.id==='INQR-1200')!;const eligible=c.evidence[0].sectionCrns!;
    expect(eligible.length).toBeGreaterThan(0);
    expect(c.sections.filter(s=>eligible.includes(s.crn)).every(s=>s.timeslots.some(t=>/Greene/.test(t.instructor)))).toBe(true);
    expect(c.sections.some(s=>!eligible.includes(s.crn))).toBe(true);
  });
  test('course titles prevent reused topics IDs matching',()=>expect(courses.find(c=>c.id==='CSCI-4964')!.evidence).toHaveLength(0));
  test('current project description is not an exam-free confirmation',()=>{
    const c=courses.find(c=>c.id==='CSCI-4968')!;expect(c.verdict).toBe('project-based');
    expect(c.evidence.some(e=>e.scope==='current')).toBe(true);expect(c.evidence.some(e=>e.verdict==='no-exams')).toBe(false);
  });
  test('search combines course, title and professor terms',()=>expect(filterCourses(courses,{...filters,query:'CSCI 4220 Lei'}).map(c=>c.id)).toEqual(['CSCI-4220']));
  test('only requested saved courses appear',()=>expect(filterCourses(courses,{...filters,savedOnly:true},['CHEM-4810']).map(c=>c.id)).toEqual(['CHEM-4810']));
  test('known quizzes are excluded, uncertainty preserved',()=>{
    const results=filterCourses(courses,{...filters,quizzes:true});expect(results.every(c=>!c.evidence.some(e=>e.hasQuizzes))).toBe(true);expect(results.some(c=>c.verdict==='unknown')).toBe(true);
  });
  test('candidate filter excludes unknowns and known conflicts',()=>{
    const results=filterCourses(courses,{...filters,status:'candidates'});expect(results.length).toBeGreaterThan(0);expect(results.some(c=>['unknown','conflicting','has-exams','no-final'].includes(c.verdict))).toBe(false);
  });
  test('At Work evidence never applies to campus sections sharing a course ID',()=>{
    const c=courses.find(c=>c.id==='MANE-5000')!;
    const policy=c.evidence.find(e=>e.id.startsWith('atwork-'))!;
    expect(policy.scope).toBe('undated');
    expect(policy.sectionCrns!.every(crn=>c.sections.find(s=>s.crn===crn)!.sec.startsWith('H'))).toBe(true);
    const campus=filterCourses([c],{...filters,program:'campus'})[0];
    expect(campus.evidence.some(e=>e.id.startsWith('atwork-'))).toBe(false);
    expect(campus.verdict).not.toBe('no-exams');
    expect(filterCourses([c],{...filters,program:'atwork'})[0].verdict).toBe('no-exams');
  });
  test('remote finals do not erase evidence of other exams',()=>{
    const c=courses.find(c=>c.id==='ARCH-4330')!;
    expect(c.verdict).toBe('has-exams');
    expect(c.evidence.some(e=>e.verdict==='online-final'&&e.assessmentOnly==='final')).toBe(true);
  });
  test('TBA final schedules cannot create exam-free candidates',()=>{
    const c=courses.find(c=>c.verdict==='scheduled-final')!;
    expect(c).toBeDefined();expect(filterCourses([c],{...filters,status:'candidates'})).toHaveLength(0);
  });
  test('coverage accounts for every course without turning searches into conclusions',()=>{
    expect(courses.every(c=>['evidence','searched','initial','unsearched'].includes(c.research.state))).toBe(true);
    expect(courses.filter(c=>c.research.state==='searched').every(c=>c.verdict==='unknown'&&c.research.searchIds.length>0)).toBe(true);
    expect(courses.filter(c=>c.research.state==='initial').every(c=>c.verdict==='unknown'&&c.research.searchIds.length>0)).toBe(true);
  });
  test('CSV protects formulas and retains source URLs',()=>{
    expect(csvEscape('=1+1')).toBe('"\'=1+1"');expect(csvEscape('a"b')).toBe('"a""b"');
    const c=courses.find(c=>c.id==='CHEM-4810')!;const csv=exportCsv([c]);expect(csv).toContain(c.evidence[0].url);expect(csv).toContain('2023');expect(csv.startsWith('\ufeff')).toBe(true);
  });
});
