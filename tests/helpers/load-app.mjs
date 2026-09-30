import fs from "node:fs";
import { JSDOM } from "jsdom";

export function makeSpeech(voices = [{ lang: "th-TH", name: "Thai" }]) {
  const synth = {
    cancelled: 0,
    spoken: [],
    paused: false,
    speaking: false,
    getVoices() { return voices; },
    addEventListener() {},
    cancel() { this.cancelled += 1; this.speaking = false; },
    speak(utterance) { this.spoken.push(utterance); this.speaking = true; },
    pause() { this.paused = true; },
    resume() { this.paused = false; }
  };
  class Utter {
    constructor(text) {
      this.text = text;
      this.rate = 1;
      this.lang = "";
      this.onend = null;
    }
  }
  return { synth, Utter };
}

export function loadApp(hash = "#/", options = {}) {
  const html = fs.readFileSync(new URL("../../tipitaka-study.html", import.meta.url), "utf8");
  const speech = options.speech || makeSpeech(options.voices);
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/" + hash,
    pretendToBeVisual: true,
    beforeParse(window) {
      window.speechSynthesis = speech.synth;
      window.SpeechSynthesisUtterance = speech.Utter;
      window.HTMLElement.prototype.scrollIntoView = function () {};
      if (options.memoryStorage) {
        Object.defineProperty(window, "localStorage", { configurable: true, value: options.memoryStorage });
      }
    }
  });
  return { dom, window: dom.window, speech };
}

export function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
