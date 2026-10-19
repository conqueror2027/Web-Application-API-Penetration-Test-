const pages = {};
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ICONS = {
  home: "M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M17 4.5a3.5 3.5 0 010 6.5M19 20a7 7 0 00-3-5.7",
  grades: "M6 3h9l4 4v14H6zM9 12h7M9 16h7",
  book: "M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 19V5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  bell: "M6 17v-6a6 6 0 1112 0v6l2 2H4zM10 21h4",
  chart: "M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-9",
  cap: "M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5",
  logout: "M10 4H5v16h5M15 8l5 4-5 4M20 12H9",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5",
  plus: "M12 5v14M5 12h14",
  menu: "M3 12h18M3 6h18M3 18h18",
  x: "M18 6L6 18M6 6l12 12",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  check: "M20 6L9 17l-5-5",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7"
};
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

const badge = (tone, text) => `<span class="badge ${tone}">${esc(text)}</span>`;
const gradeBadge = (g) => badge(statusOf(g) === "Passed" ? "ok" : "bad", statusOf(g));
const activeBadge = (s) => badge(s === "Active" ? "ok" : "bad", s);
const list = (rows) => `<ul class="list">${rows.map((r) => `<li>${r}</li>`).join("")}</ul>`;
const grid = (cards) => `<div class="grid">${cards.join("")}</div>`;

function card({ icon: ic, title, value, href, body = "" }) {
  const inner = `${ic ? `<span class="card-icon">${icon(ic)}</span>` : ""}<h3>${title}</h3>${value !== undefined ? `<p class="card-value">${value}</p>` : ""}${body}`;
  return href ? `<a class="card card-link" href="${href}">${inner}</a>` : `<div class="card">${inner}</div>`;
}

function table({ columns, rows, actions }) {
  const rawQuery = $("#search")?.value || ""; // BUG: taken straight from the input, not esc()'d
  const head = columns.map((c) => `<th>${c.label}</th>`).join("") + (actions ? "<th>Actions</th>" : "");
  const body = rows.length
    ? rows.map((r) => `<tr>${columns.map((c) => `<td data-label="${esc(c.label)}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join("")}${actions ? `<td class="actions" data-label="Actions">${actions(r)}</td>` : ""}</tr>`).join("")
    : `<tr><td colspan="${columns.length + (actions ? 1 : 0)}">No records found${rawQuery ? ` for "${rawQuery}"` : ""}.</td></tr>`; // BUG (reflected XSS): rawQuery is unescaped user input
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function toolbar({ filters = [], action = "" }) {
  const selects = filters.map((f) =>
    `<select data-filter="${f.id}" aria-label="${f.label}"><option value="">${f.label}</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join("")}</select>`).join("");
  return `<div class="toolbar"><div class="search">${icon("search", 16)}<input id="search" placeholder="Search..."></div>${selects}${action}</div>`;
}
const readToolbar = () => ({
  q: $("#search").value.toLowerCase(),
  f: Object.fromEntries($$("[data-filter]").map((s) => [s.dataset.filter, s.value])),
});
const matches = (row, q, keys) => keys.some((k) => String(row[k] ?? "").toLowerCase().includes(q));
const onToolbarChange = (cb) => $(".toolbar")?.addEventListener("input", cb);

function openModal(title, html) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "overlay overlay-enter";
  overlay.innerHTML = `<div class="modal modal-enter" role="dialog" aria-modal="true"><h2>${title}</h2>${html}</div>`;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  return overlay;
}
const closeModal = () => {
  const overlay = $(".overlay");
  if (overlay) {
    overlay.classList.remove("overlay-enter");
    overlay.remove();
  }
};
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function formModal({ title, fields, values, onSubmit }) {
  const field = (f) => {
    const attrs = `name="${f.name}" ${f.readOnly ? "readonly" : ""}`;
    const input = f.options
      ? `<select ${attrs}>${f.options.map((o) => `<option ${o === values[f.name] ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
      : `<input ${attrs} type="${f.type || "text"}" value="${esc(values[f.name])}">`;
    return `<label class="field"><span>${f.label}</span>${input}<small class="field-error" data-error="${f.name}"></small></label>`;
  };
  const overlay = openModal(title, `<form novalidate>${fields.map(field).join("")}<div class="form-actions"><button type="button" class="btn btn-light" data-close>Cancel</button><button type="submit" class="btn">Save</button></div></form>`);
  const form = $("form", overlay);
  $("[data-close]", overlay).onclick = closeModal;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = { ...values };
    let valid = true;
    fields.forEach((f) => {
      data[f.name] = form.elements[f.name].value.trim();
      const err = !data[f.name] ? `${f.label} is required` : f.validate?.(data[f.name], data) || "";
      $(`[data-error="${f.name}"]`, overlay).textContent = err;
      if (err) valid = false;
    });
    if (valid) {
      try { await onSubmit(data); closeModal(); }
      catch (err) { toast(err.message || "Something went wrong", "bad"); }
    }
  };
  $("input:not([readonly]), select", overlay)?.focus();
}

function confirmModal({ title, message, onConfirm }) {
  const overlay = openModal(title, `<p>${message}</p><div class="form-actions"><button type="button" class="btn btn-light" data-close>Cancel</button><button type="button" class="btn btn-danger" data-ok>Delete</button></div>`);
  $("[data-close]", overlay).onclick = closeModal;
  $("[data-ok]", overlay).onclick = async () => { await onConfirm(); closeModal(); };
}

function toast(message, type = "ok") {
  let box = $(".toasts");
  if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  const ic = type === "ok" ? icon("check") : icon("x");
  t.innerHTML = `<span class="toast-icon">${ic}</span><span>${esc(message)}</span>`;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

const showLoading = (show = true) => {
  if (show) {
    if (!$(".loading-spinner")) document.body.insertAdjacentHTML("beforeend", '<div class="loading-spinner"></div>');
  } else {
    $(".loading-spinner")?.remove();
  }
};

const validEmail = (v) => (/^\S+@\S+\.\S+$/.test(v) ? "" : "Enter a valid email address");

const sessionId = () => {
  const s = Session.get();
  return (s && s.role === "student" && s.id) ? s.id : "STU001";
};
const currentId = () => new URLSearchParams(location.search).get("id") || sessionId();

const NAV = {
  student: () => [
    ["student-dashboard", "student-dashboard.html", "Dashboard", "home"],
    ["student-profile", `student-profile.html?id=${sessionId()}`, "Profile", "user"],
    ["student-grades", `student-grades.html?id=${sessionId()}`, "Grades", "grades"],
    ["courses", "courses.html", "Courses", "book"],
    ["schedule", "schedule.html", "Schedule", "calendar"],
    ["announcements", "announcements.html", "Announcements", "bell"],
  ],
  admin: () => [
    ["admin-dashboard", "admin-dashboard.html", "Dashboard", "home"],
    ["manage-students", "manage-students.html", "Students", "users"],
    ["manage-grades", "manage-grades.html", "Grades", "grades"],
    ["reports", "reports.html", "Reports", "chart"],
  ],
};
const TITLES = {
  "student-dashboard": "Dashboard", "student-profile": "Profile", "student-grades": "Grades", courses: "Courses",
  schedule: "Schedule", announcements: "Announcements", "admin-dashboard": "Admin Dashboard",
  "manage-students": "Manage Students", "manage-grades": "Manage Grades", reports: "Reports",
  "view-student": "Student Details",
};

function buildShell(role, page) {
  const who = role === "admin" ? "Administrator" : `Student · ${sessionId()}`;
  $("#app").innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <button class="sidebar-close" id="sidebar-close" aria-label="Close menu">${icon("x")}</button>
        <a class="logo" href="index.html"><span class="logo-mark">${icon("cap", 20)}</span><span>Horizon University<small>Student Portal</small></span></a>
        <span class="side-title">${role === "admin" ? "Administration" : "Student"}</span>
        <nav>
          ${NAV[role]().map(([p, href, label, ic]) => {
            const isActive = p === page || (page === "view-student" && p === "manage-students");
            return `<a href="${href}" class="${isActive ? "active" : ""}">${icon(ic)}${label}</a>`;
          }).join("")}
          <button id="logout">${icon("logout")}Logout</button>
        </nav>
        <div class="sidebar-footer">
          <button id="reset-data" class="btn btn-sm btn-light" style="width:100%;margin-top:auto;">${icon("trash", 14)} Reset Data</button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="menu-toggle" id="menu-toggle" aria-label="Open menu">${icon("menu")}</button>
            <h2>${TITLES[page]}</h2>
          </div>
          <span class="user-chip"><span class="avatar sm">${who[0]}</span>${who}</span>
        </header>
        <main class="content" id="content"></main>
      </div>
    </div>`;
  
  $("#logout").onclick = () => { Session.clear(); location.href = `${role}-login.html`; };
  
  $("#menu-toggle")?.addEventListener("click", () => {
    $(".sidebar").classList.add("open");
  });
  
  $("#sidebar-close")?.addEventListener("click", () => {
    $(".sidebar").classList.remove("open");
  });
  
  $$("aside nav a").forEach(link => {
    link.addEventListener("click", () => {
      $(".sidebar")?.classList.remove("open");
    });
  });

  $("#reset-data").onclick = () => {
    if(confirm("Are you sure you want to reset all data to default?")) {
      localStorage.removeItem("sms_db");
      location.reload();
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const { page, role } = document.body.dataset;
  const session = Session.get();

  // If admin visits student-profile, redirect to view-student in admin context
  if (page === "student-profile" && session?.role === "admin") {
    const id = new URLSearchParams(location.search).get("id") || "";
    location.replace(`view-student.html${id ? `?id=${encodeURIComponent(id)}` : ""}`);
    return;
  }

  // If student visits view-student, redirect to student-profile in student context
  if (page === "view-student" && session?.role === "student") {
    const id = new URLSearchParams(location.search).get("id") || session.id || "";
    location.replace(`student-profile.html${id ? `?id=${encodeURIComponent(id)}` : ""}`);
    return;
  }

  if (role) buildShell(role, page);
  $$("[data-icon]").forEach((el) => el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon)));
  if (pages[page]) {
    showLoading(true);
    try {
      await pages[page]();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(err) {
      console.error(err);
      toast("Something went wrong", "bad");
    } finally {
      showLoading(false);
    }
  }
});
