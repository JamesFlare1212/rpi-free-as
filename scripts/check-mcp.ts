import { mkdir, writeFile } from 'node:fs/promises';

const child = Bun.spawn(['bun', 'scripts/shadcn-mcp.ts'], {stdin:'pipe',stdout:'pipe',stderr:'inherit'});
const reader=child.stdout.getReader();
const decoder=new TextDecoder();
let pending='';let id=0;
async function request(method:string,params:Record<string,unknown>={}) {
  const current=++id;
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:current,method,params})+'\n');
  await child.stdin.flush();
  const timeout=setTimeout(()=>child.kill(),10000);
  try {
    while(true) {
      const lineEnd=pending.indexOf('\n');
      if(lineEnd>=0) {
        const line=pending.slice(0,lineEnd);pending=pending.slice(lineEnd+1);
        if(!line.trim())continue;
        const message=JSON.parse(line);
        if(message.id===current) {if(message.error)throw new Error(JSON.stringify(message.error));return message.result;}
      } else {
        const {done,value}=await reader.read();if(done)throw new Error('MCP subprocess closed unexpectedly');pending+=decoder.decode(value,{stream:true});
      }
    }
  } finally {clearTimeout(timeout);}
}
try {
  const init=await request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'course-atlas-check',version:'1.0.0'}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  await child.stdin.flush();
  const {tools}=await request('tools/list');
  const doc=await request('tools/call',{name:'read_doc',arguments:{path:'components/sheet.md'}});
  if(doc.isError || !JSON.stringify(doc.content).includes('Sheet.Content'))throw new Error('MCP returned invalid official component documentation');
  const context=await request('tools/call',{name:'get_project_context',arguments:{}});
  if(context.isError || !JSON.stringify(context.content).includes('vega') || !JSON.stringify(context.content).includes('# shadcn-svelte') || !JSON.stringify(context.content).includes('.agents/skills/shadcn-svelte/SKILL.md'))throw new Error('Project config and shared skill from .agents/skills were not returned');
  const invalid=await request('tools/call',{name:'read_doc',arguments:{path:'../../package.json'}});
  if(!invalid.isError)throw new Error('MCP must reject paths outside the manifest');
  const result={checkedAt:new Date().toISOString(),status:'connected',transport:'stdio',server:init.serverInfo,officialDocumentRead:'components/sheet.md',projectContextRead:true,skillPath:'.agents/skills/shadcn-svelte/SKILL.md',pathTraversalRejected:true,tools:tools.map((t:{name:string})=>t.name)};
  await mkdir('data/integrations', {recursive: true});
  await writeFile('data/integrations/mcp-check.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {reader.releaseLock();child.stdin.end();child.kill();await child.exited;}
