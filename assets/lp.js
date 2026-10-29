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
