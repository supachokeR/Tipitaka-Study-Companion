import assert from "node:assert/strict";
import test from "node:test";
import { loadSrc } from "./helpers/load-src.mjs";

function memoryStorage(initial) {
  const mem = { ...initial };
  return {
    getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem(k, v) { mem[k] = String(v); },
    removeItem(k) { delete mem[k]; }
  };
}

const TSC = loadSrc([
  "src/app/text/cite.js",
  "src/app/text/chunk.js"
]);

test("parser sya และสืบหน้า", () => {
  const hit = TSC.parseSya("bj1.2, sya1.1, vri87.1");
  assert.equal(hit.volume, 1);
  assert.equal(hit.page, 1);
  assert.equal(hit.raw, "sya1.1");
  assert.equal(TSC.parseSya("mc2.427"), null);
  assert.equal(TSC.parseSya("pli-tv-bu-vb-np1:0.6 sya2.1").page, 1);
  assert.equal(TSC.parseSya("sya2.571").volume, 2);
  assert.equal(TSC.parseSya("sya12.103").page, 103);
  const pages = TSC.pagesForSegments([
    { id: "a", ref: "sya1.1" },
    { id: "b", ref: "" },
    { id: "c", ref: "sya1.2" }
  ]);
  assert.equal(pages[1].pageFrom, "carry");
  assert.equal(pages[1].page, 1);
  assert.equal(pages[2].pageFrom, "break");
  const none = TSC.pagesForSegments([{ id: "z", ref: "" }]);
  assert.equal(none[0].page, null);
});

test("chunk ไม่เกิน 200 และต่อครบ", () => {
  const long = "ก".repeat(450);
  const spaced = ("พระวินัย ".repeat(40)).trim();
  const chunks = TSC.chunkParagraphs(["สั้น", long, spaced]);
  assert.ok(chunks.every((c) => c.text.length <= 200));
  const back = ["", "", ""];
  for (const c of chunks) back[c.paragraphIndex] += c.text;
  assert.equal(back[0], "สั้น");
  assert.equal(back[1], long);
  assert.equal(back[2], spaced);
});

test("store ครอบ localStorage ที่ใช้ไม่ได้", () => {
  const ok = loadSrc(["src/app/core/store.js"], { localStorage: memoryStorage() });
  assert.equal(ok.store.set("ttsRate", "1.5"), true);
  assert.equal(ok.store.get("ttsRate", "1"), "1.5");
  const denied = loadSrc(["src/app/core/store.js"], {
    localStorage: {
      getItem() { throw new Error("denied"); },
      setItem() { throw new Error("denied"); },
      removeItem() { throw new Error("denied"); }
    }
  });
  assert.equal(denied.store.set("notes", [{ id: "a" }]), false);
  assert.deepEqual(denied.store.get("notes", []), [{ id: "a" }]);
});
