import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import type {Evidence,Section,SyllabusResearch,SyllabusReference,SyllabusCoverage} from '../../src/lib/types.ts';
import type {ArchiveRow,Finding} from './syllabus-analysis.ts';
export interface AnalyzedDocument extends ArchiveRow {currentCrns:number[];match:string;findings:Finding[];}
export interface Analysis {
 id:string;state:SyllabusResearch['state'];archiveDocuments:number;matchedDocuments:number;usableDocuments:number;
 latestTerm:string|null;matchedCurrentCrns:number[];documents:AnalyzedDocument[];
}
interface Review {
 courseId:string;documentId:number;verdict:Evidence['verdict']|null;quote:string;line:number;
 summary:string;caveat:string;hasQuizzes:boolean;matchInstructor?:string;examModality?:'in-person';
}
const normalize=(s:string)=>s.replace(/[*_`~]/g,'').replace(/\s+/g,' ').trim();
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const reference=(d:AnalyzedDocument):SyllabusReference=>({id:d.id,title:d.title,section:d.section,term:d.term,instructors:d.instructors,url:d.url,path:'data/syllabi/'+d.path,sha256:d.sha256,currentCrns:d.currentCrns});
export async function loadSyllabusResearch(courses:{id:string;sections:Section[]}[]) {
 const text=await readFile('data/research/syllabus-analysis.jsonl','utf8');
 const analyses=text.trim().split('\n').map(line=>JSON.parse(line)) as Analysis[];
 const summary=JSON.parse(await readFile('data/research/syllabus-analysis-summary.json','utf8'));
 if(createHash('sha256').update(text).digest('hex')!==summary.analysisSha256)throw new Error('Analysis checksum mismatch; run bun run syllabi:analyze');
 for(const path of ['data/syllabi/index.jsonl','data/syllabi/title-aliases.json','data/raw/courses.json','scripts/lib/syllabus-analysis.ts']){
  if(createHash('sha256').update(await readFile(path)).digest('hex')!==summary.inputs?.[path])throw new Error('Stale syllabus analysis: '+path+'; run bun run syllabi:analyze');
 }
 const reviews=JSON.parse(await readFile('data/research/syllabus-reviews.json','utf8')) as Review[];
 const evidence:Evidence[]=[];
 const research=new Map<string,SyllabusResearch>();
 if(analyses.length!==courses.length||new Set(analyses.map(a=>a.id)).size!==courses.length)throw new Error('Incomplete syllabus analysis');
 for(const a of analyses){
  const course=courses.find(c=>c.id===a.id);if(!course)throw new Error('Unrecognized analyzed course '+a.id);
  const notes:SyllabusResearch['notes']=[];
  const quizSignals:SyllabusResearch['quizSignals']=[];
  for(const r of reviews.filter(r=>r.courseId===a.id)){
   const d=a.documents.find(d=>d.id===r.documentId&&d.hasSyllabus);
   if(!d)throw new Error('Reviewed document is not a matched syllabus: '+r.documentId);
   const markdown=await readFile('data/syllabi/'+d.path,'utf8');
   if(createHash('sha256').update(markdown).digest('hex')!==d.sha256)throw new Error('Reviewed Markdown checksum mismatch: '+r.documentId);
   if(!normalize(markdown.split('\n')[r.line-1]??'').includes(normalize(r.quote)))throw new Error(`Review quote/line mismatch: ${r.documentId}:${r.line}`);
   if(r.quote.split(/\s+/).length>25)throw new Error('Quote too long: '+r.documentId);
   if(r.hasQuizzes){const f=d.findings.find(f=>f.kind==='quiz-weight');quizSignals.push({source:reference(d),quote:f?.quote??(/quiz/i.test(r.quote)?r.quote:''),line:f?.line??r.line,reviewed:true});}
   if(r.verdict===null){notes.push({source:reference(d),quote:r.quote,line:r.line,summary:r.summary,caveat:r.caveat,hasQuizzes:r.hasQuizzes});continue;}
   const titles=[...new Set(course.sections.filter(s=>d.currentCrns.includes(s.crn)).map(s=>s.title))];
   evidence.push({id:'aefis-'+d.id,courseIds:[a.id],titlePattern:'^(?:'+titles.map(escape).join('|')+')$',
    verdict:r.verdict,sourceType:'syllabus',title:`${a.id} · AEFIS ${d.term} · ${d.section}`,
    url:d.url,term:d.term,scope:'historical',sourceDate:null,sourceTermCode:d.termCode,
    checkedAt:summary.checkedAt,verification:'full-text',instructor:d.instructors.join(' / ')||null,
    sectionPattern:/^H/i.test(d.section)?'^H':'^(?!H)',...(r.matchInstructor?{matchInstructor:r.matchInstructor}:{}),
    sourceLocator:`courseSectionId=${d.id}；Markdown 第 ${r.line} 行`,archivePath:'data/syllabi/'+d.path,archiveSha256:d.sha256,
    quote:r.quote,summary:r.summary,caveat:r.caveat,confidence:'medium',hasQuizzes:r.hasQuizzes,...(r.examModality?{examModality:r.examModality}:{})});
  }
  // Keep only explicit, positively weighted quiz rows as automatic warnings.
  for(const d of a.documents){
   if(quizSignals.length>=2)break;
   const f=d.findings.find(f=>f.kind==='quiz-weight');
   if(f&&!quizSignals.some(q=>q.source.id===d.id))quizSignals.push({source:reference(d),quote:f.quote,line:f.line,reviewed:false});
  }
  const references:SyllabusReference[]=[];const seen=new Set<string>();
  for(const d of a.documents.filter(d=>d.hasSyllabus)){
   const key=d.termCode+'|'+d.title+'|'+d.instructors.join('|');if(seen.has(key))continue;seen.add(key);
   references.push(reference(d));if(references.length===3)break;
  }
  research.set(a.id,{state:a.state,checkedAt:summary.checkedAt,archiveDocuments:a.archiveDocuments,matchedDocuments:a.matchedDocuments,usableDocuments:a.usableDocuments,latestTerm:a.latestTerm,matchedCurrentCrns:a.matchedCurrentCrns,references,quizSignals,notes});
 }
 if(reviews.some(r=>!courses.some(c=>c.id===r.courseId)))throw new Error('Review course not offered');
 const coverage:SyllabusCoverage={documents:summary.archiveDocuments,terms:summary.archiveTerms,coursesWithSyllabus:summary.coursesWithSyllabus,coursesWithMatchingDocuments:summary.coursesWithMatchingDocuments,states:summary.states,checkedAt:summary.checkedAt,manualReviewedCourses:new Set(reviews.map(r=>r.courseId)).size};
 return {evidence,research,coverage};
}
