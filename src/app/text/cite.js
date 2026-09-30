var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  TSC.parseSya = function (refString) {
    if (!refString) return null;
    var m = String(refString).match(/\bsya(\d+)\.(\d+)\b/);
    if (!m) return null;
    return { volume: Number(m[1]), page: Number(m[2]), raw: m[0] };
  };

  TSC.pagesForSegments = function (rows) {
    var last = null;
    return rows.map(function (row) {
      var hit = TSC.parseSya(row.ref || "");
      if (hit) {
        last = { volume: hit.volume, page: hit.page };
        return { id: row.id, volume: hit.volume, page: hit.page, pageFrom: "break" };
      }
      if (last) {
        return { id: row.id, volume: last.volume, page: last.page, pageFrom: "carry" };
      }
      return { id: row.id, volume: null, page: null, pageFrom: null };
    });
  };

  TSC.formatCite = function (cite) {
    if (!cite) return "";
    var page = cite.page == null ? "ไม่มีเลขหน้าในไฟล์อ้างอิง" : "หน้า " + cite.page;
    var vol = cite.volume == null ? "" : "เล่ม " + cite.volume + " ";
    return [cite.sigla, vol + page, cite.scSegment].filter(Boolean).join(" · ");
  };
})();
