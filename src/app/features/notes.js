var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  function uid() {
    return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  TSC.notes = {
    all: function () { return TSC.store.get("notes", []); },
    saveAll: function (list) { TSC.store.set("notes", list); },
    forAnchor: function (anchor) {
      var all = TSC.notes.all();
      if (!anchor || (!anchor.unitId && !anchor.volume)) return all;
      return all.filter(function (n) {
        if (!n.anchor) return false;
        if (anchor.unitId) return n.anchor.unitId === anchor.unitId;
        return n.anchor.volume === anchor.volume;
      });
    },
    create: function (note) {
      var now = new Date().toISOString();
      var item = {
        id: uid(),
        anchor: note.anchor || {},
        title: note.title || "",
        body: note.body || "",
        tags: note.tags || [],
        kind: note.kind || "general",
        createdAt: now,
        updatedAt: now
      };
      var list = TSC.notes.all();
      list.unshift(item);
      TSC.notes.saveAll(list);
      return item;
    },
    update: function (id, patch) {
      var list = TSC.notes.all().map(function (n) {
        if (n.id !== id) return n;
        var next = Object.assign({}, n, patch, { updatedAt: new Date().toISOString() });
        next.anchor = patch.anchor || n.anchor;
        return next;
      });
      TSC.notes.saveAll(list);
    },
    remove: function (id) {
      TSC.notes.saveAll(TSC.notes.all().filter(function (n) { return n.id !== id; }));
    },
    search: function (q) {
      var nq = (q || "").toLowerCase();
      return TSC.notes.all().filter(function (n) {
        var blob = (n.title + " " + n.body + " " + (n.tags || []).join(" ")).toLowerCase();
        return blob.indexOf(nq) !== -1;
      });
    }
  };
})();
