import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extractFindings,matchSections,type ArchiveRow,type Finding,type FindingKind} from './lib/syllabus-analysis.ts';
import {groupBy} from './lib/group-by.ts';
import type {Analysis,AnalyzedDocument} from './lib/syllabus-research.ts';
import type {Section} from '../src/lib/types.ts';
interface CourseAnalysis extends Analysis {title:string;currentTitles:string[];observed:FindingKind[];rejected:{id:number;title:string;section:string;termCode:string;reason:string}[];}
const archive=(await readFile('data/syllabi/index.jsonl','utf8')).trim().split('\n').map(line=>JSON.parse(line)) as ArchiveRow[];
const inputs:Record<string,string>={};
for(const path of ['data/syllabi/index.jsonl','data/syllabi/title-aliases.json','data/raw/courses.json','scripts/lib/syllabus-analysis.ts'])inputs[path]=createHash('sha256').update(await readFile(path)).digest('hex');
const raw=JSON.parse(await readFile('data/raw/courses.json','utf8')) as {courses:{id:string;title:string;sections:Section[]}[]}[];
const courses=raw.flatMap(d=>d.courses);
let aliases=[];try{aliases=JSON.parse(await readFile('data/syllabi/title-aliases.json','utf8'))}catch{}
const grouped=groupBy(archive,r=>r.courseId);
const analyses:CourseAnalysis[]=[];let totalMatched=0,totalRead=0;
for(const course of courses){
 const rows=grouped.get(course.id)??[];
 const documents:AnalyzedDocument[]=[];const rejected:CourseAnalysis['rejected']=[];
 for(const row of rows){
  const match=matchSections(row,course.sections,aliases);
  if(!match.crns.length||!match.kind){rejected.push({id:row.id,title:row.title,section:row.section,termCode:row.termCode,reason:course.sections.some((s:any)=>/^H/i.test(s.sec)===/^H/i.test(row.section))?'title-mismatch':'program-mismatch'});continue;}
  totalMatched++;
  let findings:Finding[]=[];
  if(row.hasSyllabus){
   const text=await readFile('data/syllabi/'+row.path,'utf8');
   if(createHash('sha256').update(text).digest('hex')!==row.sha256)throw new Error('Changed Markdown: '+row.path);
   findings=extractFindings(text);totalRead++;
  }
  documents.push({...row,currentCrns:match.crns,match:match.kind,findings});
 }
 documents.sort((a,b)=>b.termCode.localeCompare(a.termCode)||a.id-b.id);
 const withBody=documents.filter(d=>d.hasSyllabus);
 const state=withBody.length?'historical-syllabus':documents.length?'empty-syllabus':rows.length?'title-or-program-mismatch':'not-in-archive';
 const observed=[...new Set(documents.flatMap(d=>d.findings.map(f=>f.kind)))];
 analyses.push({id:course.id,title:course.title,currentTitles:[...new Set(course.sections.map((s:any)=>s.title))],state,archiveDocuments:rows.length,matchedDocuments:documents.length,usableDocuments:withBody.length,matchedCurrentCrns:[...new Set(documents.flatMap(d=>d.currentCrns))],latestTerm:withBody[0]?.term??null,observed,documents,rejected});
}
const summary={schemaVersion:1,checkedAt:'2026-10-29',currentTerm:'Spring 2027',currentSemester:'202701',totalCurrentCourses:courses.length,archiveDocuments:archive.length,archiveTerms:new Set(archive.map(r=>r.termCode)).size,coursesWithMatchingDocuments:analyses.filter(a=>a.matchedDocuments).length,coursesWithSyllabus:analyses.filter(a=>a.usableDocuments).length,states:Object.fromEntries([...groupBy(analyses,a=>a.state)].map(([s,g])=>[s,g.length])),matchedDocuments:totalMatched,syllabiRead:totalRead,signalCourses:Object.fromEntries(['exam-weight','quiz-weight','project-weight','no-exams','no-final','take-home','online-exams','in-person-exams','quizzes'].map(k=>[k,analyses.filter(a=>a.observed.includes(k as FindingKind)).length])),method:'Full local Markdown scan; course ID AND normalized section title; H/campus separation; historical only. Signals are rule extractions, not current-term confirmation.',currentTermPoliciesConfirmed:0};
Object.assign(summary,{inputs,analysisSha256:createHash('sha256').update(analyses.map(a=>JSON.stringify(a)).join('\n')+'\n').digest('hex')});
await mkdir('data/research',{recursive:true});
await writeFile('data/research/syllabus-analysis.jsonl',analyses.map(a=>JSON.stringify(a)).join('\n')+'\n');
await writeFile('data/research/syllabus-analysis-summary.json',JSON.stringify(summary,null,2)+'\n');
await writeFile('data/research/syllabus-title-mismatches.json',JSON.stringify(analyses.filter(a=>a.state==='title-or-program-mismatch').map(a=>({id:a.id,currentTitles:a.currentTitles,archiveTitles:[...new Set(a.rejected.map(r=>r.title))]})),null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
