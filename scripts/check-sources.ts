import { readFile, writeFile } from 'node:fs/promises';
import type { Evidence } from '../src/lib/types.ts';
const evidence=[...JSON.parse(await readFile('data/evidence.json','utf8')),...JSON.parse(await readFile('data/evidence-syllabi.json','utf8'))] as Evidence[];
const urls=[...new Set(evidence.flatMap(e=>[e.url,...(e.supportingUrls??[])]))];
const checked=new Map<string,Promise<{status:number|null;finalUrl?:string;error?:string}>>();
const results: {url:string;status:number|null;checkedAt:string;finalUrl?:string;error?:string}[]=[];
let next=0;
await Promise.all(Array.from({length:4},async()=>{
  while(next<urls.length) {
    const url=urls[next++];
    try {
      const base=url.split('#')[0];
      if(!checked.has(base))checked.set(base,(async()=>{
        const response=await fetch(base,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Mozilla/5.0 (compatible; Course-Atlas public-source verification)'}});
        await response.body?.cancel();return {status:response.status,finalUrl:response.url};
      })().catch(e=>({status:null,error:e instanceof Error?e.message:String(e)})));
      results.push({url,...await checked.get(base)!,checkedAt:new Date().toISOString()});
    }catch(e){results.push({url,status:null,error:e instanceof Error?e.message:String(e),checkedAt:new Date().toISOString()});}
  }
}));
await writeFile('data/source-checks.json',JSON.stringify(results.sort((a,b)=>a.url.localeCompare(b.url)),null,2)+'\n');
console.log(`${results.length} unique URLs checked. ${results.filter(r=>r.status===200).length} available. A 200 status is not a content or exam-policy verification. Run bun run data:build to update displayed availability.`);
