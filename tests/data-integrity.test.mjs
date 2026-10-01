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
const root = path.resolve("tools/raw/bilara/root/pli/ms");
const fileIndex = new Map();
function indexFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) indexFiles(full);
    else if (entry.name.endsWith("_root-pli-ms.json")) fileIndex.set(entry.name, full);
  }
}
indexFiles(root);

function fileFor(scId) {
  let name = scId + "_root-pli-ms.json";
  if (scId.startsWith("pli-tv-bu-vb-as")) name = "pli-tv-bu-vb-as1-7_root-pli-ms.json";
  if (scId.startsWith("pli-tv-bi-vb-as")) name = "pli-tv-bi-vb-as1-7_root-pli-ms.json";
  return fileIndex.get(name);
}

test("โครงเล่ม ๑–๒ และ crosswalk", () => {
  assert.equal(data.units.filter((u) => u.volume === 1).length, 19);
  assert.equal(data.units.filter((u) => u.volume === 2).length, 208);
  assert.ok(data.crosswalk.some((c) => c.scId === "mn10" && c.volume === 12 && c.scUid === "MN 10"));
  assert.ok(data.glossary.length >= 40);
  assert.ok(data.quiz.filter((q) => q.scope === "vol-1").length >= 30);
  assert.ok(data.quiz.filter((q) => q.scope === "vol-2").length >= 40);
  assert.ok(data.quiz.filter((q) => q.scope === "vol-3").length >= 30);
  for (const n of [6, 7, 8]) {
    assert.ok(data.units.filter((u) => u.volume === n).length >= 10, "vol " + n);
    assert.ok(data.quiz.filter((q) => q.scope === "vol-" + n).length >= 20, "quiz " + n);
  }
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
    for (const dhammaId of unit.dhammaIds || []) {
      assert.ok(data.dhammas.some((d) => d.id === dhammaId), dhammaId);
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
    if (q.ref.unitId === null) assert.ok(q.ref.href, q.id);
    else assert.ok(data.units.some((u) => u.id === q.ref.unitId), q.id);
    assert.ok(q.choices.includes(q.answer) && new Set(q.choices).size === q.choices.length, q.id);
  }
  for (const scope of ["dhamma", "people", "places", "glossary"]) {
    assert.ok(data.quiz.filter((q) => q.scope === scope).length >= 100, scope);
  }
});

test("หมวดวินัยและผู้เกี่ยวข้องในเรื่องเกิด", () => {
  const unitIds = new Set(data.units.map((u) => u.id));
  assert.ok(data.vinayaTopics.length >= 18);
  for (const t of data.vinayaTopics) {
    assert.ok(t.categoryTh && t.summaryTh && t.groups.length, t.id);
    for (const id of t.unitIds) {
      assert.ok(unitIds.has(id), t.id + " " + id);
      assert.ok(data.units.find((u) => u.id === id).volume <= 8, t.id + " " + id);
    }
  }
  const counts = data.vinayaTopics.find((t) => t.id === "sikkhapada").groups;
  const sum = (g) => g.items.reduce((a, s) => a + Number(s.split(" ").pop().replace(/[๐-๙]/g, (d) => "๐๑๒๓๔๕๖๗๘๙".indexOf(d))), 0);
  assert.equal(sum(counts[0]), 227);
  assert.equal(sum(counts[1]), 311);
  const cast = data.units.filter((u) => u.volume <= 3 && u.summary.includes("ผู้เกี่ยวข้องในเรื่องเกิดตามตัวบท"));
  assert.ok(cast.length >= 200);
  const peopleIds = new Set(data.people.map((p) => p.id));
  for (const u of cast) for (const id of u.people) assert.ok(peopleIds.has(id), u.id + " " + id);
});

test("สถานที่ ศัพท์ และเรื่องย่อมัชฌิมนิกาย", () => {
  const unitIds = new Set(data.units.map((u) => u.id));
  const placeIds = new Set(data.places.map((p) => p.id));
  assert.ok(data.places.length >= 25);
  for (const p of data.places) {
    assert.ok(p.map && p.blurbTh, p.id);
    assert.ok(p.episodes.length > 0, "no episode " + p.id);
    for (const ep of p.episodes) assert.ok(unitIds.has(ep.unitId), p.id + " " + ep.unitId);
  }
  for (const u of data.units) for (const id of u.places) assert.ok(placeIds.has(id), u.id + " " + id);
  for (const ev of data.timeline) {
    if (ev.unitId) assert.ok(unitIds.has(ev.unitId), ev.id);
    if (ev.placeId) assert.ok(placeIds.has(ev.placeId), ev.id);
  }
  assert.ok(data.timeline.length >= 20);
  const dhammaIds = new Set(data.dhammas.map((d) => d.id));
  const terms = data.glossary.filter((g) => g.groupTh === "ธรรม");
  assert.ok(terms.length >= 60);
  for (const g of terms) assert.ok(dhammaIds.has(g.dhammaId), g.id);
  for (let n = 1; n <= 152; n++) {
    const u = data.units.find((x) => x.scId === "mn" + n);
    assert.ok(u, "mn" + n);
    assert.ok(!u.summary.includes("ชื่อในต้นฉบับอ่านเป็นไทยว่า"), "mn" + n + " has only a structural note");
  }
});

test("บุคคลและหมวดธรรมชี้ไปบทที่มีจริง", () => {
  const unitIds = new Set(data.units.map((u) => u.id));
  assert.ok(data.people.length >= 150);
  for (const person of data.people) {
    assert.ok(person.episodes.length > 0, "no episode " + person.id);
    for (const ep of person.episodes) {
      if (ep.unitId) assert.ok(unitIds.has(ep.unitId), person.id + " " + ep.unitId);
      else assert.ok(ep.volume >= 1 && ep.volume <= 45, person.id + " volume");
      assert.ok(ep.cite && ep.cite.includes(" · "), person.id + " cite");
    }
  }
  const cites = data.people.flatMap((p) => p.episodes).map((ep) => ep.cite).join("\n");
  for (let n = 188; n <= 267; n++) {
    assert.ok(cites.includes("an1." + n + ":1.1"), "etadagga an1." + n);
  }
  assert.ok(data.dhammas.length >= 30);
  for (const d of data.dhammas) {
    assert.ok(d.categoryTh, d.id);
    assert.ok(d.unitIds.length > 0, "no unit " + d.id);
    for (const id of d.unitIds) assert.ok(unitIds.has(id), d.id + " " + id);
    for (const id of d.relatedIds) assert.ok(data.dhammas.some((x) => x.id === id), d.id + " -> " + id);
  }
});
