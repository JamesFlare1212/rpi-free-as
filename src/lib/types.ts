export type Verdict = 'no-exams' | 'online' | 'take-home' | 'no-final' | 'project-based' | 'has-exams' | 'conflicting' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';
export type Scope = 'current' | 'historical' | 'undated';
export interface Evidence {
  id: string;
  courseIds: string[];
  titlePattern: string;
  verdict: Exclude<Verdict, 'unknown'>;
  sourceType: 'syllabus' | 'course-site' | 'handbook' | 'student-report';
  title: string;
  url: string;
  term: string;
  scope: Scope;
  sourceDate: string | null;
  checkedAt: string;
  verification: 'full-text' | 'search-index';
  instructor: string | null;
  matchInstructor?: string;
  supportingUrls?: string[];
  sourceStatus?: number | null;
  quote: string;
  summary: string;
  caveat: string;
  confidence: Confidence;
  hasQuizzes: boolean;
  sectionCrns?: number[];
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
}
export interface Dataset {
  meta: { term: string; semester: string; fetchedAt: string; sourceCommit: string;
    sourceUpdatedAt: string; sourceUrl: string; rawUrl: string;
    totalCourses: number; totalSections: number; totalDepartments: number; researchDate: string; };
  courses: Course[];
}
