var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var token = 0;
  var chunks = [];
  var index = 0;
  var nodes = [];
  var active = false;

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
      var name = active ? "หยุดชั่วคราว" : "เล่น";
      label.textContent = name;
      label.setAttribute("aria-label", name);
    }
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
      else TSC.tts.stop();
    };
    active = true;
    showBar(true);
    paintRate();
    synth.speak(u);
  }

  TSC.tts = {
    rate: rate,
    stop: function () {
      token += 1;
      active = false;
      clearMark();
      showBar(false);
      if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel();
      paintRate();
    },
    pause: function () {
      var synth = globalThis.speechSynthesis;
      if (!synth) return;
      if (synth.paused) {
        synth.resume();
        active = true;
      } else {
        synth.pause();
        active = false;
      }
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
    prev: function () { if (chunks.length) { token += 1; if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel(); speakAt(Math.max(0, index - 1)); } },
    next: function () { if (chunks.length) { token += 1; if (globalThis.speechSynthesis) globalThis.speechSynthesis.cancel(); speakAt(Math.min(chunks.length - 1, index + 1)); } },
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
    readSelector: function (root) {
      var scope = root || document.getElementById("reader");
      TSC.tts.playNodes(Array.from(scope.querySelectorAll(".tts-p")));
    }
  };
})();
