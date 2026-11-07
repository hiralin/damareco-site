// Advances the hero's REC clock (minutes:seconds, like the app's timer). Static when the viewer prefers reduced motion.
(function () {
  var clock = document.querySelector("[data-rec-clock]");
  if (!clock || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var parts = clock.textContent.split(":");
  var seconds = Number(parts[0]) * 60 + Number(parts[1]);
  setInterval(function () {
    seconds += 1;
    var s = seconds % 60;
    clock.textContent = Math.floor(seconds / 60) + ":" + (s < 10 ? "0" : "") + s;
  }, 1000);
})();

// How it works: swaps the static tape and steps for the three.js guide. The HTML stays as it is when any condition fails.
(function () {
  var section = document.getElementById("how");
  if (!section || !section.querySelector(".guide")) return;
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || !("IntersectionObserver" in window)) return;
  try {
    var gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return;
    var lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  } catch (e) { return; }

  // The static tape and steps stay until the stage is ready; .guide already holds the rest of the height, so the swap moves nothing.
  var before = section.querySelector(".tape").previousElementSibling, steps = section.querySelector(".steps");
  var reserve = function () {
    if (section.classList.contains("guide-ready")) return;
    section.style.setProperty("--guide-static", steps.offsetTop + steps.offsetHeight - before.offsetTop - before.offsetHeight + "px");
  };
  reserve();
  window.addEventListener("resize", reserve, { passive: true });
  section.classList.add("guide-on");

  var stage = null;
  var off = function () {
    section.classList.remove("guide-on", "guide-ready");
    if (stage) stage.stop();
    stage = null;
  };
  motion.addEventListener("change", function (e) { if (e.matches) off(); });

  var watch = function () {
    var seen = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      seen.disconnect();
      if (!section.classList.contains("guide-on")) return;
      import("./guide.js").then(function (m) { return m.start(section, off); }).then(function (started) {
        if (!started) return;
        stage = started;
        section.classList.add("guide-ready");
      }).catch(off);
    }, { rootMargin: "800px 0px" });
    seen.observe(section);
  };
  // three.js waits for the first scroll, so it never competes with the hero's LCP and stays unloaded for anyone who doesn't scroll.
  if (window.scrollY > 0) watch();
  else window.addEventListener("scroll", watch, { once: true, passive: true });
})();
