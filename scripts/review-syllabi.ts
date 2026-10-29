import {readFile} from 'node:fs/promises';
import type {Analysis,AnalyzedDocument} from './lib/syllabus-research.ts';
import type {Dataset} from '../src/lib/types.ts';
import {candidateVerdicts} from '../src/lib/catalog.ts';
const args=process.argv.slice(2);
const option=(key:string)=>args.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3);
const analyses=(await readFile('data/research/syllabus-analysis.jsonl','utf8')).trim().split('\n').map(line=>JSON.parse(line)) as Analysis[];
const {courses}=JSON.parse(await readFile('public/data/courses.json','utf8')) as Dataset;
const reviews=JSON.parse(await readFile('data/research/syllabus-reviews.json','utf8')) as {courseId:string;documentId:number}[];
const ids=option('ids')?.split(',');
const mode=option('mode')??'candidates';
const offset=Number(option('offset')??0),limit=Number(option('limit')??10);
const rows=analyses.filter(a=>a.usableDocuments&&(!ids||ids.includes(a.id))&&(ids||!reviews.some(r=>r.courseId===a.id))&&(ids||mode!=='candidates'||candidateVerdicts.has(courses.find(c=>c.id===a.id)!.verdict)));
console.log(`Queue ${rows.length}; ${offset}–${Math.min(rows.length,offset+limit)}`);
for(const a of rows.slice(offset,offset+limit)){
 const c=courses.find(c=>c.id===a.id)!;
 let documents=a.documents.filter(d=>d.hasSyllabus);
 const requested=option('document');if(requested)documents=documents.filter(d=>d.id===Number(requested));
 const unique:AnalyzedDocument[]=[];const seen=new Set<string>();
 for(const d of documents){const key=d.termCode+'|'+d.instructors.join('|')+'|'+/^H/i.test(d.section);if(seen.has(key))continue;seen.add(key);unique.push(d);if(unique.length>=Number(option('documents')??1))break;}
 console.log(`\n=== ${a.id} ${c.title}; currently ${c.verdict}; current teachers ${c.instructors.join(' / ')} ===`);
 for(const d of unique){
  console.log(`SOURCE ${d.id} ${d.term} ${d.section} ${d.instructors.join(' / ')} ${d.path}`);
  const lines=(await readFile('data/syllabi/'+d.path,'utf8')).split('\n');
  let heading='',institutional=false,grading=false;
  for(let i=15;i<lines.length;i++){
   const line=lines[i];if(/^#{1,6} /.test(line)){heading=line;institutional=/academic integrity|disabilit|accommodat|wellness|mental health|sexual|harassment|religious|title ix|institute polic/i.test(heading);grading=/grading|criteria|assessment|evaluation|assessment measures/i.test(heading);}
   if(!line.trim()||institutional)continue;
   if(args.includes('--full')||grading||/\bexam|\btest(?:s|\b)|quiz|take[ -]home|grading|grade (?:is|will|consists)|\b\d+(?:\.\d+)?\s*%/i.test(line))console.log(`${i+1}: ${line}`);
  }
 }
}
