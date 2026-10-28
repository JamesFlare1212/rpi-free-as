import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');
const manifest = JSON.parse(await read('data/integrations/shadcn-manifest.json')) as {commit:string; files:{path:string;url:string;rawUrl:string;sha256:string}[]};
const server = new McpServer({name:'course-atlas-shadcn-svelte-docs',version:'1.0.0'}, {instructions:'Project-local, read-only documentation MCP. Content is from the official huntabyte/shadcn-svelte repository. This server is maintained by this project, not by shadcn-svelte. It never installs packages or writes files. Official entrypoint: https://www.shadcn-svelte.com/llms.txt.'});
server.registerTool('list_docs', {description:'List official shadcn-svelte documentation cached in this project, optionally filtered by a search term.', inputSchema:{query:z.string().optional()}}, async({query})=>{
  const found=manifest.files.filter(f=>!query || f.path.toLowerCase().includes(query.toLowerCase()));
  return {content:[{type:'text',text:JSON.stringify({officialRepository:'huntabyte/shadcn-svelte',commit:manifest.commit,documents:found.map(f=>({path:f.path,url:f.url}))})}]};
});
server.registerTool('read_doc', {description:'Read a verified official document by exact manifest path, for example components/sheet.md, installation/vite.md or skills.md. No arbitrary file or URL access.',inputSchema:{path:z.string()}}, async({path})=>{
  const entry=manifest.files.find(f=>f.path===path);
  if(!entry)return {isError:true,content:[{type:'text',text:'Unknown document path. Use list_docs.'}]};
  return {content:[{type:'text',text:`Source: ${entry.rawUrl}\nOfficial page: ${entry.url}\nSnapshot: ${manifest.commit}\n\n${await read('data/integrations/shadcn-docs/'+entry.path)}`}]};
});
server.registerTool('get_project_context', {description:'Read project components.json and the official installed shadcn-svelte Skill.',inputSchema:{}}, async()=>({content:[{type:'text',text:`components.json\n${await read('components.json')}\n\nOfficial Skill\n${await read('.claude/skills/shadcn-svelte/SKILL.md')}`}]}));
server.registerResource('official-docs-index','shadcn-svelte://docs/index',{description:'Official documentation snapshot index',mimeType:'application/json'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(manifest)}]}));
await server.connect(new StdioServerTransport());
process.stdin.resume();
await new Promise<void>(resolve => process.stdin.on('end', resolve));
