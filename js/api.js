// Centralized API layer. Talks to the PHP + MySQL backend running on XAMPP.
// Pages live in the project root, so this path is relative to them.
const API_BASE_URL = "api/index.php";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin", // sends the PHP session cookie
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

// UI session (remembers who is logged in so pages can redirect).
// The real protection is the PHP session on the server.
const Session = {
  get: () => JSON.parse(sessionStorage.getItem("session") || "null"),
  set: (s) => sessionStorage.setItem("session", JSON.stringify(s)),
  clear: () => sessionStorage.removeItem("session"),
};

// ---- Auth ----
const loginStudent = ({ identifier, password }) =>
  request("/auth/student/login", { method: "POST", body: { identifier, password } });
const loginAdmin = ({ username, password }) =>
  request("/auth/admin/login", { method: "POST", body: { username, password } });
async function logout() {
  try { await request("/auth/logout", { method: "POST" }); } catch (e) { /* ignore */ }
  Session.clear();
}

// ---- Photo upload (separate from request(): files are sent as FormData, not JSON) ----
async function uploadPhoto(studentId, file) {
  const form = new FormData();
  form.append("studentId", studentId);
  form.append("photo", file);
  const res = await fetch("api/upload_photo.php", { method: "POST", credentials: "same-origin", body: form });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Upload failed (${res.status})`);
  return data;
}

async function removePhoto(studentId) {
  const res = await fetch(`api/upload_photo.php?studentId=${encodeURIComponent(studentId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

// ---- Students ----
const getStudent = (id) => request(`/students/${encodeURIComponent(id)}`);
const getStudents = () => request("/students");
const createStudent = (data) => request("/students", { method: "POST", body: data });
const updateStudent = (id, data) => request(`/students/${encodeURIComponent(id)}`, { method: "PUT", body: data });
const deleteStudent = (id) => request(`/students/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---- Grades ----
const getGrades = (studentId) => request(`/students/${encodeURIComponent(studentId)}/grades`);
const getAdminGrades = () => request("/grades");
const createGrade = (data) => request("/grades", { method: "POST", body: data });
const updateGrade = (id, data) => request(`/grades/${id}`, { method: "PUT", body: data });
const deleteGrade = (id) => request(`/grades/${id}`, { method: "DELETE" });

// ---- Portal content ----
const getCourses = () => request("/courses");
const getSchedule = () => request("/schedule");
const getAnnouncements = () => request("/announcements");
const getActivity = () => request("/activity");
