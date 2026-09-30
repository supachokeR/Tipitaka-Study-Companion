var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var token = 0;
  var chunks = [];
  var index = 0;
  var nodes = [];
  var active = false;
  var paused = false;
  var advancing = false;
  var continuous = false;

  function rate() {
    var saved = TSC.store.get("ttsRate", "1");
    return saved === "1.5" || saved === "2" ? Number(saved) : 1;
  }

  function voices() {
    var synth = globalThis.speechSynthesis;
    if (!synth || !synth.getVoices) return [];
    return synth.getVoices() || [];
  }

  function thaiVoice(list) {
    return (list || []).find(function (v) { return String(v.lang || "").toLowerCase().indexOf("th") === 0; });
  }

  function waitVoices() {
    var synth = globalThis.speechSynthesis;
    if (!synth) return Promise.resolve([]);
    var current = voices();
    if (current.length) return Promise.resolve(current);
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve(voices());
      }
      var timer = setTimeout(finish, 1500);
      synth.addEventListener("voiceschanged", function () {
        clearTimeout(timer);
        finish();
      }, { once: true });
    });
  }

  function clearMark() {
    nodes.forEach(function (n) { n.classList.remove("is-reading"); });
  }

  function mark(paragraphIndex) {
    clearMark();
    var node = nodes[paragraphIndex];
    if (!node) return;
    node.classList.add("is-reading");
    if (node.scrollIntoView) node.scrollIntoView({ block: "center" });
  }

  function showBar(on) {
    var bar = document.getElementById("tts-bar");
    if (!bar) return;
    bar.hidden = !on;
    document.body.classList.toggle("tts-on", on);
  }

  function paintRate() {
    var current = String(rate());
    document.querySelectorAll("[data-rate]").forEach(function (btn) {
      var on = btn.getAttribute("data-rate") === current;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("bg-[#F97316]", on);
      btn.classList.toggle("text-white", on);
    });
    var label = document.getElementById("tts-toggle");
    if (label) {
      var name = active ? "หยุดชั่วคราว" : "อ่านต่อ";
      label.textContent = name;
      label.setAttribute("aria-label", name);
    }
  }

  function restOfPage() {
    var all = Array.from(document.querySelectorAll("#reader .tts-p")).filter(function (n) {
      return (n.textContent || "").trim();
    });
    var last = nodes[nodes.length - 1];
    var at = all.indexOf(last);
    return at >= 0 ? all.slice(at + 1) : [];
  }

  function nextHash() {
    var data = TSC.DATA || {};
    var route = TSC.parseHash(location.hash || "#/");
    var units = (data.units || []).slice().sort(function (a, b) {
      return a.volume - b.volume || a.order - b.order;
    });
    var ready = (data.volumes || []).filter(function (v) { return v.status === "ready"; });
    if (route.name === "unit") {
      var vol = Number(route.params[0]);
      var list = units.filter(function (u) { return u.volume === vol; });
      var at = list.findIndex(function (u) { return u.id === route.params[2]; });
      if (at >= 0 && list[at + 1]) {
        var n = list[at + 1];
        return "#/vol/" + n.volume + "/" + n.sectionId + "/" + n.id;
      }
      var later = ready.find(function (v) { return v.n > vol; });
      return later ? "#/vol/" + later.n : null;
    }
    if (route.name === "volume") {
      var volN = Number(route.params[0]);
      var first = units.find(function (u) { return u.volume === volN; });
      if (first) return "#/vol/" + first.volume + "/" + first.sectionId + "/" + first.id;
      var nextVol = ready.find(function (v) { return v.n > volN; });
      return nextVol ? "#/vol/" + nextVol.n : null;
    }
    if (route.name === "home" || route.name === "pitaka") {
      return ready.length ? "#/vol/" + ready[0].n : null;
    }
    return null;
  }

  function goNextPage() {
    var href = nextHash();
    if (!href) return false;
    advancing = true;
    token += 1;
    active = false;
    paused = false;
    if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
    if (location.hash === href) TSC.render();
    else location.hash = href;
    return true;
  }

  function continueForward() {
    if (!continuous) {
      TSC.tts.stop();
      return;
    }
    var rest = restOfPage();
    if (rest.length) {
      TSC.tts.playNodes(rest);
      return;
    }
    if (!goNextPage()) TSC.tts.stop();
  }

  function speakAt(i) {
    var synth = globalThis.speechSynthesis;
    if (!synth || i < 0 || i >= chunks.length) {
      TSC.tts.stop();
      return;
    }
    index = i;
    var my = ++token;
    mark(chunks[i].paragraphIndex);
    var Utter = globalThis.SpeechSynthesisUtterance;
    var u = new Utter(chunks[i].text);
    u.lang = "th-TH";
    u.rate = rate();
    var voice = thaiVoice(voices());
    if (voice) u.voice = voice;
    u.onend = function () {
      if (my !== token) return;
      if (index + 1 < chunks.length) speakAt(index + 1);
      else continueForward();
    };
    active = true;
    showBar(true);
    paintRate();
    synth.speak(u);
  }

  TSC.tts = {
    rate: rate,
    takeAdvance: function () {
      var carry = advancing;
      advancing = false;
      return carry;
    },
    stop: function () {
      token += 1;
      active = false;
      paused = false;
      advancing = false;
      continuous = false;
      clearMark();
      showBar(false);
      if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      paintRate();
    },
    pause: function () {
      if (!chunks.length) return;
      if (paused || !active) {
        paused = false;
        speakAt(index);
        return;
      }
      paused = true;
      active = false;
      token += 1;
      if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      showBar(true);
      paintRate();
    },
    setRate: function (value) {
      var allowed = value === 1.5 || value === 2 || value === "1.5" || value === "2" ? String(value) : "1";
      TSC.store.set("ttsRate", allowed);
      paintRate();
      if (!document.getElementById("tts-bar") || document.getElementById("tts-bar").hidden) return;
      var keep = index;
      token += 1;
      if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      speakAt(keep);
    },
    prev: function () {
      if (!chunks.length) return;
      token += 1;
      paused = false;
      if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      speakAt(Math.max(0, index - 1));
    },
    next: function () {
      if (!chunks.length) return;
      token += 1;
      paused = false;
      if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      if (index + 1 < chunks.length) speakAt(index + 1);
      else continueForward();
    },
    playNodes: function (paragraphNodes) {
      nodes = paragraphNodes.filter(function (n) { return (n.textContent || "").trim(); });
      var texts = nodes.map(function (n) { return n.textContent.trim(); });
      chunks = TSC.chunkParagraphs(texts);
      if (!chunks.length) return;
      waitVoices().then(function (list) {
        if (!thaiVoice(list)) {
          TSC.modal.voiceHelp();
          return;
        }
        speakAt(0);
      });
    },
    readPage: function () {
      continuous = true;
      TSC.tts.readSelector(document.getElementById("reader"), { keep: true });
    },
    readSelector: function (root, opts) {
      var scope = root || document.getElementById("reader");
      if (!opts || !opts.keep) continuous = scope.id === "reader";
      TSC.tts.playNodes(Array.from(scope.querySelectorAll(".tts-p")));
    }
  };
})();
