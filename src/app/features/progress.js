var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  TSC.progress = {
    map: function () { return TSC.store.get("progress", {}); },
    toggle: function (unitId) {
      var m = TSC.progress.map();
      if (m[unitId]) delete m[unitId];
      else m[unitId] = true;
      TSC.store.set("progress", m);
      return !!m[unitId];
    },
    has: function (unitId) { return !!TSC.progress.map()[unitId]; },
    percent: function (unitIds) {
      if (!unitIds.length) return 0;
      var m = TSC.progress.map();
      var done = unitIds.filter(function (id) { return m[id]; }).length;
      return Math.round(100 * done / unitIds.length);
    }
  };
})();
