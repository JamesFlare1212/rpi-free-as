<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowUpRight, ArrowRight, ArrowDownToLine, BookOpen, Bookmark, ChevronRight, ChevronLeft, Search, SlidersHorizontal, CircleHelp, Library, Compass, Layers3, CheckCheck, FileSearch, FileText, ExternalLink, Info, X, Link, GraduationCap, Clock3, ShieldCheck, CircleDashed, Check, AlertTriangle } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Field from '$lib/components/ui/field';
  import * as InputGroup from '$lib/components/ui/input-group';
  import * as NativeSelect from '$lib/components/ui/native-select';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import * as Alert from '$lib/components/ui/alert';
  import * as Empty from '$lib/components/ui/empty';
  import { Separator } from '$lib/components/ui/separator';
  import { Skeleton } from '$lib/components/ui/skeleton';
  import { Switch } from '$lib/components/ui/switch';
  import { cn } from '$lib/utils';
  import { candidateVerdicts, exportCsv, filterCourses, verdictLabels } from '$lib/catalog';
  import type { Course, Dataset, Evidence, Verdict, SearchRecord } from '$lib/types';
  import EvidenceCard from '$lib/EvidenceCard.svelte';
  import ThemeToggle from '$lib/ThemeToggle.svelte';
  import exclusions from '../data/excluded.json';
  let searches = $state<SearchRecord[]>([]);
  let searchesLoading = $state(false);
  let searchesAttempted = $state(false);

  let data = $state<Dataset | null>(null);
  let loading = $state(true);
  let error = $state('');
  let view = $state('explore');
  let query = $state('');
  let status = $state('candidates');
  let subject = $state('all');
  let level = $state('all');
  let source = $state('all');
  let program = $state('all');
  let hideQuizzes = $state(false);
  let sort = $state('evidence');
  let page = $state(1);
  let saved = $state<string[]>([]);
  let hydrated = $state(false);
  let detailOpen = $state(false);
  let selectedId = $state('');
  let methodsOpen = $state(false);
  let notice = $state('');
  const pageSize = 20;
  const courses = $derived(data?.courses ?? []);
  const filtered = $derived(filterCourses(courses, { query, status: status || 'all', subject, level, source, program, quizzes: hideQuizzes, savedOnly: view === 'saved', sort }, saved));
  const pages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
  const activePage = $derived(Math.min(page, pages));
  const visible = $derived(filtered.slice((activePage - 1) * pageSize, activePage * pageSize));
  const selected = $derived(courses.find(c => c.id === selectedId));
  const subjects = $derived([...new Set(courses.map(c => c.subject))].sort());
  const allEvidence = $derived([...new Map(courses.flatMap(c => c.evidence).map(e => [e.id,e])).values()]);
  const reviewed = $derived(courses.filter(c => c.reviewed).length);
  const searchedUnknown = $derived(courses.filter(c=>c.research.state==='searched').length);
  const initial = $derived(courses.filter(c=>c.research.state==='initial').length);
  const unsearched = $derived(courses.filter(c=>c.research.state==='unsearched').length);
  const coverage = $derived(subjects.map(code=>{
    const group=courses.filter(c=>c.subject===code);
    return {code,total:group.length,evidence:group.filter(c=>c.reviewed).length,searched:group.filter(c=>c.research.state==='searched').length,initial:group.filter(c=>c.research.state==='initial').length,unsearched:group.filter(c=>c.research.state==='unsearched').length};
  }));
  const selectedSearches = $derived(selected ? searches.filter(q=>selected.research.searchIds.includes(q.id)) : []);
  const noExams = $derived(courses.filter(c => c.verdict === 'no-exams').length);
  const online = $derived(courses.filter(c => c.verdict === 'online' || c.verdict === 'take-home').length);
  const candidates = $derived(courses.filter(c => candidateVerdicts.has(c.verdict)).length);
  const unknown = $derived(courses.filter(c => ['unknown','scheduled-final'].includes(c.verdict)).length);
  const confirmed = $derived(courses.filter(c => c.evidence.some(e => e.scope === 'current' && ['no-exams','online','take-home'].includes(e.verdict))).length);
  const currentMaterials = $derived(courses.filter(c=>c.evidence.some(e=>e.scope==='current')).length);
  const sourceGroups = $derived([
    { label: '大纲 / 课程网站', value: allEvidence.filter(e => ['syllabus','course-site'].includes(e.sourceType)).length, color: 'var(--primary)' },
    { label: '项目手册', value: allEvidence.filter(e => e.sourceType === 'handbook').length, color: 'var(--chart-2)' },
    { label: '学生经验', value: allEvidence.filter(e => e.sourceType === 'student-report').length, color: 'var(--chart-3)' },
    { label: '官方期末表', value: allEvidence.filter(e => e.sourceType === 'exam-schedule').length, color: 'var(--chart-4)' },
  ]);
  const statusOptions = [ ['candidates','候选线索'], ['all','全部课程'], ['no-exams','无考试'], ['online','线上考试'], ['take-home','Take-home'], ['project-based','项目制'], ['online-final','仅线上期末'], ['final-project','仅期末项目'], ['no-final','仅无期末'], ['initial','待深挖'], ['searched','人工未确认'] ];

  async function load() {
    loading = true; error = '';
    try {
      const response = await fetch('/data/courses.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as Dataset;
      if (!Array.isArray(result.courses) || result.meta.semester !== '202701') throw new Error('课程数据格式无效');
      data = result;
    } catch (e) { error = `课程数据加载失败：${e instanceof Error ? e.message : '网络错误'}`; }
    finally { loading = false; }
  }
  async function loadSearches() {
    searchesLoading=true;searchesAttempted=true;
    try {const response=await fetch('/data/searches.json');if(!response.ok)throw new Error();searches=await response.json();}
    catch {notice='检索记录暂未加载成功，可在检索覆盖页下载 JSON 查看。';}
    finally {searchesLoading=false;}
  }
  $effect(()=>{if(detailOpen&&selected?.research.searchIds.length&&!searchesAttempted)void loadSearches();});
  function reset() { query=''; status='candidates'; subject='all'; level='all'; source='all'; program='all'; hideQuizzes=false; sort='evidence'; page=1; }
  function navigate(next: string) { view=next; reset(); if (next === 'all' || next === 'saved') status='all'; }
  function openCourse(c: Course) { selectedId=c.id; detailOpen=true; }
  function toggleSaved(id: string) { saved=saved.includes(id) ? saved.filter(s=>s!==id) : [...saved,id]; }
  function download() {
    const url=URL.createObjectURL(new Blob([exportCsv(filtered)],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download='rpi-spring2027-courses.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notice=`已导出 ${filtered.length} 门课程及来源链接`;
  }
  async function share() {
    try { await navigator.clipboard.writeText(location.href); notice='已复制当前页面链接'; }
    catch { notice='无法自动复制，请从地址栏复制当前链接'; }
  }
  function applyUrl() {
    const p=new URLSearchParams(location.search);
    query=p.get('q')??''; status=p.get('status')??'candidates';subject=p.get('subject')??'all';level=p.get('level')??'all';source=p.get('source')??'all';
    program=p.get('program')??'all';
    view=p.get('view')??'explore';hideQuizzes=p.get('quizzes')==='hide';selectedId=p.get('course')??'';detailOpen=!!selectedId;
  }
  onMount(()=>{
    applyUrl();
    try { const value: unknown=JSON.parse(localStorage.getItem('course-atlas-saved')??'[]'); if(Array.isArray(value)) saved=value.filter((v):v is string=>typeof v==='string'); } catch { /* Storage may be unavailable. */ }
    hydrated=true; void load();
    const keydown=(e:KeyboardEvent)=>{ if(e.key==='/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !detailOpen && !methodsOpen) {e.preventDefault();document.querySelector<HTMLInputElement>('#course-search')?.focus();} };
    window.addEventListener('keydown',keydown);window.addEventListener('popstate',applyUrl);
    return ()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('popstate',applyUrl);};
  });
  $effect(()=>{query;status;subject;level;source;program;hideQuizzes;view;sort;page=1;});
  $effect(()=>{
    if(!hydrated) return;
    try {localStorage.setItem('course-atlas-saved',JSON.stringify(saved));} catch {notice='浏览器存储不可用，收藏仅保留至本次关闭';}
  });
  $effect(()=>{
    if(!hydrated) return;
    const p=new URLSearchParams();
    if(query)p.set('q',query); if(status!=='candidates')p.set('status',status);if(subject!=='all')p.set('subject',subject);if(level!=='all')p.set('level',level);if(source!=='all')p.set('source',source);if(view!=='explore')p.set('view',view);if(hideQuizzes)p.set('quizzes','hide');if(detailOpen && selectedId)p.set('course',selectedId);
    if(program!=='all')p.set('program',program);
    const next=`${location.pathname}${p.size?'?'+p.toString():''}`;
    history.replaceState(null,'',next);
  });
  function credits(c:Course) { return c.creditMin===c.creditMax ? `${c.creditMin}` : `${c.creditMin}–${c.creditMax}`; }
  function typeLabel(e:Evidence) { return e.sourceType==='student-report' ? '学生经验' : e.sourceType==='handbook' ? '项目手册' : e.sourceType==='exam-schedule' ? '官方期末表' : '大纲 / 课程网站'; }
  function time(n:number) { return n<0?'待定':`${Math.floor(n/100).toString().padStart(2,'0')}:${(n%100).toString().padStart(2,'0')}`; }
  const days:Record<string,string>={M:'一',T:'二',W:'三',R:'四',F:'五',S:'六',U:'日'};
</script>

<a class="skip-link" href="#main">跳至课程内容</a>
<div class="app-shell">
  <aside class="sidebar">
    <a class="brand" href="/" aria-label="Course Atlas 首页"><div class="brand-symbol"><BookOpen size={23}/></div><span>course<span class="brand-light">atlas</span><span class="brand-dot">.</span><small>RPI 选课研究室</small></span></a>
    <div class="semester-label"><span class="live-dot"></span>SPRING 2027<span class="term-mark">S27</span></div>
    <div class="nav-label">探索 / EXPLORE</div>
    <nav aria-label="主导航">
      <button class={cn('nav-item',view==='explore' && 'active')} onclick={()=>navigate('explore')}><Compass size={18}/><span>选课线索</span><span class="nav-count">{candidates}</span></button>
      <button class={cn('nav-item',view==='all' && 'active')} onclick={()=>navigate('all')}><Layers3 size={18}/><span>全部课程</span><span class="nav-count">{courses.length.toLocaleString()}</span></button>
      <button class={cn('nav-item',view==='sources' && 'active')} onclick={()=>navigate('sources')}><Library size={18}/><span>证据与来源</span><ArrowUpRight size={15}/></button>
      <button class={cn('nav-item',view==='coverage' && 'active')} onclick={()=>navigate('coverage')}><FileSearch size={18}/><span>检索覆盖</span><span class="nav-count">{reviewed}</span></button>
      <button class={cn('nav-item',view==='saved' && 'active')} onclick={()=>navigate('saved')}><Bookmark size={18}/><span>我的收藏</span><span class="nav-count">{saved.length}</span></button>
    </nav>
    <div class="sidebar-rule"></div>
    <div class="nav-label">关于这份研究</div>
    <button class="nav-item" onclick={()=>methodsOpen=true}><ShieldCheck size={18}/><span>研究方法与边界</span></button>
    <a class="nav-item" href="https://quacs.org/spring2027/#/" target="_blank" rel="noreferrer"><ExternalLink size={17}/><span>前往 QUACS</span><ArrowUpRight size={15}/></a>
    <div class="sidebar-bottom">
      <div class="sidebar-note"><div class="note-icon"><FileSearch size={21}/></div><strong>每条结论，都有来处。</strong><p>从公开大纲到学生经验，<br/>把依据和不确定性一起留下。</p><button onclick={()=>methodsOpen=true}>了解证据分级 <ArrowRight size={14}/></button></div>
      <div class="sidebar-footer"><span class="live-dot"></span>公开数据 · 独立研究 <span>v1.0</span></div>
    </div>
  </aside>

  <div class="workspace">
    <header class="topbar"><div class="breadcrumb"><span>课程研究</span><ChevronRight size={13}/><strong>2027 春季学期</strong></div><div class="topbar-actions"><span class="updated"><span class="live-dot"></span>核查于 2026.10.28</span><ThemeToggle/><Button variant="ghost" size="icon-sm" aria-label="研究方法" onclick={()=>methodsOpen=true}><CircleHelp/></Button><div class="user-mark">R</div></div></header>
    <main id="main">
      <section class="hero">
        <div><div class="eyebrow"><span class="eyebrow-line"></span>LESS GUESSWORK. BETTER CHOICES.</div><h1>选一门课，<br/>从了解考核开始<span class="heading-dot">。</span></h1><p class="hero-description">找找没有考试、线上考试和项目制课程。<br class="mobile-break"/>让每一个选课决定，都有据可依。</p><div class="hero-tags"><span><CheckCheck size={14}/>QUACS 完整课程目录</span><span><Link size={13}/>可追溯的公开来源</span></div></div>
        <div class="semester-art" aria-hidden="true"><div class="art-grid"></div><span class="art-label">RENSSELAER POLYTECHNIC INSTITUTE</span><div class="art-year">20<span>27</span></div><div class="art-bottom"><span>SPRING<br/><strong>COURSE FIELD NOTES</strong></span><div class="art-arrow"><ArrowUpRight size={33}/></div></div><span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span></div>
      </section>

      {#if loading}
        <div class="stat-grid" aria-label="正在加载课程">{#each [1,2,3,4] as n}<Skeleton class="h-32 w-full"/>{/each}</div>
      {:else if error}
        <Alert.Root variant="destructive"><AlertTriangle/><Alert.Title>暂时无法读取课程</Alert.Title><Alert.Description>{error} <Button variant="outline" onclick={load}>重试</Button></Alert.Description></Alert.Root>
      {:else}
        <div class="stat-grid">
          <Card.Root class="stat-card"><Card.Header><Card.Description>收录课程</Card.Description><Layers3 size={18}/><Card.Title>{courses.length.toLocaleString()}<small>门</small></Card.Title></Card.Header><Card.Content>{data?.meta.totalDepartments} 个学科 · {data?.meta.totalSections.toLocaleString()} 个班次</Card.Content><Card.Footer><span class="stat-dot"></span>本学期完整快照</Card.Footer></Card.Root>
          <Card.Root class="stat-card"><Card.Header><Card.Description>无考试线索</Card.Description><CheckCheck size={18}/><Card.Title>{noExams}<small>门</small></Card.Title></Card.Header><Card.Content>含仅限在职 H 班的通用政策</Card.Content><Card.Footer><span class="stat-dot green"></span>本学期已确认 {confirmed} 门</Card.Footer></Card.Root>
          <Card.Root class="stat-card"><Card.Header><Card.Description>线上 / Take-home</Card.Description><GraduationCap size={18}/><Card.Title>{online}<small>门</small></Card.Title></Card.Header><Card.Content>线上与带回家考试分别标注</Card.Content><Card.Footer><span class="stat-dot blue"></span>均需核对新学期大纲</Card.Footer></Card.Root>
          <Card.Root class="stat-card"><Card.Header><Card.Description>考试形式未明</Card.Description><CircleDashed size={18}/><Card.Title>{unknown}<small>门</small></Card.Title></Card.Header><Card.Content>含只有历史排期、形式待定的课</Card.Content><Card.Footer><span class="stat-dot amber"></span>未知不等于没有考试</Card.Footer></Card.Root>
        </div>

        <div class="research-notice"><Info size={16}/><p><strong>先看依据，再作决定。</strong>目前没有课程获得 Spring 2027 免考确认。往年政策、教师更换及随堂测验可能影响实际考核。</p><button onclick={()=>methodsOpen=true}>研究说明 <ArrowUpRight size={14}/></button></div>

        {#if view==='coverage'}
          <section class="coverage-section">
            <div class="section-heading"><div><span class="section-kicker">RESEARCH COVERAGE</span><h2>还有哪些课需要继续查？</h2></div><Button variant="outline" href="/data/searches.json" download><ArrowDownToLine data-icon="inline-start"/>下载检索记录</Button></div>
            <p class="coverage-intro">{reviewed} 门已有可归属资料，{searchedUnknown} 门人工检索后仍未确认，{initial} 门仅完成初步公开搜索，{unsearched} 门尚待查询。初步查询按课号与课名生成后批量执行，联合结果尚未逐项核实，不能算深度覆盖。官方期末表也只记录历史期末安排。</p>
            <div class="coverage-summary" role="img" aria-label={`有依据 ${reviewed} 门，人工核查未确认 ${searchedUnknown} 门，仅初步搜索 ${initial} 门，尚待查询 ${unsearched} 门`}>
              <div style:width={`${reviewed/courses.length*100}%`} class="coverage-evidence"></div><div style:width={`${searchedUnknown/courses.length*100}%`} class="coverage-searched"></div><div style:width={`${initial/courses.length*100}%`} class="coverage-initial"></div><div style:width={`${unsearched/courses.length*100}%`} class="coverage-pending"></div>
            </div>
            <div class="coverage-legend"><span>● 有可归属资料 {reviewed}</span><span>● 人工核查未确认 {searchedUnknown}</span><span>● 仅初步搜索 {initial}</span><span>● 尚待查询 {unsearched}</span></div>
            <div class="course-table-wrap"><table class="course-table coverage-table"><thead><tr><th>学科</th><th>开课数</th><th>有资料</th><th>人工未确认</th><th>仅初步搜索</th></tr></thead><tbody>{#each coverage as item}<tr><td><button onclick={()=>{navigate('all');subject=item.code;}}>{item.code} <ArrowUpRight size={12}/></button></td><td>{item.total}</td><td>{item.evidence}</td><td>{item.searched}</td><td>{item.initial}</td></tr>{/each}</tbody></table></div>
          </section>
        {:else if view==='sources'}
          <section class="source-library"><div class="section-heading"><div><span class="section-kicker">THE EVIDENCE LIBRARY</span><h2>证据与来源<span>{allEvidence.length} 条</span></h2></div><Button variant="outline" href="/data/evidence.json" download><ArrowDownToLine data-icon="inline-start"/>下载证据 JSON</Button></div>
            <div class="evidence-overview"><div><h3>来源构成</h3><p>记录条数，不代表本学期适用比例</p></div><div class="source-chart" role="img" aria-label={sourceGroups.map(g=>`${g.label} ${g.value}条`).join('，')}>{#each sourceGroups as g}<div class="source-chart-row"><span>{g.label}</span><div class="source-chart-track"><div style:width={`${g.value / Math.max(1,allEvidence.length)*100}%`} style:background={g.color}></div></div><strong>{g.value}</strong></div>{/each}</div></div>
            <div class="source-grid">{#each allEvidence as evidence (evidence.id)}<EvidenceCard {evidence}/>{/each}</div>
            <div class="excluded-heading"><span class="section-kicker">ALSO CHECKED, NOT INCLUDED</span><h2>为什么这些课程没被收进来？</h2><p>保留不匹配和过期线索，避免课号复用、未开课和教师差异造成误判。</p></div>
            <div class="exclusion-list">{#each exclusions as item}<article><a href={item.url} target="_blank" rel="noreferrer">{item.course}<ExternalLink size={14}/></a><p>{item.finding}</p><div><X size={14}/>{item.reason}</div></article>{/each}</div>
          </section>
        {:else}
          <section class="course-browser" aria-label="课程浏览器">
            <div class="section-heading"><div><span class="section-kicker">YOUR NEXT SEMESTER, WITH CONTEXT</span><h2>{view==='saved'?'我的收藏':view==='all'?'完整课程目录':'发现课程'}<span>{view==='saved'?saved.length:filtered.length} 门</span></h2></div><Button variant="outline" onclick={download} disabled={filtered.length===0}><ArrowDownToLine data-icon="inline-start"/>导出结果</Button></div>
            <div class="filters-panel">
              <Field.Group class="filter-fields">
                <Field.Field class="search-field"><Field.Label for="course-search" class="sr-only">搜索课程、课号或教师</Field.Label><InputGroup.Root><InputGroup.Input id="course-search" bind:value={query} placeholder="搜索课程名称、课号或教师…"/><InputGroup.Addon><Search/></InputGroup.Addon><InputGroup.Addon align="inline-end">{#if query}<InputGroup.Button size="icon-xs" aria-label="清除搜索" onclick={()=>query=''}><X/></InputGroup.Button>{:else}<kbd>/</kbd>{/if}</InputGroup.Addon></InputGroup.Root></Field.Field>
                <Field.Field><Field.Label for="subject" class="sr-only">学科</Field.Label><NativeSelect.Root id="subject" bind:value={subject}><NativeSelect.Option value="all">全部学科</NativeSelect.Option>{#each subjects as code}<NativeSelect.Option value={code}>{code}</NativeSelect.Option>{/each}</NativeSelect.Root></Field.Field>
                <Field.Field><Field.Label for="level" class="sr-only">课程层级</Field.Label><NativeSelect.Root id="level" bind:value={level}><NativeSelect.Option value="all">全部层级</NativeSelect.Option><NativeSelect.Option value="undergraduate">本科课程</NativeSelect.Option><NativeSelect.Option value="graduate">研究生课程</NativeSelect.Option></NativeSelect.Root></Field.Field>
                <Field.Field><Field.Label for="source" class="sr-only">来源类型</Field.Label><NativeSelect.Root id="source" bind:value={source}><NativeSelect.Option value="all">全部来源</NativeSelect.Option><NativeSelect.Option value="official">大纲 / 官方网站</NativeSelect.Option><NativeSelect.Option value="student">学生经验</NativeSelect.Option></NativeSelect.Root></Field.Field>
                <Field.Field><Field.Label for="program" class="sr-only">班次范围</Field.Label><NativeSelect.Root id="program" bind:value={program}><NativeSelect.Option value="all">全部班次范围</NativeSelect.Option><NativeSelect.Option value="campus">校内班可参考</NativeSelect.Option><NativeSelect.Option value="atwork">仅在职 H 班</NativeSelect.Option></NativeSelect.Root></Field.Field>
              </Field.Group>
              <div class="filter-bottom"><div class="filter-tabs"><ToggleGroup.Root type="single" bind:value={status} aria-label="按考核形式筛选">{#each statusOptions as [value,label]}<ToggleGroup.Item {value}>{label}</ToggleGroup.Item>{/each}</ToggleGroup.Root></div><Field.Field orientation="horizontal" class="quiz-filter"><Switch id="quizzes" bind:checked={hideQuizzes} size="sm"/><Field.Label for="quizzes">排除已知测验</Field.Label></Field.Field></div>
            </div>
            <div class="result-meta"><span aria-live="polite">共 <strong>{filtered.length}</strong> 门{view==='saved'?'已收藏':''}课程 <span class="meta-divider">/</span> {status==='candidates'?'含全课线索及仅期末远程 / 项目线索':status==='all'?'完整保留未知与反面证据':verdictLabels[status as Verdict]??'全部课程'}</span><div><label for="sort"><SlidersHorizontal size={13}/>排序</label><NativeSelect.Root id="sort" bind:value={sort} size="sm"><NativeSelect.Option value="evidence">按考试形式</NativeSelect.Option><NativeSelect.Option value="code">按课程编号</NativeSelect.Option><NativeSelect.Option value="credits">按学分</NativeSelect.Option></NativeSelect.Root></div></div>
            {#if visible.length===0}
              <Empty.Root><Empty.Header><Empty.Media variant="icon"><Search/></Empty.Media><Empty.Title>{view==='saved'&&saved.length===0?'把感兴趣的课程留下来':'没有匹配的课程'}</Empty.Title><Empty.Description>{view==='saved'&&saved.length===0?'点击课程旁的书签，即可在这里找到它。收藏保存在当前浏览器。':'试试其他关键词，或放宽学科与考核形式筛选。'}</Empty.Description></Empty.Header><Empty.Content><Button variant="outline" onclick={()=>{reset();if(view==='saved'&&saved.length===0)navigate('explore');}}>返回候选线索</Button></Empty.Content></Empty.Root>
            {:else}
              <div class="course-table-wrap"><table class="course-table"><thead><tr><th class="bookmark-column"><Bookmark size={13}/><span class="sr-only">收藏</span></th><th>课程 / COURSE</th><th class="credit-column">学分</th><th>考核形式</th><th class="source-column">依据与适用范围</th><th><span class="sr-only">查看详情</span></th></tr></thead><tbody>{#each visible as course (course.id)}
                <tr><td><Button variant="ghost" size="icon-sm" aria-label={`${saved.includes(course.id)?'取消收藏':'收藏'} ${course.id}`} aria-pressed={saved.includes(course.id)} onclick={()=>toggleSaved(course.id)}>{#if saved.includes(course.id)}<Bookmark fill="currentColor"/>{:else}<Bookmark/>{/if}</Button></td>
                  <td><button class="course-title-button" onclick={()=>openCourse(course)}><span class="course-code">{course.id}<span>{course.level==='graduate'?'GRAD':'UG'}</span></span><strong>{course.title}</strong><span class="course-instructor">{course.instructors.length?course.instructors.join(' / '):'教师待定'}<span>· {course.sections.length} 个班次</span></span></button></td>
                  <td class="credit-column"><span class="credits-number">{credits(course)}</span><small>credits</small></td>
                  <td><div class="verdict" data-verdict={course.verdict}><Badge variant="secondary"><span class="badge-dot"></span>{verdictLabels[course.verdict]}</Badge></div><span class="assessment-note">{course.evidence.some(e=>e.sectionPattern==='^H')?'仅在职 H 班 · 核对准入资格':course.evidence.some(e=>e.hasQuizzes)?'含测验 · 请查看详情':course.verdict==='unknown'?(course.research.state==='searched'?'人工检索 · 未确认':course.research.state==='initial'?'仅初步搜索 · 待深入核查':'尚待逐门查询'):course.verdict==='conflicting'?'新旧政策不一致':'需核对 Spring 2027 大纲'}</span></td>
                  <td class="source-column">{#if course.evidence.length}<div class="table-source"><FileText size={13}/>{course.evidence.length} 条公开依据</div><span class="scope-note">{course.evidence.some(e=>e.scope==='current')?'本学期说明':course.evidence.some(e=>e.scope==='historical')?'历史学期':'未标明学期'}<span>·</span>{typeLabel(course.evidence[0])}</span>{:else}<span class="scope-note">{course.research.searchIds.length?'已保留查询记录':'待进一步检索'}</span>{/if}</td>
                  <td><Button variant="ghost" size="icon-sm" aria-label={`查看 ${course.id} 依据`} onclick={()=>openCourse(course)}><ArrowUpRight/></Button></td></tr>
              {/each}</tbody></table></div>
              <div class="pagination"><span>显示 {(activePage-1)*pageSize+1}–{Math.min(activePage*pageSize,filtered.length)} / {filtered.length} 门课程</span><div><Button variant="outline" size="icon-sm" aria-label="上一页" disabled={activePage===1} onclick={()=>page=activePage-1}><ChevronLeft/></Button><span>第 {activePage} / {pages} 页</span><Button variant="outline" size="icon-sm" aria-label="下一页" disabled={activePage>=pages} onclick={()=>page=activePage+1}><ChevronRight/></Button></div></div>
            {/if}
          </section>
        {/if}
        <footer class="main-footer"><span>COURSE ATLAS <span>独立选课研究 · 与 RPI / QUACS 无隶属关系</span></span><button onclick={()=>navigate('sources')}>{reviewed} 门附有依据 / {courses.length} 门已收录 <ArrowUpRight size={13}/></button></footer>
      {/if}
    </main>
  </div>
</div>

{#if notice}<div class="notice" role="status"><Check size={16}/>{notice}<button onclick={()=>notice=''} aria-label="关闭提示"><X size={14}/></button></div>{/if}

<Sheet.Root bind:open={detailOpen}>
  <Sheet.Content class="course-detail w-full sm:max-w-2xl">
    <Sheet.Header><div class="detail-eyebrow">COURSE FIELD NOTES <span>SPRING 2027</span></div><Sheet.Title>{selected?.id??'课程未找到'}</Sheet.Title><Sheet.Description>{selected?.title??'当前快照没有此课号，请检查链接。'}</Sheet.Description></Sheet.Header>
    {#if selected}
      <div class="detail-scroll">
        <div class="detail-summary"><div class="verdict" data-verdict={selected.verdict}><Badge variant="secondary">{verdictLabels[selected.verdict]}</Badge></div><span>{credits(selected)} 学分 · {selected.level==='graduate'?'研究生':'本科'}</span><Button variant="outline" size="sm" onclick={()=>toggleSaved(selected.id)}><Bookmark data-icon="inline-start" fill={saved.includes(selected.id)?'currentColor':'none'}/>{saved.includes(selected.id)?'已收藏':'收藏课程'}</Button></div>
        <Alert.Root><Info/><Alert.Title>{selected.evidence.length?'证据适用范围':'考试形式尚未确认'}</Alert.Title><Alert.Description>{selected.evidence.length?'以下材料尚不能确认本学期免考或线上考试。即使是本学期项目说明，也需核对其是否提供完整评分与测验要求。':'已完整收录该课，但没有找到可归属的考试形式依据。课表上没有考试时间、上课地点为 Online 或课程名称含项目，都不能证明免考。'}</Alert.Description></Alert.Root>
        {#if selected.description}<details class="description-details"><summary>课程简介 <ChevronRight size={14}/></summary><p>{selected.description}</p></details>{/if}
        <div class="detail-section-title"><h3>考核证据</h3><span>{selected.evidence.length} 条记录</span></div>
        {#each selected.evidence as evidence (evidence.id)}<EvidenceCard {evidence}/>{/each}
        {#if !selected.evidence.length}<div class="no-evidence"><FileSearch size={27}/><p>暂未发现可归属的公开证据</p><a href={`https://www.google.com/search?q=${encodeURIComponent('RPI '+selected.id+' '+selected.title+' syllabus exams')}`} target="_blank" rel="noreferrer">继续检索课程大纲 <ArrowUpRight size={14}/></a></div>{/if}
        {#if selectedSearches.length}<details class="description-details"><summary>查看已执行的检索（{selectedSearches.length} 条）<ChevronRight size={14}/></summary>{#each selectedSearches as search}<div class="search-log-item"><small>{search.checkedAt}</small><p>{search.query}</p><p>{search.outcome}</p></div>{/each}</details>{/if}
        {#if searchesLoading}<p class="online-note">正在载入查询记录…</p>{/if}
        <Separator/>
        <div class="detail-section-title"><h3>本学期班次</h3><span>QUACS · {selected.sections.length} 个</span></div>
        {#if selected.onlineSections}<p class="online-note"><Info size={14}/>{selected.onlineSections} 个班次的上课地点含 Online / Remote。这是授课地点，不代表考试在线。</p>{/if}
        <div class="section-list">{#each selected.sections as section}<details><summary><span><strong>{section.sec}</strong><span>CRN {section.crn}</span></span><ChevronRight size={15}/></summary><div class="section-content"><strong>{section.title}</strong>{#each section.timeslots as slot}<div><p>{slot.instructor}</p><p>{slot.days.length?'周'+slot.days.map(d=>days[d]??d).join('、'):'时间待定'} · {time(slot.timeStart)}–{time(slot.timeEnd)} · {slot.location}</p></div>{/each}<div class="section-capacity">名额快照：{section.act} / {section.cap} · 余量 {section.rem} · {section.credMin}{section.credMax!==section.credMin?'–'+section.credMax:''} 学分</div>{#if selected.evidence.length}<div class="section-evidence">适用线索：{selected.evidence.filter(e=>e.sectionCrns?.includes(section.crn)).map(e=>e.title).join('；')||'此班次没有匹配依据'}</div>{/if}</div></details>{/each}</div>
        <div class="detail-provenance"><Clock3 size={13}/>课表快照 {data?.meta.fetchedAt.slice(0,10)} · 名额会变化<br/>来源提交 {data?.meta.sourceCommit.slice(0,12)}</div>
      </div>
      <Sheet.Footer><Button onclick={share} variant="outline"><Link data-icon="inline-start"/>复制课程链接</Button><Button href="https://quacs.org/spring2027/#/" target="_blank" rel="noreferrer">在 QUACS 搜索课号 <ArrowUpRight data-icon="inline-end"/></Button></Sheet.Footer>
    {/if}
  </Sheet.Content>
</Sheet.Root>

<Dialog.Root bind:open={methodsOpen}>
  <Dialog.Content class="methods-dialog sm:max-w-2xl"><Dialog.Header><div class="section-kicker">HOW WE RESEARCH</div><Dialog.Title>依据透明，选择才有底气。</Dialog.Title><Dialog.Description>全量课程目录与考试证据，是两种不同的覆盖范围。</Dialog.Description></Dialog.Header><div class="methods-scroll">
    <div class="method-step"><span>01</span><div><h3>先确认本学期开课</h3><p>从 QUACS 数据仓库的 <code>202701/courses.json</code> 获取全部 {courses.length} 门课程及 {data?.meta.totalSections} 个班次。课程目录 catalog.json 仅用于简介，不将历史目录当成本学期开课表。</p></div></div>
    <div class="method-step"><span>02</span><div><h3>优先找大纲，再参考经验</h3><p>检索官方课程页、教师主页、公开大纲、建筑学院认证报告、教务处期末表、RPI at Work、RCOS、r/RPI 及 Rate My Professors。已归属 {allEvidence.length} 条记录、涉及 {reviewed} 门课。RMP 只采用明确的考核描述，核对学校、教师、课程与评论日期；评分高低不证明免考。</p></div></div>
    <div class="method-step"><span>03</span><div><h3>严格保留学期与班次边界</h3><p>同一课号可能用于不同专题。证据同时核对课名、教师、学期；Greene 的线上线索只匹配她的班次。当前 {currentMaterials} 门有本学期项目说明，但 {confirmed} 门确认无考试、线上或 take-home 考试。所有候选均需核对完整大纲。</p></div></div>
    <div class="method-step"><span>04</span><div><h3>把不同的考核方式分开</h3><p>无考试、仅无期末、项目制、take-home 和线上考试分别显示。Take-home 不一定在线；项目制可能有测验；线上上课和网上交卷本身不能证明远程考试。出现冲突时完整保留双方，较新的正式大纲优先。</p></div></div>
    <div class="method-step"><span>05</span><div><h3>让“不知道”保持可见</h3><p>{searchedUnknown} 门人工核查后未确认，{initial} 门仅完成按课号的初步查询，{unsearched} 门尚待查询。初步搜索的联合结果未逐项验证，仍需深挖。期末项目不排除期中考试；REMOTE 仅说明历史期末远程。H 班通用政策不适用于校内同课号班次。</p></div></div>
    <div class="method-links"><a href={data?.meta.rawUrl??'https://github.com/quacs/quacs-data'} target="_blank" rel="noreferrer">原始课程快照 <ExternalLink size={13}/></a><a href="/data/evidence.json" download>下载全部证据 <ArrowDownToLine size={13}/></a><a href="/data/courses.json" download>下载全量 JSON <ArrowDownToLine size={13}/></a></div>
    <p class="method-footnote">数据核查：2026-10-28。Spring 2027 尚未开始，已检索的公开来源中未发现可确认本学期考试政策的大纲。选课前请通过教师或正式课程大纲核实。</p>
  </div></Dialog.Content>
</Dialog.Root>
