// Mirrors the server's MIN_CAREER_GRADE (server/src/services/careerService.ts) —
// the server enforces it on its own; this only decides what the UI shows.
export const MIN_CAREER_GRADE = 8;
export const MIN_GRADE = 1;
export const MAX_GRADE = 11;
export const ALL_GRADES = Array.from({ length: MAX_GRADE - MIN_GRADE + 1 }, (_, i) => i + MIN_GRADE);
