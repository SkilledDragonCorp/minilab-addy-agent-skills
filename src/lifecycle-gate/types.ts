export type HeadingLevel = 2 | 3;

export interface SkillHeading {
  level: HeadingLevel;
  title: string;
  line: number;
  /** Checklist lines (`- [ ] …`) directly under this heading (not inside fenced blocks). */
  checklistItems: string[];
}

export interface DiffSignals {
  files: string[];
  documentationOnly: boolean;
  touchesSource: boolean;
  touchesTests: boolean;
  touchesDependencies: boolean;
  touchesSecuritySensitive: boolean;
  addedLines: number;
}

export interface ChecklistEntry {
  text: string;
  citeHeading: string;
  citeLine: number;
  reason: string;
}

export interface LifecycleGateResult {
  skillName: string;
  diffSummary: string;
  entries: ChecklistEntry[];
}
