<script lang="ts">
  import type { Evidence } from './types';
  import { Badge } from '$lib/components/ui/badge';
  import { ExternalLink, FileText, MessageSquare, Clock3, AlertTriangle } from '@lucide/svelte';
  let { evidence: e }: { evidence: Evidence } = $props();
  const labels = { syllabus: '课程大纲', 'course-site': '课程网站', handbook: '项目手册', 'student-report': '学生经验' };
</script>

<article class="evidence-card">
  <div class="evidence-meta">
    <span>{#if e.sourceType === 'student-report'}<MessageSquare size={14} />{:else}<FileText size={14} />{/if}{labels[e.sourceType]}</span>
    <Badge variant="outline">{e.scope === 'current' ? '本学期' : e.scope === 'historical' ? '历史依据' : '学期未注明'}</Badge>
  </div>
  <a class="source-title" href={e.url} target="_blank" rel="noreferrer">{e.title}<ExternalLink size={14} /></a>
  <div class="source-date"><Clock3 size={13} />{e.term}{#if e.instructor}<span>· {e.instructor}</span>{/if}</div>
  <blockquote lang="en">“{e.quote}”</blockquote>
  <p>{e.summary}</p>
  <div class="evidence-caveat"><AlertTriangle size={15} /><p>{e.caveat}</p></div>
  {#if e.supportingUrls?.length}<div class="supporting">补充来源：{#each e.supportingUrls as url}<a href={url} target="_blank" rel="noreferrer">配套课程主页 <ExternalLink size={12} /></a>{/each}</div>{/if}
  <div class="evidence-foot"><span>核查于 {e.checkedAt} · {e.sourceStatus === 404 ? '原文 404 · 仅搜索索引' : e.verification === 'full-text' ? '已读取正文' : '仅搜索索引 · 原文失效'}</span><span>{e.confidence === 'medium' ? '中等' : e.confidence === 'high' ? '较高' : '较低'}可信度</span></div>
</article>
