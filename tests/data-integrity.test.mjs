import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadSrc } from "./helpers/load-src.mjs";

const TSC = loadSrc([
  "src/app/text/transliterate.js",
  "src/data/generated/data.js"
]);
const data = TSC.DATA;
const root = path.resolve("tools/raw/bilara/root/pli/ms/vinaya");

function fileFor(scId) {
  let name = scId + "_root-pli-ms.json";
  if (scId.startsWith("pli-tv-bu-vb-as")) name = "pli-tv-bu-vb-as1-7_root-pli-ms.json";
  if (scId.startsWith("pli-tv-bi-vb-as")) name = "pli-tv-bi-vb-as1-7_root-pli-ms.json";
  const hits = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === name) hits.push(full);
    }
  };
  walk(root);
  return hits[0];
}

test("โครงเล่ม ๑–๒ และ crosswalk", () => {
  assert.equal(data.units.filter((u) => u.volume === 1).length, 19);
  assert.equal(data.units.filter((u) => u.volume === 2).length, 208);
  assert.ok(data.crosswalk.some((c) => c.scId === "mn10" && c.volume === 12 && c.scUid === "MN 10"));
  assert.ok(data.glossary.length >= 40);
  assert.ok(data.quiz.filter((q) => q.scope === "vol-1").length >= 30);
  assert.ok(data.quiz.filter((q) => q.scope === "vol-2").length >= 40);
  assert.ok(data.quiz.filter((q) => q.scope === "vol-3").length >= 30);
  const vol3 = data.units.filter((u) => u.volume === 3);
  assert.ok(vol3.length >= 100);
  assert.ok(vol3.every((u) => String(u.scId).startsWith("pli-tv-bi-vb-")));
});

test("checksum บาลีตรงไฟล์ต้นฉบับ และเลข sya ตรงเล่ม", () => {
  const cache = new Map();
  for (const unit of data.units) {
    assert.ok(unit.volume && unit.scId);
    for (const personId of unit.people) {
      assert.ok(data.people.some((p) => p.id === personId), personId);
    }
    for (const passage of unit.passages) {
      assert.equal(crypto.createHash("sha256").update(passage.paliRoman).digest("hex"), passage.sha256);
      if (!cache.has(unit.scId)) cache.set(unit.scId, JSON.parse(fs.readFileSync(fileFor(unit.scId), "utf8")));
      const raw = cache.get(unit.scId)[passage.scSegment];
      assert.equal(raw, passage.paliRoman, passage.scSegment);
      TSC.transliterate(passage.paliRoman.replace(/<[^>]+>/g, ""));
      if (passage.cite.page != null) assert.equal(passage.cite.volume, unit.volume);
      assert.equal(passage.cite.item, null);
    }
    for (const q of data.quiz.filter((item) => item.ref.unitId === unit.id)) {
      assert.equal(q.ref.unitId, unit.id);
    }
  }
  for (const q of data.quiz) {
    assert.ok(data.units.some((u) => u.id === q.ref.unitId));
  }
});
