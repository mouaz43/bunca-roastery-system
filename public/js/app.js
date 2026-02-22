// public/js/app.js
(function () {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.querySelector("[data-toggle-sidebar]");
  if (!sidebar || !toggle) return;

  toggle.addEventListener("click", () => sidebar.classList.toggle("is-open"));

  // close on nav click (mobile)
  sidebar.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link) sidebar.classList.remove("is-open");
  });
})();
