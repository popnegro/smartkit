const menuToggle = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const toast = document.querySelector("[data-toast]");
const forms = document.querySelectorAll("form");
const revealItems = document.querySelectorAll(".reveal");

menuToggle.addEventListener("click", () => {
  const isOpen = menu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

menu.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    menu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

forms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (form.dataset.redirect) {
      window.location.href = form.dataset.redirect;
      return;
    }
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2600);
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => revealObserver.observe(item));
