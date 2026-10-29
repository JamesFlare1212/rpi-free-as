export type Verdict = 'no-exams' | 'online' | 'take-home' | 'no-final' | 'project-based' | 'coursework-based' | 'section-dependent' | 'online-final' | 'final-project' | 'scheduled-final' | 'has-exams' | 'conflicting' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';
export type Scope = 'current' | 'historical' | 'undated';
export interface SearchRecord { id:string; courseIds:string[]; kind:string; query:string; checkedAt:string; urls:string[]; outcome:string; }
export interface Evidence {
  id: string;
  courseIds: string[];
  titlePattern: string;
  verdict: Exclude<Verdict, 'unknown'>;
  sourceType: 'syllabus' | 'course-site' | 'handbook' | 'student-report' | 'exam-schedule';
  title: string;
  url: string;
  term: string;
  scope: Scope;
  sourceDate: string | null;
  checkedAt: string;
  verification: 'full-text' | 'search-index';
  instructor: string | null;
  matchInstructor?: string;
  sectionPattern?: string;
  sourceLocator?: string;
  assessmentOnly?: 'final';
  supportingUrls?: string[];
  sourceStatus?: number | null;
  quote: string;
  summary: string;
  caveat: string;
  confidence: Confidence;
  hasQuizzes: boolean;
  sectionCrns?: number[];
  sourceTermCode?: string;
  archivePath?: string;
  archiveSha256?: string;
  examModality?: 'in-person';
}
export type SyllabusState = 'historical-syllabus' | 'empty-syllabus' | 'title-or-program-mismatch' | 'not-in-archive';
export interface SyllabusReference {
  id:number; title:string; section:string; term:string; instructors:string[];
  url:string; path:string; sha256:string; currentCrns:number[];
}
export interface SyllabusNote {
  source:SyllabusReference; quote:string; line:number; summary:string; caveat:string; hasQuizzes:boolean;
}
export interface SyllabusResearch {
  state:SyllabusState; checkedAt:string; archiveDocuments:number; matchedDocuments:number;
  usableDocuments:number; latestTerm:string|null; matchedCurrentCrns:number[];
  references:SyllabusReference[];
  quizSignals:{source:SyllabusReference;quote:string;line:number;reviewed:boolean}[];
  notes:SyllabusNote[];
}
export interface SyllabusCoverage {
  documents:number; terms:number; coursesWithSyllabus:number; coursesWithMatchingDocuments:number;
  states:Record<SyllabusState,number>; checkedAt:string; manualReviewedCourses:number;
}
export interface Timeslot {
  dateStart: string; dateEnd: string; days: string[];
  instructor: string; location: string; timeStart: number; timeEnd: number;
}
export interface Section {
  crn: number; sec: string; title: string; subj: string; crse: number;
  credMin: number; credMax: number; cap: number; act: number; rem: number;
  attribute: string; timeslots: Timeslot[];
}
export interface Course {
  id: string; title: string; subject: string; department: string; school: string;
  description: string; sections: Section[]; instructors: string[];
  creditMin: number; creditMax: number; level: string;
  evidence: Evidence[]; verdict: Verdict; confidence: Confidence | null;
  onlineSections: number; reviewed: boolean;
  research: { state: 'evidence' | 'searched' | 'initial' | 'unsearched'; searchIds: string[]; };
  syllabusResearch: SyllabusResearch;
  sectionAssessments: {crn:number;verdict:Verdict;confidence:Confidence|null}[];
  classificationReview:{checkedAt:string;state:'supported'|'insufficient';reason:string};
}
export interface Dataset {
  meta: { term: string; semester: string; fetchedAt: string; sourceCommit: string;
    sourceUpdatedAt: string; sourceUrl: string; rawUrl: string;
    totalCourses: number; totalSections: number; totalDepartments: number; researchDate: string;
    syllabusArchive:SyllabusCoverage; };
  courses: Course[];
}
