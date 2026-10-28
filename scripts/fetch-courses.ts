import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const semester = '202701';
async function get(url: string): Promise<Response> {
  const response = await fetch(url, { headers: { 'User-Agent': 'RPI-Course-Atlas/1.0' }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}
// Resolve once, then fetch every file at the same immutable commit.
const commit = await (await get('https://api.github.com/repos/quacs/quacs-data/commits/master')).json() as {sha: string; commit: {committer: {date: string}}};
const base = `https://raw.githubusercontent.com/quacs/quacs-data/${commit.sha}`;
const names = ['courses', 'catalog', 'schools', 'csci-topics'] as const;
const files = await Promise.all(names.map(async name => {
  const path = name === 'csci-topics' ? 'csci_topics/catalog.json' : `${name}.json`;
  const text = await (await get(`${base}/semester_data/${semester}/${path}`)).text();
  JSON.parse(text);
  return { name, text, sha256: createHash('sha256').update(text).digest('hex') };
}));
const license = await (await get(`${base}/LICENSE`)).text();
await mkdir('data/raw', { recursive: true });
for (const file of files) await writeFile(`data/raw/${file.name}.json`, file.text);
await writeFile('data/raw/LICENSE-QUACS', license);
await writeFile('data/raw/manifest.json', JSON.stringify({
  semester, commit: commit.sha, sourceUpdatedAt: commit.commit.committer.date,
  fetchedAt: new Date().toISOString(), base,
  files: files.map(({name, sha256}) => ({name: `${name}.json`, sha256})),
}, null, 2) + '\n');
console.log(`Downloaded complete ${semester} snapshot at ${commit.sha}. Run bun run data:build.`);
