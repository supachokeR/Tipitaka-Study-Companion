var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  TSC.MAX_CHUNK = 200;

  function boundaries(text) {
    var points = [0, text.length];
    var i;
    for (i = 0; i < text.length; i++) {
      if (text[i] === " ") points.push(i + 1);
    }
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      var seg = new Intl.Segmenter("th", { granularity: "word" });
      var pos = 0;
      var parts = seg.segment(text);
      var step = parts[Symbol.iterator]();
      var n = step.next();
      while (!n.done) {
        pos += n.value.segment.length;
        points.push(pos);
        n = step.next();
      }
    }
    points.sort(function (a, b) { return a - b; });
    var uniq = [];
    for (i = 0; i < points.length; i++) {
      if (!uniq.length || uniq[uniq.length - 1] !== points[i]) uniq.push(points[i]);
    }
    return uniq;
  }

  function splitLong(text, max) {
    if (text.length <= max) return [text];
    var points = boundaries(text);
    var parts = [];
    var start = 0;
    while (start < text.length) {
      if (text.length - start <= max) {
        parts.push(text.slice(start));
        break;
      }
      var limit = start + max;
      var cut = -1;
      for (var i = 0; i < points.length; i++) {
        if (points[i] > start && points[i] <= limit) cut = points[i];
      }
      if (cut === -1 || cut === start) cut = limit;
      parts.push(text.slice(start, cut));
      start = cut;
    }
    return parts;
  }

  TSC.chunkParagraphs = function (paragraphs, max) {
    var limit = max || TSC.MAX_CHUNK;
    var out = [];
    for (var p = 0; p < paragraphs.length; p++) {
      var text = paragraphs[p] == null ? "" : String(paragraphs[p]);
      if (!text) continue;
      var pieces = splitLong(text, limit);
      for (var i = 0; i < pieces.length; i++) {
        out.push({ paragraphIndex: p, text: pieces[i] });
      }
    }
    return out;
  };
})();
