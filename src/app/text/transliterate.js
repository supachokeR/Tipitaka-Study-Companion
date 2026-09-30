var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var CONS = [
    ["kh", "ข"], ["gh", "ฆ"], ["ch", "ฉ"], ["jh", "ฌ"],
    ["ṭh", "ฐ"], ["ḍh", "ฒ"], ["th", "ถ"], ["dh", "ธ"],
    ["ph", "ผ"], ["bh", "ภ"],
    ["k", "ก"], ["g", "ค"], ["ṅ", "ง"], ["c", "จ"], ["j", "ช"], ["ñ", "ญ"],
    ["ṭ", "ฏ"], ["ḍ", "ฑ"], ["ṇ", "ณ"], ["t", "ต"], ["d", "ท"], ["n", "น"],
    ["p", "ป"], ["b", "พ"], ["m", "ม"], ["y", "ย"], ["r", "ร"], ["l", "ล"],
    ["v", "ว"], ["s", "ส"], ["h", "ห"], ["ḷ", "ฬ"]
  ];
  var VOWELS = { a: 1, ā: 1, i: 1, ī: 1, u: 1, ū: 1, e: 1, o: 1 };

  function tokenizeWord(word) {
    var s = word.normalize("NFC").toLowerCase()
      .replace(/ṁ/g, "ṃ")
      .replace(/\u1e43/g, "ṃ")
      .replace(/-/g, "");
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch === "ṃ") {
        tokens.push({ t: "nig" });
        i += 1;
        continue;
      }
      if (VOWELS[ch]) {
        tokens.push({ t: "v", v: ch });
        i += 1;
        continue;
      }
      var matched = false;
      for (var c = 0; c < CONS.length; c++) {
        if (s.startsWith(CONS[c][0], i)) {
          tokens.push({ t: "c", th: CONS[c][1] });
          i += CONS[c][0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        throw new Error("อักขระที่ทับศัพท์ไม่ได้: " + JSON.stringify(s.slice(i, i + 4)) + " ใน " + word);
      }
    }
    return tokens;
  }

  function renderAkshara(cons, vowel, nig) {
    var mark = nig ? "\u0E4D" : "";
    if (!cons.length) {
      var ind = { a: "อ", ā: "อา", i: "อิ", ī: "อี", u: "อุ", ū: "อู", e: "เอ", o: "โอ" };
      return ind[vowel] + mark;
    }
    var lead = "";
    for (var i = 0; i < cons.length - 1; i++) lead += cons[i].th + "\u0E3A";
    var main = cons[cons.length - 1].th;
    if (vowel === "e") return lead + "เ" + main + mark;
    if (vowel === "o") return lead + "โ" + main + mark;
    var sign = { a: "", ā: "า", i: "ิ", ī: "ี", u: "ุ", ū: "ู" };
    return lead + main + sign[vowel] + mark;
  }

  function renderTokens(tokens) {
    var out = "";
    var i = 0;
    while (i < tokens.length) {
      var cons = [];
      while (i < tokens.length && tokens[i].t === "c") cons.push(tokens[i++]);
      var vowel = "a";
      var explicit = false;
      if (i < tokens.length && tokens[i].t === "v") {
        vowel = tokens[i].v;
        explicit = true;
        i += 1;
      }
      var nig = false;
      if (i < tokens.length && tokens[i].t === "nig") {
        nig = true;
        i += 1;
      }
      if (!cons.length && !explicit) {
        if (nig) {
          out += "อ\u0E4D";
          continue;
        }
        throw new Error("ลำดับทับศัพท์ไม่ถูกต้อง");
      }
      out += renderAkshara(cons, vowel, nig);
    }
    return out;
  }

  var ALLOWED_MARK = /^[\d.,;:?!“”‘’"'()[\]…—–]+$/u;

  function transliterateToken(token) {
    var joined = token.replace(/(\p{L})-(\p{L})/gu, "$1$2");
    var bits = joined.split(/(\P{L}+)/u);
    var out = "";
    for (var i = 0; i < bits.length; i++) {
      var bit = bits[i];
      if (!bit) continue;
      if (/^\P{L}+$/u.test(bit)) {
        if (!ALLOWED_MARK.test(bit)) {
          throw new Error("อักขระที่ทับศัพท์ไม่ได้: " + JSON.stringify(bit));
        }
        out += bit;
      } else out += renderTokens(tokenizeWord(bit));
    }
    return out;
  }

  TSC.transliterate = function (input) {
    if (typeof input !== "string") throw new TypeError("transliterate รับเฉพาะสตริง");
    return input.split(/(\s+)/).map(function (part) {
      if (!part || /^\s+$/.test(part)) return part;
      return transliterateToken(part);
    }).join("");
  };
})();
