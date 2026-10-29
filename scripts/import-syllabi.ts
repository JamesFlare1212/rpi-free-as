import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {groupBy} from './lib/group-by.ts';

const source=process.argv.find(a=>a.startsWith('--source='))?.slice(9)??'data/aefis.local';
const destination='data/syllabi';
const records=JSON.parse(await readFile(join(source,'markdown-manifest.json'),'utf8')) as Record<string,any>;
const raw=JSON.parse(await readFile(join(source,'raw-manifest.json'),'utf8')) as Record<string,any>;
const expected=JSON.parse(await readFile(join(source,'sections.json'),'utf8')) as any[];
if(expected.length!==Object.keys(records).length)throw new Error('Incomplete Markdown archive');
const rows:any[]=[];
let next=0;
await mkdir(destination,{recursive:true});
const input=Object.values(records);
await Promise.all(Array.from({length:8},async()=>{
 while(next<input.length){
  const record=input[next++],id=String(record.courseSectionId),original=raw[id];
  if(!original||record.sourceSha256!==original.sha256)throw new Error('Source mismatch '+id);
  if(!/^[A-Z0-9]+-[A-Z0-9]+$/.test(record.courseId)||!/^\d{6,8}$/.test(record.sourceTermCode))throw new Error('Unexpected path component '+id);
  const bytes=await readFile(join(source,record.file));
  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(sha256!==record.sha256)throw new Error('Markdown checksum mismatch '+id);
  const subject=record.courseId.split('-')[0];
  const section=String(record.section).replace(/[^A-Z0-9_-]/gi,'_')||'section';
  const path=join('markdown',record.sourceTermCode,subject,record.courseId,`${section}--${id}.md`);
  await mkdir(join(destination,path,'..'),{recursive:true});
  await writeFile(join(destination,path),bytes);
  rows.push({id:Number(id),courseId:record.courseId,title:record.title,section:record.section,subject,termCode:record.sourceTermCode,term:record.sourceTerm,instructors:original.instructors??[],path:path.replaceAll('\\','/'),url:record.sourceUrl,canonicalUrl:original.canonicalUrl,sha256,bytes:bytes.length,htmlSha256:record.sourceSha256,hasSyllabus:!record.explicitNoDefaultMessage,formattingReview:record.needsReview,conversion:record.conversionVersion});
 }
}));
rows.sort((a,b)=>a.termCode.localeCompare(b.termCode)||a.courseId.localeCompare(b.courseId)||a.title.localeCompare(b.title)||a.section.localeCompare(b.section)||a.id-b.id);
const index=rows.map(r=>JSON.stringify(r)).join('\n')+'\n';
await writeFile(join(destination,'index.jsonl'),index);
const groups=groupBy(rows,r=>r.courseId);
for(const [courseId,docs] of groups){
 const subject=courseId.split('-')[0],dir=join(destination,'by-course',subject);
 await mkdir(dir,{recursive:true});
 const safe=(s:string)=>s.replaceAll('|','\\|').replaceAll('\n',' ');
 const table=docs.map(r=>`| ${r.term} | ${safe(r.title)} | ${r.section} | ${safe(r.instructors.join(' / '))} | ${r.hasSyllabus?'有正文':'无大纲提示'} | [${r.id}](../../${r.path}) |`).join('\n');
 await writeFile(join(dir,courseId+'.md'),`# ${courseId}\n\n历史分班大纲索引；学期、标题和教师需同时核对。\n\n| 学期 | 分班标题 | 班次 | 历史教师 | 内容 | 文件 |\n| --- | --- | --- | --- | --- | --- |\n${table}\n`);
}
const terms=[...groupBy(rows,r=>r.termCode)].map(([code,docs])=>({code,name:docs[0].term,documents:docs.length,withSyllabus:docs.filter(r=>r.hasSyllabus).length}));
const manifest={schemaVersion:1,collectedAt:'2026-10-29',source:'https://assessment.rpi.edu/index.cfm/page/AefisCourseSection.Manager',scope:'All 34 academic terms visible in the unfiltered source catalogue; CoCurricular=false',documents:rows.length,courseIds:groups.size,terms,markdownBytes:rows.reduce((n,r)=>n+r.bytes,0),withSyllabus:rows.filter(r=>r.hasSyllabus).length,explicitMissingSyllabus:rows.filter(r=>!r.hasSyllabus).length,indexSha256:createHash('sha256').update(index).digest('hex'),parser:'PageSift 0.81.0 local',originalHtml:'Private cache; excluded from Git',publicationDateHintsArePolicyDates:false};
await writeFile(join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(join(destination,'TERMS.md'),'# 学期索引\n\n| 学期 | 代码 / 目录 | 分班文件 | 有正文 |\n| --- | --- | ---: | ---: |\n'+terms.map(t=>`| ${t.name} | [${t.code}](markdown/${t.code}/) | ${t.documents} | ${t.withSyllabus} |`).join('\n')+'\n');
console.log(JSON.stringify({documents:rows.length,courseIds:groups.size,terms:terms.length,bytes:manifest.markdownBytes,withSyllabus:manifest.withSyllabus}));
