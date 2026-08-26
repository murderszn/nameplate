// Nameplate marketing site — small progressive-enhancement touches.
// No framework, no build step: this file is loaded as a plain <script>.

(function () {
  "use strict";

  var header = document.querySelector(".site-header");

  function onScroll() {
    if (!header) return;
    if (window.scrollY > 8) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Scroll-triggered fade/slide-in for elements marked [data-animate].
  var targets = document.querySelectorAll("[data-animate]");

  if (!("IntersectionObserver" in window) || targets.length === 0) {
    // No observer support (or nothing to animate): just show everything.
    targets.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach(function (el, i) {
    // Small stagger within each section so groups feel choreographed,
    // not simultaneous, without any layout dependency.
    el.style.transitionDelay = (Math.min(i % 6, 5) * 60) + "ms";
    observer.observe(el);
  });
})();
