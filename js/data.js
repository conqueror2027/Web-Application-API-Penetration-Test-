// Constants and helper functions only. All real data now comes from the database.
const PASS_MARK = 60;
const departments = ["Cybersecurity", "Computer Science", "Information Systems"];
const levels = ["Level 1", "Level 2", "Level 3", "Level 4"];
const semesters = ["Fall 2025", "Spring 2026"];

const statusOf = (grade) => (grade >= PASS_MARK ? "Passed" : "Failed");
const letterOf = (g) => (g >= 90 ? "A" : g >= 80 ? "B" : g >= 70 ? "C" : g >= 60 ? "D" : "F");
// GPA on a 4.0 scale from percentage grades
const gpaOf = (grades) =>
  grades.length ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length / 25).toFixed(2) : "0.00";
const creditsOf = (grades) =>
  grades.filter((g) => g.grade >= PASS_MARK).reduce((sum, g) => sum + (g.credits ?? 3), 0);
