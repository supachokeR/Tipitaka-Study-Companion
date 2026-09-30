import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("ฟอนต์ไทยครอบพินทุและนิคหิต และถูกฝังในไฟล์", () => {
  const ranges = JSON.parse(fs.readFileSync("node_modules/@fontsource/sarabun/unicode.json", "utf8"));
  assert.match(ranges.thai, /U\+0E01-0E5B/);
  const start = 0x0e01;
  const end = 0x0e5b;
  assert.ok(0x0e3a >= start && 0x0e3a <= end);
  assert.ok(0x0e4d >= start && 0x0e4d <= end);
  const html = fs.readFileSync("tipitaka-study.html", "utf8");
  assert.match(html, /font-family:Sarabun/);
  assert.match(html, /data:font\/woff2;base64,/);
});
