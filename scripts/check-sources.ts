import { readFile, writeFile } from 'node:fs/promises';
import type { Evidence } from '../src/lib/types.ts';
const evidence=JSON.parse(await readFile('data/evidence.json','utf8')) as Evidence[];
const urls=[...new Set(evidence.map(e=>e.url))];
const results: {url:string;status:number|null;checkedAt:string;finalUrl?:string;error?:string}[]=[];
let next=0;
await Promise.all(Array.from({length:4},async()=>{
  while(next<urls.length) {
    const url=urls[next++];
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Course-Atlas/1.0 (public-source verification)'}});
      await response.body?.cancel();results.push({url,status:response.status,finalUrl:response.url,checkedAt:new Date().toISOString()});
    }catch(e){results.push({url,status:null,error:e instanceof Error?e.message:String(e),checkedAt:new Date().toISOString()});}
  }
}));
await writeFile('data/source-checks.json',JSON.stringify(results.sort((a,b)=>a.url.localeCompare(b.url)),null,2)+'\n');
console.log(`${results.length} unique URLs checked. ${results.filter(r=>r.status===200).length} available. A 200 status is not a content or exam-policy verification. Run bun run data:build to update displayed availability.`);
