const LOGINS = {
  "student-login": { login: loginStudent, field: "identifier", role: "student", next: "student-dashboard.html" },
  "admin-login": { login: loginAdmin, field: "username", role: "admin", next: "admin-dashboard.html" },
};

Object.entries(LOGINS).forEach(([page, cfg]) => {
  pages[page] = () => {
    const errorEl = $("#login-error");
    const formEl = $("#login-form");
    
    // Clear error message when user starts typing
    formEl.addEventListener("input", () => {
      errorEl.textContent = "";
    });

    formEl.onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target.elements;
      const credentials = { [cfg.field]: form[cfg.field].value.trim(), password: form.password.value };
      
      if (!credentials[cfg.field] || !credentials.password) {
        errorEl.textContent = "Please fill in all fields.";
        return;
      }
      
      const submitBtn = formEl.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      try {
        // Loading state
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";
        
        const user = await cfg.login(credentials);
        Session.set({ role: cfg.role, id: user.id || user.username || "admin" });
        location.href = cfg.next;
      } catch (err) {
        errorEl.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    };
  };
});
