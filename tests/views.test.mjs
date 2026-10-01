import assert from "node:assert/strict";
import test from "node:test";
import { loadApp, tick } from "./helpers/load-app.mjs";

const routes = [
  ["#/", "ศึกษาพระไตรปิฎก"],
  ["#/pitaka/vinaya", "วินัยปิฎก"],
  ["#/vol/1", "มหาวิภังค์"],
  ["#/vol/1/parajika/pj1", "ปาราชิก"],
  ["#/people", "บุคคล"],
  ["#/people/buddha", "พระผู้มีพระภาค"],
  ["#/people/sariputta", "อัสสชิ"],
  ["#/people/devadatta", "นาฬาคิรี"],
  ["#/dhamma", "หมวดธรรม"],
  ["#/dhamma/sacca", "อริยสัจ"],
  ["#/dhamma/bodhi", "โพชฌงค์"],
  ["#/dhamma/paticca", "อวิชชา"],
  ["#/dhamma/satipatthana", "MN 10"],
  ["#/dhamma/khandha", "วิญญาณ"],
  ["#/dhamma/disa", "มารดาบิดา"],
  ["#/dhamma/paccaya", "เหตุปัจจัย"],
  ["#/dhamma/anapanasati", "ปุพพาราม"],
  ["#/people/angulimala", "เราหยุดแล้ว"],
  ["#/people/khema", "เอตทัคคะ"],
  ["#/people/mara", "ปาวาลเจดีย์"],
  ["#/vinaya", "อาบัติเจ็ดกอง"],
  ["#/vinaya/garudhamma", "ร้อยพรรษา"],
  ["#/vinaya/sangiti", "วัตถุสิบ"],
  ["#/pitaka/vinaya", "หมวดวินัย"],
  ["#/vol/2/pacittiya/pc51", "พระสาคตะ"],
  ["#/people/thullananda", "พหูสูต"],
  ["#/map", "ชมพูทวีป"],
  ["#/map", "ปรินิพพานที่กุสินารา"],
  ["#/place/kusinara", "สาละคู่"],
  ["#/place/kammasadhamma", "เล่ม 12"],
  ["#/glossary", "ศัพท์"],
  ["#/glossary/sotapanna", "สังโยชน์ ๑๐"],
  ["#/vol/13/corpus-13/mn86", "เราหยุดแล้ว"],
  ["#/quiz", "บุคคลและเอตทัคคะ"],
  ["#/quiz/people", "1. "],
  ["#/glossary/parajika", "ปาราชิก"],
  ["#/plan", "เส้นทาง ค"],
  ["#/search?q=MN%2010", "สติปัฏฐาน"],
  ["#/quiz", "แบบทดสอบ"],
  ["#/progress", "ความคืบหน้า"],
  ["#/notes", "โน้ต"],
  ["#/about", "ลิขสิทธิ์"]
];

test("ทุก view หลักแสดงหัวเรื่อง", async () => {
  const { window } = loadApp("#/");
  for (const [hash, text] of routes) {
    window.location.hash = hash;
    await tick();
    const reader = window.document.getElementById("reader").textContent;
    assert.ok(reader.includes(text), hash + " missing " + text);
  }
  assert.equal(window.document.querySelector("footer").textContent, "supachoke acadamy");
});

test("สลับโหมดมืดและจำค่าไว้", async () => {
  const { window } = loadApp("#/");
  await tick();
  const root = window.document.documentElement;
  const btn = window.document.getElementById("theme-toggle");
  assert.equal(root.dataset.theme, "light");
  btn.click();
  assert.equal(root.dataset.theme, "dark");
  assert.equal(btn.getAttribute("aria-pressed"), "true");
  assert.equal(window.localStorage.getItem("tsc:v1:theme"), JSON.stringify("dark"));
  btn.click();
  assert.equal(root.dataset.theme, "light");
});

test("ก่อนหน้าถัดไปและค้นรหัสสิกขาบท", async () => {
  const { window } = loadApp("#/vol/1/parajika/pj1");
  await tick();
  const reader = window.document.getElementById("reader");
  assert.ok(reader.textContent.includes("ถัดไป"));
  window.location.hash = "#/search?q=" + encodeURIComponent("pli-tv-bu-vb-pj1");
  await tick();
  assert.ok(window.document.getElementById("reader").textContent.includes("ปาราชิก"));
});

test("โน้ตสร้าง ลบ และนำเข้า", async () => {
  const { window } = loadApp("#/vol/1/parajika/pj1");
  window.confirm = () => true;
  await tick();
  const form = window.document.querySelector("#notes form");
  form.querySelector("[name=title]").value = "คำถามทดสอบ";
  form.querySelector("[name=body]").value = "จดไว้";
  form.querySelector("[name=tags]").value = "วินัย";
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  assert.ok(window.document.getElementById("notes").textContent.includes("คำถามทดสอบ"));
  window.TSC.io.importPayload({
    app: "tipitaka-study-companion",
    schemaVersion: 1,
    notes: [{ id: "keep", title: "นำเข้า", body: "รอบ", tags: ["a"], kind: "question", createdAt: "2026-01-01", updatedAt: "2026-01-02", anchor: {} }]
  }, "merge");
  assert.ok(window.TSC.notes.all().some((n) => n.id === "keep"));
  assert.throws(() => window.TSC.io.importPayload({ app: "nope" }, "replace"));
  assert.ok(window.TSC.notes.all().some((n) => n.id === "keep"));
  window.document.querySelector("#notes button[aria-label=ลบโน้ต]").click();
  assert.ok(!window.document.getElementById("notes").textContent.includes("คำถามทดสอบ"));
});

test("แบบทดสอบเฉลยและความคืบหน้า", async () => {
  const { window } = loadApp("#/quiz/vol-1");
  await tick();
  const button = window.document.querySelector("#reader button");
  button.click();
  assert.ok(window.document.getElementById("reader").textContent.includes("เฉลย"));
  window.location.hash = "#/vol/1/parajika/pj1";
  await tick();
  window.document.querySelector("[aria-label=อ่านแล้ว]").click();
  assert.equal(window.TSC.progress.has("pj1"), true);
  const ids = window.TSC.DATA.units.filter((u) => u.volume === 1).map((u) => u.id);
  assert.ok(window.TSC.progress.percent(ids) > 0);
});
