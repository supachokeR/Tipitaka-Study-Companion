var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var index = null;

  function fold(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[\u200b-\u200d]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function push(rows, type, title, text, route) {
    rows.push({ type: type, title: title, text: String(text || ""), route: route, folded: fold(title + " " + text) });
  }

  TSC.search = {
    build: function () {
      if (index) return index;
      var data = TSC.DATA;
      var rows = [];
      (data.volumes || []).forEach(function (vol) {
        push(rows, "เล่ม", vol.titleTh, vol.overview || "", "#/vol/" + vol.n);
      });
      (data.units || []).forEach(function (u) {
        var blob = [u.titleTh, u.titleRoman, u.summary, u.scId].join(" ");
        (u.passages || []).forEach(function (p) {
          blob += " " + p.paliRoman + " " + (p.paraphraseTh || "") + " " + p.scSegment;
          if (p.cite && p.cite.page != null) blob += " sya" + p.cite.volume + "." + p.cite.page;
        });
        push(rows, "สิกขาบท", u.titleTh, blob, "#/vol/" + u.volume + "/" + u.sectionId + "/" + u.id);
      });
      (data.people || []).forEach(function (p) {
        push(rows, "บุคคล", p.names.th, p.names.roman + " " + (p.blurb || ""), "#/people/" + p.id);
      });
      (data.places || []).forEach(function (p) {
        push(rows, "สถานที่", p.names.th, p.names.roman + " " + (p.blurbTh || ""), "#/place/" + p.id);
      });
      (data.glossary || []).forEach(function (g) {
        push(rows, "ศัพท์", g.roman, g.glossTh, "#/glossary/" + g.id);
      });
      (data.crosswalk || []).forEach(function (c) {
        push(rows, "รหัส", c.scUid + " " + c.scId, c.sigla + " เล่ม " + c.volume + " " + (c.titleTh || ""), "#/vol/" + c.volume);
      });
      (data.vinayaTopics || []).forEach(function (d) {
        var blob = d.summaryTh + " " + (d.groups || []).map(function (g) { return g.titleTh + " " + (g.body || "") + " " + (g.items || []).join(" "); }).join(" ");
        push(rows, "หมวดวินัย", d.titleTh, blob, "#/vinaya/" + d.id);
      });
      (data.dhammas || []).forEach(function (d) {
        push(rows, "หมวดธรรม", d.titleTh, d.summaryTh, "#/dhamma/" + d.id);
      });
      index = rows;
      return rows;
    },
    query: function (q) {
      var folded = fold(q);
      if (!folded) return [];
      var hits = TSC.search.build().filter(function (row) {
        return row.folded.indexOf(folded) !== -1 || fold(row.text).indexOf(folded) !== -1;
      });
      TSC.notes.search(q).forEach(function (n) {
        hits.push({ type: "โน้ต", title: n.title || "โน้ต", text: n.body, route: "#/notes", folded: fold(n.title + " " + n.body) });
      });
      return hits.slice(0, 80);
    }
  };
})();
