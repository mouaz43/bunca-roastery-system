// public/js/app.js
(function () {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.querySelector("[data-toggle-sidebar]");
  if (sidebar && toggle) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("is-open"));
    sidebar.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) sidebar.classList.remove("is-open");
    });
  }

  // Scroll to top helper (optional)
  const toTop = document.querySelector("[data-to-top]");
  if (toTop) {
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
})();
