// Nameplate marketing site — small progressive-enhancement touches.
// No framework, no build step: this file is loaded as a plain <script>.

(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (!header) return;

  function onScroll() {
    if (window.scrollY > 8) {
      header.style.boxShadow = "0 1px 0 rgba(14, 22, 32, 0.06)";
    } else {
      header.style.boxShadow = "none";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
