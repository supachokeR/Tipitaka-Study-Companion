var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var started = false;
  function boot() {
    if (started) return;
    started = true;
    TSC.mountChrome();
    TSC.router.start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
