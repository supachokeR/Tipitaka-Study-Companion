var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  function payload(includeProgress) {
    var data = {
      app: "tipitaka-study-companion",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      notes: TSC.notes.all()
    };
    if (includeProgress) {
      data.progress = TSC.progress.map();
      data.quizHistory = TSC.quiz.history();
    }
    return data;
  }

  function validNote(n) {
    return n && typeof n.id === "string" && n.id.length < 80 && typeof n.title === "string" && typeof n.body === "string" && Array.isArray(n.tags);
  }

  TSC.io = {
    build: payload,
    download: function (includeProgress) {
      var data = payload(includeProgress);
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      var day = data.exportedAt.slice(0, 10).replace(/-/g, "");
      a.href = URL.createObjectURL(blob);
      a.download = "tipitaka-study-notes-" + day + ".json";
      a.click();
      return data;
    },
    importPayload: function (data, mode) {
      if (!data || data.app !== "tipitaka-study-companion" || data.schemaVersion !== 1 || !Array.isArray(data.notes)) {
        throw new Error("ไฟล์ไม่ตรง schema");
      }
      if (!data.notes.every(validNote)) throw new Error("โน้ตในไฟล์ไม่ครบฟิลด์");
      var current = TSC.notes.all();
      if (mode === "replace") TSC.notes.saveAll(data.notes);
      else {
        var map = {};
        current.forEach(function (n) { map[n.id] = n; });
        data.notes.forEach(function (n) {
          if (!map[n.id] || String(n.updatedAt) >= String(map[n.id].updatedAt)) map[n.id] = n;
        });
        TSC.notes.saveAll(Object.keys(map).map(function (k) { return map[k]; }));
      }
      if (data.progress) TSC.store.set("progress", data.progress);
      if (data.quizHistory) TSC.store.set("quizHistory", data.quizHistory);
      return TSC.notes.all().length;
    }
  };
})();
