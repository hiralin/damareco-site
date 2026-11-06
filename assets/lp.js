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
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  try {
    var gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return;
    var lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  } catch (e) { return; }

  section.classList.add("guide-on");
  var off = function () { section.classList.remove("guide-on"); };
  var seen = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    seen.disconnect();
    import("./guide.js").then(function (m) { m.start(section, off); }).catch(off);
  }, { rootMargin: "800px 0px" });
  seen.observe(section);
})();
