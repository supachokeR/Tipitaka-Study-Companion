import assert from "node:assert/strict";
import test from "node:test";
import { loadApp, makeSpeech, tick } from "./helpers/load-app.mjs";

test("กด ×1.5 ระหว่างอ่านแล้วเริ่มชิ้นเดิมด้วย rate 1.5", async () => {
  const speech = makeSpeech();
  const { window } = loadApp("#/vol/1/parajika/pj1", { speech });
  await tick();
  window.document.getElementById("read-page").click();
  await tick();
  assert.ok(speech.synth.spoken.length >= 1);
  const current = speech.synth.spoken.at(-1).text;
  const before = speech.synth.cancelled;
  window.document.querySelector("[data-rate='1.5']").click();
  await tick();
  assert.ok(speech.synth.cancelled > before);
  const next = speech.synth.spoken.at(-1);
  assert.equal(next.text, current);
  assert.equal(next.rate, 1.5);
});

test("จำความเร็วและโหลดกลับ", async () => {
  const memoryStorage = {
    mem: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this.mem, k) ? this.mem[k] : null; },
    setItem(k, v) { this.mem[k] = String(v); },
    removeItem(k) { delete this.mem[k]; },
    clear() { this.mem = {}; },
    key(i) { return Object.keys(this.mem)[i] || null; },
    get length() { return Object.keys(this.mem).length; }
  };
  const speech = makeSpeech();
  const first = loadApp("#/vol/1", { speech, memoryStorage });
  await tick();
  first.window.document.getElementById("read-page").click();
  await tick();
  first.window.document.querySelector("[data-rate='1.5']").click();
  assert.equal(JSON.parse(memoryStorage.getItem("tsc:v1:ttsRate")), "1.5");
  const second = loadApp("#/", { memoryStorage });
  await tick();
  const button = second.window.document.querySelector("[data-rate='1.5']");
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.ok(button.className.includes("bg-[#F97316]"));
});

test("อ่านทั้งหน้าแล้วไปบทถัดไปต่อ", async () => {
  const speech = makeSpeech();
  const { window } = loadApp("#/vol/1/parajika/pj1", { speech });
  await tick();
  window.document.getElementById("read-page").click();
  await tick();
  let guard = 0;
  while (window.location.hash.indexOf("pj1") !== -1 && guard < 400) {
    const utterance = speech.synth.spoken.at(-1);
    if (utterance && utterance.onend) utterance.onend();
    await tick();
    guard += 1;
  }
  assert.ok(window.location.hash.includes("pj2"));
  assert.ok(speech.synth.spoken.length > 1);
});

test("เปลี่ยนหน้าแล้ว cancel", async () => {
  const speech = makeSpeech();
  const { window } = loadApp("#/vol/1", { speech });
  await tick();
  const before = speech.synth.cancelled;
  window.location.hash = "#/about";
  await tick();
  assert.ok(speech.synth.cancelled > before);
});

test("ไม่มีเสียงไทยแล้วแสดงวิธีติดตั้ง", async () => {
  const speech = makeSpeech([{ lang: "en-US", name: "English" }]);
  const { window } = loadApp("#/vol/1", { speech });
  await tick();
  window.document.getElementById("read-page").click();
  await tick();
  const modal = window.document.getElementById("modal-root").textContent;
  for (const label of ["Windows", "macOS", "iOS", "Android"]) {
    assert.ok(modal.includes(label), label);
  }
  assert.equal(speech.synth.spoken.length, 0);
});
