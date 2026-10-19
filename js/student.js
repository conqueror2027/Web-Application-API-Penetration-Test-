const PROFILE_FIELDS = [
  { name: "name", label: "Full Name", validate: (v) => (v.length >= 3 ? "" : "Name is too short") },
  { name: "email", label: "Email", type: "email", validate: validEmail },
  { name: "phone", label: "Phone", validate: (v) => (/^[\d\s+()-]{7,}$/.test(v) ? "" : "Enter a valid phone number") },
  { name: "address", label: "Address" },
];
const GRADE_COLUMNS = [
  { label: "Course", key: "subject" },
  { label: "Course Code", render: (g) => esc(g.code ?? "-") },
  { label: "Credits", render: (g) => esc(g.credits ?? "-") },
  { label: "Grade", render: (g) => `<strong>${letterOf(g.grade)}</strong>` },
  { label: "Percentage", render: (g) => `${g.grade}%` },
  { label: "Semester", render: (g) => esc(g.semester ?? "-") },
  { label: "Status", render: (g) => gradeBadge(g.grade) },
];

pages["student-dashboard"] = async () => {
  const id = sessionId();
  const [student, grades, classes, news] = await Promise.all([getStudent(id), getGrades(id), getSchedule(), getAnnouncements()]);
  $("#content").innerHTML = `
    <div class="welcome"><h1>Welcome back, ${esc(student?.name.split(" ")[0] ?? "Student")}</h1>
      <p>${esc(student?.name)} · ${esc(id)} · ${esc(student?.department)}</p></div>
    ${grid([
      card({ icon: "grades", title: "GPA", value: gpaOf(grades) }),
      card({ icon: "book", title: "Total Courses", value: grades.length }),
      card({ icon: "cap", title: "Completed Credits", value: creditsOf(grades) }),
    ])}
    <div class="hero-actions">
      <a class="btn" href="student-grades.html?id=${id}">View Grades</a>
      <a class="btn btn-light" href="student-profile.html?id=${id}">My Profile</a>
      <a class="btn btn-light" href="schedule.html">Class Schedule</a>
    </div>
    <div class="two-col">
      <section class="card"><h3>Recent Grades</h3>${list(grades.slice(-4).reverse().map((g) => `<span>${esc(g.subject)}</span><span><b>${g.grade}%</b> ${gradeBadge(g.grade)}</span>`))}</section>
      <section class="card"><h3>Upcoming Classes</h3>${list(classes.slice(0, 4).map((c) => `<span>${esc(c.course)}<small>${esc(c.day)} · ${esc(c.time)}</small></span><span>${esc(c.room)}</span>`))}</section>
    </div>
    <section class="card"><h3>Announcements</h3>${list(news.slice(0, 3).map((n) => `<span>${esc(n.title)}<small>${esc(n.date)}</small></span>${badge("info", n.tag)}`))}</section>`;
};

pages["student-profile"] = async () => {
  const id = currentId();
  const draw = async () => {
    const s = await getStudent(id).catch(() => null);
    if (!s) {
      $("#content").innerHTML = `<h1>Profile</h1><p class="error">Student not found or access denied.</p>`;
      return;
    }
    const info = (title, rows) =>
      `<section class="card"><h3>${title}</h3><dl class="profile">${rows.map(([l, k]) => `<div><dt>${l}</dt><dd>${esc(s[k])}</dd></div>`).join("")}</dl></section>`;
    const avatarInner = s.photo
      ? `<img src="${esc(s.photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : esc(s.name.split(" ").map((w) => w[0]).join(""));
    $("#content").innerHTML = `
      <h1>Profile</h1>
      <section class="card profile-head">
        <div class="avatar" style="overflow:hidden;">${avatarInner}</div>
        <div><h2>${esc(s.name)}</h2><p>${esc(s.id)} · ${esc(s.department)}</p>${activeBadge(s.status)}</div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-light" id="change-photo">Change Photo</button>
          ${s.photo ? `<button class="btn btn-light" id="remove-photo">Remove Photo</button>` : ""}
          <button class="btn" id="edit">Edit Profile</button>
        </div>
        <input type="file" id="photo-input" accept="image/*" style="display:none;">
      </section>
      <div class="two-col">
        ${info("Personal Information", [["Full Name", "name"], ["Email", "email"], ["Phone", "phone"], ["Address", "address"]])}
        ${info("Academic Information", [["Student ID", "id"], ["Department", "department"], ["Level", "level"], ["Enrolled", "enrolled"]])}
      </div>`;
    $("#edit").onclick = () => formModal({
      title: "Edit Profile", fields: PROFILE_FIELDS, values: s,
      onSubmit: async (v) => { await updateStudent(id, v); toast("Profile updated"); draw(); },
    });
    $("#change-photo").onclick = () => $("#photo-input").click();
    $("#remove-photo")?.addEventListener("click", () => confirmModal({
      title: "Remove Photo",
      message: "Are you sure you want to remove your profile photo?",
      onConfirm: async () => {
        try { await removePhoto(id); toast("Photo removed"); draw(); }
        catch (err) { toast(err.message, "bad"); }
      },
    }));
    $("#photo-input").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { await uploadPhoto(id, file); toast("Photo updated"); draw(); }
      catch (err) { toast(err.message, "bad"); }
    };
  };
  await draw();
};

pages["student-grades"] = async () => {
  const grades = await getGrades(currentId()).catch(() => []);
  $("#content").innerHTML = `<h1>Grades</h1>
    ${grid([
      card({ icon: "grades", title: "GPA", value: gpaOf(grades) }),
      card({ icon: "book", title: "Total Courses", value: grades.length }),
      card({ icon: "cap", title: "Credits Earned", value: creditsOf(grades) }),
    ])}
    ${toolbar({ filters: [{ id: "semester", label: "All semesters", options: semesters }] })}<div id="table"></div>`;
  const draw = () => {
    const { q, f } = readToolbar();
    $("#table").innerHTML = table({
      columns: GRADE_COLUMNS,
      rows: grades.filter((g) => matches(g, q, ["subject", "code"]) && (!f.semester || g.semester === f.semester)),
    });
  };
  onToolbarChange(draw);
  draw();
};

pages.courses = async () => {
  const courses = await getCourses();
  $("#content").innerHTML = `<h1>Courses</h1>${toolbar({ filters: [{ id: "semester", label: "All semesters", options: semesters }] })}<div id="table"></div>`;
  const draw = () => {
    const { q, f } = readToolbar();
    $("#table").innerHTML = table({
      columns: [
        { label: "Code", key: "code" }, 
        { label: "Course", key: "name" }, 
        { label: "Credits", key: "credits" }, 
        { label: "Instructor", key: "instructor" }, 
        { label: "Semester", key: "semester" },
        { label: "Status", render: () => badge("info", "In Progress") }
      ],
      rows: courses.filter((c) => matches(c, q, ["code", "name", "instructor"]) && (!f.semester || c.semester === f.semester)),
    });
  };
  onToolbarChange(draw);
  draw();
};

pages.schedule = async () => {
  const classes = await getSchedule();
  
  // Group classes by day
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const grouped = days.map(d => ({
    day: d,
    items: classes.filter(c => c.day === d).sort((a, b) => a.time.localeCompare(b.time))
  })).filter(g => g.items.length > 0);

  const renderDay = (g) => `
    <div class="schedule-day">
      <h3>${esc(g.day)}</h3>
      <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
        ${g.items.map(c => `
          <div class="card schedule-card">
            <div style="font-weight:bold;margin-bottom:8px;">${esc(c.course)}</div>
            <div style="color:var(--muted);font-size:0.9em;">
              <div>${icon("calendar", 14)} ${esc(c.time)}</div>
              <div>${icon("home", 14)} ${esc(c.room)}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  $("#content").innerHTML = `<h1>Class Schedule</h1><div style="display:flex;flex-direction:column;gap:24px;">${grouped.map(renderDay).join("")}</div>`;
};

pages.announcements = async () => {
  const news = await getAnnouncements();
  // BUG (stored XSS): title/body come straight from the database and are injected via innerHTML, unescaped.
  // Combined with the backend's missing admin check on POST /announcements, any logged-in student
  // can plant a payload here that runs in every other user's browser when they open this page.
  $("#content").innerHTML = `<h1>Announcements</h1>${news.map((n) => `
    <article class="card news"><div>${badge("info", n.tag)} <small>${esc(n.date)}</small></div><h2>${n.title}</h2><p>${n.body}</p></article>`).join("")}`;
};
