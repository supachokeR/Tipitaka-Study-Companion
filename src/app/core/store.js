var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var memory = {};
  var warned = false;

  function emitUnavailable() {
    if (warned) return;
    warned = true;
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("tsc:storage-unavailable"));
    }
  }

  function area() {
    try {
      var ls = globalThis.localStorage;
      var k = "tsc:v1:probe";
      ls.setItem(k, "1");
      ls.removeItem(k);
      return ls;
    } catch (err) {
      return null;
    }
  }

  TSC.store = {
    get: function (key, fallback) {
      var ls = area();
      if (!ls) return memory[key] !== undefined ? memory[key] : fallback;
      try {
        var raw = ls.getItem("tsc:v1:" + key);
        if (raw == null) return fallback;
        return JSON.parse(raw);
      } catch (err) {
        try {
          var bad = ls.getItem("tsc:v1:" + key);
          ls.setItem("tsc:v1:corrupt-" + Date.now(), bad);
          ls.removeItem("tsc:v1:" + key);
        } catch (err2) { /* ignore */ }
        return fallback;
      }
    },
    set: function (key, value) {
      var ls = area();
      if (!ls) {
        memory[key] = value;
        emitUnavailable();
        return false;
      }
      try {
        ls.setItem("tsc:v1:" + key, JSON.stringify(value));
        return true;
      } catch (err) {
        memory[key] = value;
        emitUnavailable();
        return false;
      }
    },
    remove: function (key) {
      var ls = area();
      if (!ls) {
        delete memory[key];
        return;
      }
      try { ls.removeItem("tsc:v1:" + key); } catch (err) { emitUnavailable(); }
    }
  };
})();
