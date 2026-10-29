import {readFile} from 'node:fs/promises';
const args=process.argv.slice(2);
const option=(name:string)=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);
if(args.includes('--help')){
 console.log('bun run syllabi:query --course=CSCI-4220 --term=202609 --subject=CSCI --title=Network --keyword=exam --limit=20 --json');process.exit(0);
}
const rows=(await readFile('data/syllabi/index.jsonl','utf8')).trim().split('\n').map(s=>JSON.parse(s));
const course=option('course')?.toUpperCase(),term=option('term'),subject=option('subject')?.toUpperCase(),title=option('title')?.toLowerCase(),keyword=option('keyword')?.toLowerCase(),limit=Number(option('limit')??'20');
if(!Number.isSafeInteger(limit)||limit<1)throw new Error('Use a positive --limit');
const matches=[];
for(const row of rows){
 if(course&&row.courseId!==course||term&&row.termCode!==term||subject&&row.subject!==subject||title&&!row.title.toLowerCase().includes(title))continue;
 if(keyword&&!(await readFile('data/syllabi/'+row.path,'utf8')).toLowerCase().includes(keyword))continue;
 matches.push(row);
}
matches.sort((a,b)=>b.termCode.localeCompare(a.termCode)||a.courseId.localeCompare(b.courseId)||a.id-b.id);
if(args.includes('--json'))console.log(JSON.stringify({total:matches.length,results:matches.slice(0,limit)},null,2));
else{console.log(`Matched ${matches.length}; showing ${Math.min(limit,matches.length)}`);for(const r of matches.slice(0,limit))console.log(`${r.courseId}\t${r.termCode}\t${r.title}\t${r.section}\t${r.hasSyllabus?'syllabus':'missing'}\tdata/syllabi/${r.path}`)}
