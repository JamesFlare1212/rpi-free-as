export function normalizeTitle(title:string):string {
 return title.normalize('NFKD').toUpperCase().replace(/&/g,' AND ').replace(/\b(?:AND|THE)\b/g,' ').replace(/[^A-Z0-9]/g,'');
}
export type FindingKind='exam-weight'|'quiz-weight'|'project-weight'|'no-exams'|'no-final'|'take-home'|'online-exams'|'in-person-exams'|'quizzes';
export interface Finding {kind:FindingKind;line:number;heading:string;quote:string;weight?:number;}
export interface ArchiveRow {id:number;courseId:string;title:string;section:string;subject:string;termCode:string;term:string;instructors:string[];path:string;url:string;canonicalUrl:string;sha256:string;bytes:number;htmlSha256:string;hasSyllabus:boolean;formattingReview:boolean;}
const clean=(text:string)=>text.replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<[^>]*>/g,' ').replace(/[*_`~]/g,'').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const short=(text:string)=>text.split(/\s+/).slice(0,22).join(' ');
const grading=/grad|criteria|assess|evaluat|exam|test|quiz|course requirements|course structure|course policies|assignments|components/i;
const institutional=/academic integrity|disabilit|accommodat|wellness|mental health|sexual|harassment|support services|religious|title ix|institute polic/i;

export function extractFindings(markdown:string):Finding[]{
 const lines=markdown.split('\n');
 let inFrontmatter=lines[0]==='---',heading='',institution=false;
 const findings:Finding[]=[];
 const add=(kind:FindingKind,index:number,text:string,weight?:number)=>{
  const quote=short(clean(text));
  if(quote&&!findings.some(f=>f.kind===kind&&f.quote===quote))findings.push({kind,line:index+1,heading,quote,...(weight!==undefined?{weight}:{})});
 };
 for(let index=1;index<lines.length;index++){
  if(inFrontmatter){if(lines[index]==='---')inFrontmatter=false;continue;}
  const raw=lines[index],line=clean(raw);
  if(!line)continue;
  if(/^#{1,6}\s/.test(raw)){heading=clean(raw.replace(/^#+\s*/,''));institution=institutional.test(heading);}
  if(institution)continue;
  const lower=line.toLowerCase();
  const noExams=/(?:there (?:are|will be)|(?:this|the) (?:course|class) (?:has|will have))\s+no\s+(?:exams|examinations|tests)(?:\s+(?:or|and)\s+(?:tests|exams|quizzes))?(?:\s*[.;!]|\s+(?:in|for)\s+(?:this|the)\s+(?:course|class))/i.exec(line)
   ?? /^(?:[-•]\s*)?(?:exams?|examinations?|tests?)\s*[:—-]\s*(?:there (?:are|will be)\s+)?no\s+(?:exams?|tests?)\b/i.exec(line);
  if(noExams&&!/if\b.{0,35}no\s+(?:exams|tests)|no\s+(?:exams|tests).{0,20}(?:scheduled|makeup|make-up|in person|in-person|in class|on campus)/i.test(line))add('no-exams',index,noExams[0]);
  const noFinal=/(?:there\s+(?:is|will be)\s+no\s+final\s+(?:exam(?:ination)?|test)|no\s+final\s+(?:exam(?:ination)?|test)\s+(?:will be|is)\s+(?:given|held|administered|required)|(?:do(?:es)?\s+not|will\s+not)\s+(?:have|give|hold)\s+(?:a\s+)?final\s+exam)/i.exec(line);
  if(noFinal)add('no-final',index,noFinal[0]);
  const takeHome=/\b(?:take[ -]?home)\s+(?:(?:midterm|final)\s+)?(?:exams?|tests?)\b|\b(?:exams?|tests?)\s+(?:will be |are |as )?(?:take[ -]?home)\b/i.exec(line);
  if(takeHome&&!/\b(?:if|in the case|might|may be|likely|tentatively|practice|sample)\b/i.test(line))add('take-home',index,takeHome[0]);
  const online=/\b(?:all\s+(?:(?:the|course)\s+)?(?:exams|tests|examinations)|(?:the\s+)?exams|examinations)\s+(?:will\s+be|are)\s+(?:done|given|taken|held|administered|conducted)?\s*(?:online|remotely|remote)\b/i.exec(line);
  if(online&&!/\b(?:if|in the event|in the case|not|instead|closure)\b/i.test(line))add('online-exams',index,online[0]);
  if(/\b(?:exams|tests|midterms?)\b.{0,50}\b(?:in[ -]person|in[ -]class)\b/i.test(line)&&!/\bno\b.{0,20}\b(?:exams|tests)|\bnot\b.{0,20}\b(?:in[ -]person|in[ -]class)/i.test(line))add('in-person-exams',index,line);
  const inAssessment=grading.test(heading);
  const percent=/(?:^|\|)\s*[^|]{0,120}?\b(exams?|midterms?|tests?|examinations?|quizz?es?|projects?|papers?|presentations?|portfolios?)\b[^|]{0,60}?\|\s*(\d{1,3}(?:\.\d+)?)\s*%/ig;
  if(inAssessment){
   for(const match of line.matchAll(percent)){
    const amount=Number(match[2]);if(amount<=0||amount>100)continue;
    const statement=match[0].replace(/^\|/,'').trim();
    if(/\b(?:no|not|optional|bonus|extra credit|practice|sample)\b/i.test(statement)||(/midterm/i.test(match[1])&&/presentation|project|marginalia|sketchbook|portfolio/i.test(statement)))continue;
    add(/^quiz/i.test(match[1])?'quiz-weight':/project|paper|presentation|portfolio/i.test(match[1])?'project-weight':'exam-weight',index,statement,amount);
   }
   const inline=/\b(exams?|midterms?|tests?|examinations?|quizz?es?)\b.{0,55}?(\d{1,3}(?:\.\d+)?)\s*%/ig;
   for(const match of line.matchAll(inline)){
    const amount=Number(match[2]);if(amount<=0||amount>100)continue;
    const before=line.slice(Math.max(0,match.index!-25),match.index);
    if(/\b(?:no|not|practice|sample|make[ -]?up)\b/i.test(before)||/\b(?:no|not|optional|bonus|extra credit|practice|sample)\b/i.test(match[0])||(/midterm/i.test(match[1])&&/presentation|project|marginalia|sketchbook|portfolio/i.test(match[0])))continue;
    add(/^quiz/i.test(match[1])?'quiz-weight':'exam-weight',index,match[0],amount);
   }
  }
  if((inAssessment||/^quizz?es?\b/i.test(line))&&/\b(?:weekly|daily|regular|in-class|online)\s+quizz?es?\b|\bquizz?es?\s+(?:will be|are|count|contribute|account for)\b/i.test(line)&&!/\b(?:no|not)\s+(?:\w+\s+){0,2}quizz?es?\b|no\s+make[ -]?up\s+quizz?es?/i.test(line))add('quizzes',index,line);
 }
 return findings;
}

export function matchSections(row:ArchiveRow,sections:{title:string;sec:string;crn:number}[],aliases: {courseId:string;archiveTitle:string;currentTitle:string;reason:string}[]=[]):{crns:number[];kind:'normalized-title'|'reviewed-alias'|null}{
 const exact=sections.filter(s=>normalizeTitle(row.title)===normalizeTitle(s.title)&&/^H/i.test(row.section)===/^H/i.test(s.sec));
 if(exact.length)return {crns:exact.map(s=>s.crn),kind:'normalized-title'};
 const alias=sections.filter(s=>aliases.some(a=>a.courseId===row.courseId&&a.archiveTitle===row.title&&a.currentTitle===s.title)&&/^H/i.test(row.section)===/^H/i.test(s.sec));
 return {crns:alias.map(s=>s.crn),kind:alias.length?'reviewed-alias':null};
}
