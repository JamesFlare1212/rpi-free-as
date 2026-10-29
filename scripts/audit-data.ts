import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import type { Dataset, Evidence } from '../src/lib/types.ts';

const dataset=JSON.parse(await readFile('public/data/courses.json','utf8')) as Dataset;
const raw=JSON.parse(await readFile('data/raw/courses.json','utf8')) as {courses:{id:string;sections:{crn:number}[]}[]}[];
const manifest=JSON.parse(await readFile('data/raw/manifest.json','utf8')) as {files:{name:string;sha256:string}[]};
for(const f of manifest.files)assert.equal(createHash('sha256').update(await readFile('data/raw/'+f.name)).digest('hex'),f.sha256,`Raw checksum mismatch: ${f.name}`);
const ids=raw.flatMap(d=>d.courses.map(c=>c.id));
assert.equal(new Set(ids).size,ids.length);
assert.deepEqual(dataset.courses.map(c=>c.id).sort(),[...ids].sort(),'Every upstream course must appear exactly once');
assert.equal(dataset.meta.totalCourses,ids.length);
assert.equal(dataset.meta.totalSections,raw.flatMap(d=>d.courses).reduce((n,c)=>n+c.sections.length,0));
assert.equal(dataset.meta.totalDepartments,raw.length);
const evidence=JSON.parse(await readFile('data/evidence.json','utf8')) as Evidence[];
const searches=[...JSON.parse(await readFile('data/research/searches.json','utf8')),...JSON.parse(await readFile('data/research/initial-searches.json','utf8'))] as {id:string;courseIds:string[];kind:string;query:string}[];
assert.equal(new Set(searches.map(q=>q.id)).size,searches.length,'Query IDs must be unique');
for(const q of searches)for(const id of q.courseIds) {
  assert.ok(ids.includes(id),`Query assigned to a course not offered: ${id}`);
  if(q.kind==='initial-search')assert.ok(q.query.includes(id.replace('-',' ')),`Initial query must name the actual course: ${id}`);
}
assert.equal(new Set(evidence.map(e=>e.id)).size,evidence.length);
for(const e of evidence) {
  assert.ok(e.title && e.summary && e.caveat && e.checkedAt,`Evidence metadata missing: ${e.id}`);
  assert.ok(e.quote || e.sourceLocator,`Evidence needs an excerpt or precise source locator: ${e.id}`);
  assert.equal(new URL(e.url).protocol,'https:');
  assert.ok(e.scope!=='current' || e.term==='Spring 2027',`Current-term claim must have matching term: ${e.id}`);
  assert.ok(e.scope==='current' || e.confidence!=='high',`Historical evidence cannot have high confidence: ${e.id}`);
  for(const id of e.courseIds)assert.ok(ids.includes(id),`Evidence points to a course not offered: ${id}`);
}
for(const c of dataset.courses) {
  const original=raw.flatMap(d=>d.courses).find(r=>r.id===c.id)!;
  assert.deepEqual(c.sections.map(s=>s.crn),original.sections.map(s=>s.crn),`Lost section: ${c.id}`);
  assert.equal(c.verdict==='unknown',c.evidence.length===0,`Unknown cannot be classified from missing evidence: ${c.id}`);
  assert.equal(c.research.state==='evidence',c.evidence.length>0);
  for(const queryId of c.research.searchIds)assert.ok(searches.some(q=>q.id===queryId&&q.courseIds.includes(c.id)));
  if(c.research.state==='initial')assert.ok(c.research.searchIds.some(id=>searches.find(q=>q.id===id)?.kind==='initial-search'));
  for(const e of c.evidence) {
    assert.ok(e.sectionCrns?.length);
    for(const crn of e.sectionCrns!) {
      const section=c.sections.find(s=>s.crn===crn);assert.ok(section);
      assert.ok(new RegExp(e.titlePattern,'i').test(section.title));
      if(e.matchInstructor)assert.ok(section.timeslots.some(t=>new RegExp(e.matchInstructor!,'i').test(t.instructor)));
      if(e.sectionPattern)assert.ok(new RegExp(e.sectionPattern).test(section.sec));
    }
  }
}
for(const c of dataset.courses.filter(c=>c.evidence.some(e=>e.id.startsWith('atwork-')))) {
  for(const e of c.evidence.filter(e=>e.id.startsWith('atwork-'))) {
    assert.equal(e.scope,'undated');
    assert.ok(e.sectionCrns?.every(crn=>c.sections.find(s=>s.crn===crn)?.sec.startsWith('H')));
  }
}
assert.equal(dataset.courses.find(c=>c.id==='CSCI-4964')?.verdict,'unknown');
assert.equal(dataset.courses.find(c=>c.id==='CSCI-4220')?.verdict,'conflicting');
console.log(`PASS: ${ids.length} courses, ${dataset.meta.totalSections} sections, ${raw.length} departments; checksums, all IDs, all CRNs, ${evidence.length} evidence records, title/instructor guards and uncertainty verified.`);
