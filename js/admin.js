const STATUSES = ["Active", "Inactive"];
const EMPTY_STUDENT = { id: "", name: "", email: "", phone: "", address: "Not provided", enrolled: "2026", department: departments[0], level: levels[0], status: "Active" };

pages["admin-dashboard"] = async () => {
  const [students, grades, courses, activityLog] = await Promise.all([getStudents(), getAdminGrades(), getCourses(), getActivity()]);
  $("#content").innerHTML = `
    <div class="welcome"><h1>Admin Dashboard</h1><p>Overview of students, courses and academic results.</p></div>
    ${grid([
      card({ icon: "users", title: "Total Students", value: students.length }),
      card({ icon: "book", title: "Total Courses", value: courses.length }),
      card({ icon: "chart", title: "Average GPA", value: gpaOf(grades) }),
    ])}
    <div class="hero-actions">
      <a class="btn" href="manage-students.html">Manage Students</a>
      <a class="btn btn-light" href="manage-grades.html">Manage Grades</a>
      <a class="btn btn-light" href="reports.html">View Reports</a>
    </div>
    <div class="two-col">
      <section class="card"><h3>Recent Students</h3>${list(students.slice(-4).reverse().map((s) => `<span><a href="view-student.html?id=${esc(s.id)}" style="font-weight:600;color:inherit;">${esc(s.name)}</a><small>${esc(s.id)} · ${esc(s.department)}</small></span>${activeBadge(s.status)}`))}</section>
      <section class="card"><h3>Recent Activity</h3>${list(activityLog.map((a) => `<span>${esc(a.text)}</span><small>${esc(a.time)}</small>`))}</section>
    </div>`;
};

pages["manage-students"] = async () => {
  let students = await getStudents();
  $("#content").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
      <h1>Manage Students <span class="badge info">${students.length} Total</span></h1>
      <button class="btn btn-light" id="export-students">${icon("book", 16)} Export</button>
    </div>
    ${toolbar({
      filters: [{ id: "dept", label: "All departments", options: departments }, { id: "status", label: "All statuses", options: STATUSES }],
      action: `<button class="btn" id="add">${icon("plus", 16)}Add Student</button>`,
    })}<div id="table"></div>`;

  const draw = () => {
    const { q, f } = readToolbar();
    $("#table").innerHTML = table({
      columns: [
        { label: "Student ID", key: "id" }, { label: "Name", key: "name" }, { label: "Email", key: "email" },
        { label: "Department", key: "department" }, { label: "Level", key: "level" },
        { label: "Status", render: (s) => activeBadge(s.status) },
      ],
      rows: students.filter((s) => matches(s, q, ["id", "name", "email"]) && (!f.dept || s.department === f.dept) && (!f.status || s.status === f.status)),
      actions: (s) => `<a class="btn btn-sm" href="view-student.html?id=${esc(s.id)}">View</a>
        <button class="btn btn-sm btn-light" data-action="edit" data-id="${esc(s.id)}" aria-label="Edit">${icon("edit", 14)}</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${esc(s.id)}" aria-label="Delete">${icon("trash", 14)}</button>`,
    });
  };
  const reload = async () => { 
    students = await getStudents(); 
    $("h1 .badge").textContent = `${students.length} Total`;
    draw(); 
  };

  const openForm = (student) => {
    const editing = !!student;
    const idField = editing
      ? { name: "id", label: "Student ID", readOnly: true }
      : { name: "id", label: "Student ID", validate: (v) => !/^STU\d{3,}$/i.test(v) ? "Use the format STU001" : students.some((s) => s.id === v.toUpperCase()) ? "Student ID already exists" : "" };
    formModal({
      title: editing ? "Edit Student" : "Add Student",
      values: student ?? EMPTY_STUDENT,
      fields: [
        idField,
        { name: "name", label: "Full Name", validate: (v) => (v.length >= 3 ? "" : "Name is too short") },
        { name: "email", label: "Email", type: "email", validate: validEmail },
        { name: "phone", label: "Phone" },
        { name: "department", label: "Department", options: departments },
        { name: "level", label: "Level", options: levels },
        { name: "status", label: "Status", options: STATUSES },
      ],
      onSubmit: async (v) => {
        v.id = v.id.toUpperCase();
        await (editing ? updateStudent(v.id, v) : createStudent(v));
        toast(editing ? "Student updated" : "Student added");
        reload();
      },
    });
  };

  $("#export-students").onclick = () => toast("Export complete", "ok");
  $("#add").onclick = () => openForm(null);
  $("#table").onclick = (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const s = students.find((x) => x.id === btn.dataset.id);
    if (btn.dataset.action === "edit") return openForm(s);
    confirmModal({
      title: "Delete Student",
      message: `Are you sure you want to delete <strong>${esc(s.name)}</strong> (${esc(s.id)})?`,
      onConfirm: async () => { await deleteStudent(s.id); toast("Student deleted"); reload(); },
    });
  };
  onToolbarChange(draw);
  draw();
};

pages["manage-grades"] = async () => {
  let [grades, students, courses] = await Promise.all([getAdminGrades(), getStudents(), getCourses()]);
  const nameOf = (id) => students.find((s) => s.id === id)?.name ?? "Unknown";
  $("#content").innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
      <h1>Manage Grades <span class="badge info">${grades.length} Records</span></h1>
      <button class="btn btn-light" id="export-grades">${icon("book", 16)} Export</button>
    </div>
    ${toolbar({
      filters: [{ id: "semester", label: "All semesters", options: semesters }],
      action: `<button class="btn" id="add">${icon("plus", 16)}Add Grade</button>`,
    })}<div id="table"></div>`;

  const draw = () => {
    const { q, f } = readToolbar();
    $("#table").innerHTML = table({
      columns: [
        { label: "Student", render: (g) => esc(nameOf(g.studentId)) }, { label: "Student ID", key: "studentId" },
        { label: "Course", key: "subject" }, { label: "Grade", render: (g) => `${g.grade}%` },
        { label: "Semester", render: (g) => esc(g.semester ?? "-") }, { label: "Status", render: (g) => gradeBadge(g.grade) },
      ],
      rows: grades.filter((g) => (matches(g, q, ["studentId", "subject"]) || nameOf(g.studentId).toLowerCase().includes(q)) && (!f.semester || g.semester === f.semester)),
      actions: (g) => `<button class="btn btn-sm btn-light" data-action="edit" data-id="${g.id}" aria-label="Edit">${icon("edit", 14)}</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${g.id}" aria-label="Delete">${icon("trash", 14)}</button>`,
    });
  };
  const reload = async () => { 
    grades = await getAdminGrades(); 
    $("h1 .badge").textContent = `${grades.length} Records`;
    draw(); 
  };

  const openForm = (grade) => formModal({
    title: grade ? "Edit Grade" : "Add Grade",
    values: grade ?? { studentId: "", subject: courses[0].name, grade: "", semester: semesters[0] },
    fields: [
      { name: "studentId", label: "Student ID", validate: (v) => (students.some((s) => s.id === v.toUpperCase()) ? "" : "Student not found") },
      { name: "subject", label: "Course", options: courses.map((c) => c.name) },
      { name: "grade", label: "Grade (%)", type: "number", validate: (v) => (Number(v) >= 0 && Number(v) <= 100 ? "" : "Grade must be between 0 and 100") },
      { name: "semester", label: "Semester", options: semesters },
    ],
    onSubmit: async (v) => {
      const course = courses.find((c) => c.name === v.subject);
      const data = { ...v, studentId: v.studentId.toUpperCase(), grade: Number(v.grade), code: course?.code, credits: course?.credits };
      await (grade ? updateGrade(grade.id, data) : createGrade(data));
      toast(grade ? "Grade updated" : "Grade added");
      reload();
    },
  });

  $("#export-grades").onclick = () => toast("Export complete", "ok");
  $("#add").onclick = () => openForm(null);
  $("#table").onclick = (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const g = grades.find((x) => String(x.id) === btn.dataset.id);
    if (btn.dataset.action === "edit") return openForm(g);
    confirmModal({
      title: "Delete Grade",
      message: `Delete the <strong>${esc(g.subject)}</strong> grade for ${esc(g.studentId)}?`,
      onConfirm: async () => { await deleteGrade(g.id); toast("Grade deleted"); reload(); },
    });
  };
  onToolbarChange(draw);
  draw();
};

pages.reports = async () => {
  const [students, grades] = await Promise.all([getStudents(), getAdminGrades()]);
  const pct = (part, total) => (total ? `${Math.round((part / total) * 100)}%` : "-");
  const passed = (list) => list.filter((g) => g.grade >= PASS_MARK).length;
  
  const rows = departments.map((d) => {
    const ids = students.filter((s) => s.department === d).map((s) => s.id);
    const dg = grades.filter((g) => ids.includes(g.studentId));
    return { department: d, students: ids.length, gpa: gpaOf(dg), passRate: pct(passed(dg), dg.length) };
  });

  const studentPerformanceRows = students.map(s => {
    const sg = grades.filter(g => g.studentId === s.id);
    return {
      id: s.id,
      name: s.name,
      department: s.department,
      gpa: gpaOf(sg),
      courses: sg.length,
      passRate: pct(passed(sg), sg.length)
    };
  });

  $("#content").innerHTML = `<h1>Reports</h1>
    ${grid([
      card({ icon: "chart", title: "Overall GPA", value: gpaOf(grades) }),
      card({ icon: "grades", title: "Overall Pass Rate", value: pct(passed(grades), grades.length) }),
      card({ icon: "users", title: "Active Students", value: students.filter((s) => s.status === "Active").length }),
    ])}
    <h2>Performance by Department</h2>
    ${table({ 
      columns: [
        { label: "Department", key: "department" }, 
        { label: "Students", key: "students" }, 
        { label: "Average GPA", key: "gpa" }, 
        { label: "Pass Rate", key: "passRate" }
      ], 
      rows 
    })}
     <h2>Individual Student Performance</h2>
    ${table({
      columns: [
        { label: "ID", key: "id" },
        { label: "Name", key: "name" },
        { label: "Department", key: "department" },
        { label: "Courses", key: "courses" },
        { label: "GPA", key: "gpa" },
        { label: "Pass Rate", key: "passRate" }
      ],
      rows: studentPerformanceRows,
      actions: (s) => `<a class="btn btn-sm btn-light" href="view-student.html?id=${esc(s.id)}">View</a>`
    })}`;
};

pages["view-student"] = async () => {
  const id = currentId();
  let [student, grades, courses] = await Promise.all([
    getStudent(id).catch(() => null),
    getGrades(id).catch(() => []),
    getCourses().catch(() => [])
  ]);

  if (!student) {
    $("#content").innerHTML = `
      <div style="margin-bottom: 20px;">
        <a class="btn btn-light btn-sm" href="manage-students.html">${icon("arrowLeft", 16)} Back to Students</a>
      </div>
      <div class="card" style="text-align: center; padding: 40px 20px;">
        <h2>Student Not Found</h2>
        <p class="error" style="margin-bottom: 20px;">The student with ID <strong>${esc(id)}</strong> could not be found.</p>
        <a class="btn" href="manage-students.html">Return to Students List</a>
      </div>`;
    return;
  }

  const render = () => {
    const initials = (student.name || "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "S";
    const infoCard = (title, items) =>
      `<section class="card">
        <h3>${title}</h3>
        <dl class="profile">
          ${items.map(([lbl, val]) => `<div><dt>${esc(lbl)}</dt><dd>${esc(val || "-")}</dd></div>`).join("")}
        </dl>
      </section>`;

    $("#content").innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom: 20px;">
        <a class="btn btn-light btn-sm" href="manage-students.html">${icon("arrowLeft", 16)} Back to Students</a>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-light btn-sm" id="btn-edit-student">${icon("edit", 14)} Edit Student</button>
          <button class="btn btn-danger btn-sm" id="btn-delete-student">${icon("trash", 14)} Delete Student</button>
        </div>
      </div>

      <section class="card profile-head">
        <div class="avatar">${esc(initials)}</div>
        <div>
          <h2>${esc(student.name)}</h2>
          <p>${esc(student.id)} &middot; ${esc(student.department)} &middot; ${esc(student.level)}</p>
          <div style="display:inline-flex; justify-content:center;">${activeBadge(student.status)}</div>
        </div>
      </section>

      ${grid([
        card({ icon: "chart", title: "GPA", value: gpaOf(grades) }),
        card({ icon: "book", title: "Enrolled Courses", value: grades.length }),
        card({ icon: "cap", title: "Credits Earned", value: creditsOf(grades) }),
        card({ icon: "calendar", title: "Enrolled Year", value: student.enrolled || "-" }),
      ])}

      <div class="two-col" style="margin-top: 24px;">
        ${infoCard("Personal Information", [
          ["Full Name", student.name],
          ["Email Address", student.email],
          ["Phone Number", student.phone],
          ["Address", student.address]
        ])}
        ${infoCard("Academic Information", [
          ["Student ID", student.id],
          ["Department", student.department],
          ["Academic Level", student.level],
          ["Enrollment Year", student.enrolled],
          ["Status", student.status]
        ])}
      </div>

      <section class="card" style="margin-top: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
          <h3 style="margin:0;">Academic Records &amp; Grades <span class="badge info">${grades.length} Records</span></h3>
          <button class="btn btn-sm" id="btn-add-grade">${icon("plus", 14)} Add Grade</button>
        </div>
        <div id="student-grades-table"></div>
      </section>
    `;

    renderGradesTable();
    attachEvents();
  };

  const renderGradesTable = () => {
    $("#student-grades-table").innerHTML = table({
      columns: [
        { label: "Course", key: "subject" },
        { label: "Course Code", render: (g) => esc(g.code ?? "-") },
        { label: "Credits", render: (g) => esc(g.credits ?? "-") },
        { label: "Semester", render: (g) => esc(g.semester ?? "-") },
        { label: "Percentage", render: (g) => `${g.grade}%` },
        { label: "Grade", render: (g) => `<strong>${letterOf(g.grade)}</strong>` },
        { label: "Status", render: (g) => gradeBadge(g.grade) },
      ],
      rows: grades,
      actions: (g) => `
        <button class="btn btn-sm btn-light" data-grade-action="edit" data-id="${g.id}" aria-label="Edit">${icon("edit", 14)}</button>
        <button class="btn btn-sm btn-danger" data-grade-action="delete" data-id="${g.id}" aria-label="Delete">${icon("trash", 14)}</button>
      `
    });
  };

  const reloadGrades = async () => {
    grades = await getGrades(student.id);
    render();
  };

  const openGradeModal = (grade) => {
    formModal({
      title: grade ? "Edit Grade" : `Add Grade for ${esc(student.name)}`,
      values: grade ?? { studentId: student.id, subject: courses[0]?.name || "", grade: "", semester: semesters[0] },
      fields: [
        { name: "subject", label: "Course", options: courses.map((c) => c.name) },
        { name: "grade", label: "Grade (%)", type: "number", validate: (v) => (Number(v) >= 0 && Number(v) <= 100 ? "" : "Grade must be between 0 and 100") },
        { name: "semester", label: "Semester", options: semesters },
      ],
      onSubmit: async (v) => {
        const course = courses.find((c) => c.name === v.subject);
        const data = { ...v, studentId: student.id, grade: Number(v.grade), code: course?.code, credits: course?.credits };
        await (grade ? updateGrade(grade.id, data) : createGrade(data));
        toast(grade ? "Grade updated" : "Grade added");
        await reloadGrades();
      },
    });
  };

  const attachEvents = () => {
    $("#btn-edit-student").onclick = () => {
      formModal({
        title: "Edit Student",
        values: student,
        fields: [
          { name: "id", label: "Student ID", readOnly: true },
          { name: "name", label: "Full Name", validate: (v) => (v.length >= 3 ? "" : "Name is too short") },
          { name: "email", label: "Email", type: "email", validate: validEmail },
          { name: "phone", label: "Phone" },
          { name: "department", label: "Department", options: departments },
          { name: "level", label: "Level", options: levels },
          { name: "status", label: "Status", options: STATUSES },
        ],
        onSubmit: async (v) => {
          v.id = v.id.toUpperCase();
          await updateStudent(student.id, v);
          student = await getStudent(student.id);
          toast("Student updated");
          render();
        },
      });
    };

    $("#btn-delete-student").onclick = () => {
      confirmModal({
        title: "Delete Student",
        message: `Are you sure you want to delete <strong>${esc(student.name)}</strong> (${esc(student.id)})?`,
        onConfirm: async () => {
          await deleteStudent(student.id);
          toast("Student deleted");
          location.href = "manage-students.html";
        },
      });
    };

    $("#btn-add-grade").onclick = () => openGradeModal(null);

    $("#student-grades-table").onclick = (e) => {
      const btn = e.target.closest("[data-grade-action]");
      if (!btn) return;
      const g = grades.find((x) => String(x.id) === btn.dataset.id);
      if (!g) return;
      if (btn.dataset.gradeAction === "edit") return openGradeModal(g);
      confirmModal({
        title: "Delete Grade",
        message: `Delete the <strong>${esc(g.subject)}</strong> grade for ${esc(student.name)}?`,
        onConfirm: async () => {
          await deleteGrade(g.id);
          toast("Grade deleted");
          await reloadGrades();
        },
      });
    };
  };

  render();
};
