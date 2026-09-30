# PLAN — Tipitaka Study Companion

> สถานะ: **APPROVED v1.0** (2026-10-01) · อ้างอิง SPEC.md v1.0

---

## 1. สถาปัตยกรรม

Vanilla JS (ES2020) รวมเป็นไฟล์เดียว ไม่ใช้ React/Vue และไม่ใช้ ES module ในไฟล์ที่แจก เพราะ `file://` ต้องเปิดได้โดยไม่ต้องมีเซิร์ฟเวอร์

พัฒนาแยกไฟล์ใน `src/` แล้ว `scripts/build.mjs` ฝัง CSS, ฟอนต์, และ JS ลง `tipitaka-study.html` พร้อมสำเนา `dist/index.html` สำหรับ GitHub Pages

ข้อมูลไม่มีฟังก์ชัน การเพิ่มเล่มคือการเพิ่มไฟล์ข้อมูลแล้วลงทะเบียนในดัชนีเล่ม

```
Tipitaka Study Companion/
├── SPEC.md  PLAN.md  TASKS.md
├── package.json
├── src/
│   ├── index.template.html
│   ├── styles/input.css
│   ├── app/
│   │   ├── core/ store.js router.js dom.js events.js
│   │   ├── text/ transliterate.js cite.js chunk.js
│   │   ├── features/ notes.js search.js quiz.js progress.js tts.js io.js
│   │   ├── ui/ layout.js passage.js notes-panel.js tts-bar.js modal.js
│   │   ├── views/ home.js pitaka.js volume.js unit.js people.js dhamma.js
│   │   │         map.js glossary.js plan.js search.js quiz.js progress.js
│   │   │         notes.js about.js
│   │   └── main.js
│   ├── data/
│   │   ├── meta.js abbreviations.js sources.js
│   │   ├── people.js places.js dhammas.js glossary.js timeline.js
│   │   ├── quiz/vol-01.js quiz/vol-02.js
│   │   └── volumes/vol-01.js vol-02.js
│   └── svg/jambudipa.svg
├── tools/
│   ├── snapshot-bilara.mjs      # clone/fetch ที่ SHA แล้วเขียน manifest
│   ├── extract-passages.mjs     # ดึง segment ตามรายการ id → ตรวจ sha256
│   └── checksums/manifest.json  # commit, path, sha256 ของไฟล์ที่ใช้
├── tools/raw/                   # snapshot ทั้งก้อน ใส่ .gitignore
├── tests/
│   ├── helpers/load-app.mjs
│   ├── transliterate.test.mjs
│   ├── cite.test.mjs
│   ├── chunk.test.mjs
│   ├── tts.test.mjs
│   ├── data-integrity.test.mjs
│   ├── views.test.mjs
│   ├── notes.test.mjs
│   ├── search.test.mjs
│   ├── quiz.test.mjs
│   └── e2e/screens.spec.mjs
└── tipitaka-study.html          # ผล build
```

---

## 2. Build

ลำดับ `npm run build`

1. `node --check` ทุกไฟล์ `src/**/*.js` และ `tools/**/*.mjs` ที่เป็นสคริปต์ของเรา
2. Tailwind CLI v4 สแกน `src/**/*.{js,html}` แล้ว minify
3. ฝัง Sarabun woff2 subset (ไทย+ละติน 400/600/700) เป็น base64 ใน `@font-face` subset ต้องมี `ฺ` U+0E3A และ `ํ` U+0E4D
4. ต่อ JS เป็น IIFE เดียวตามลำดับ core → text → features → ui → views → data → main
5. ฉีดลงเทมเพลต ได้ `tipitaka-study.html` และ `dist/index.html` ที่เนื้อเดียวกัน
6. ดึง `<script>` ออกมาแล้ว `node --check` อีกรอบ
7. วัดขนาดไฟล์ เกิน 3 MB ใน Phase 1 ให้ build ล้มเหลว

สคริปต์ npm: `build`, `test`, `e2e`, `verify` (`verify` = build + test + e2e)

devDependencies: `tailwindcss`, `@tailwindcss/cli`, `@fontsource/sarabun`, `jsdom`, `@playwright/test`

---

## 3. โมดูล

### 3.1 DOM และ router
`h(tag, attrs, ...children)` สร้างโหนด ข้อความผู้ใช้ไม่ผ่าน `innerHTML`
แต่ละ view คืนโหนดรากและมี `destroy()` ปลด listener
Hash router เก็บตำแหน่งล่าสุด เมื่อ hash เปลี่ยนให้เรียก `tts.stop()` ก่อน render

### 3.2 Store
```
store.get(key, fallback)  // try/catch, JSON พัง → ย้ายไป corrupt-<ts> แล้วคืน fallback
store.set(key, value)     // try/catch คืน false แล้วส่งเหตุ storage:unavailable
```
เมื่อเขียนไม่ได้ ใช้ Map ในหน่วยความจำเฉพาะเซสชันนั้น และโชว์แถบเตือน

### 3.3 ตัวบทและการอ้างอิง
`extract-passages.mjs` อ่านรายการ `{file, segmentId}` ที่ผู้เขียนระบุในข้อมูลเล่ม ไปเปิด snapshot แล้วคัดค่าดิบใส่ `paliRoman` พร้อม `sha256` ผู้เขียนไม่พิมพ์บาลีเอง
Parser เลขอ้างอิงแยกโทเคน `sya(\d+)\.(\d+)` เท่านั้น เจอรูปแบบอื่นให้สคริปต์หยุด
หน้าแรกของไฟล์ที่ไม่มี `sya` ได้ `page: null` บรรทัดถัดไปในไฟล์เดียวกันใช้หน้าล่าสุดและตั้ง `pageFrom: "carry"`
ทดสอบแยก: เลขเล่มใน `sya` ต้องเท่ากับเลขเล่มของ unit

### 3.4 ทับศัพท์
ไฟล์ `transliterate.js` ตาม SPEC §6.4 ใช้ทั้งตอนแสดงผลและตอนทดสอบ ไม่มีตารางคำยกเว้นทั้งคำ ถ้าต้องการรูปพิเศษให้แก้ตัวแปลง ไม่แก้ทีละคำในข้อมูล

### 3.5 ค้นหา
สร้างดัชนีตอนเปิดช่องค้นครั้งแรก จากหน่วย บุคคล สถานที่ ศัพท์ และโน้ต
ช่องที่ค้นได้รวม `scId`, `scSegment`, `sya{n}.{p}`, อักษรย่อ, และบาลีทั้งสองรูป
จัดอันดับ: รหัสตรงทั้งก้อน แล้วจึงชื่อขึ้นต้น แล้วจึงพบในเนื้อ จำกัด 20 รายการต่อประเภท

### 3.6 Quiz
Fisher–Yates ด้วย RNG ที่ส่งเข้าไปได้ ชุดข้ออยู่ไฟล์ `src/data/quiz/` คนละไฟล์กับตัวบท

### 3.7 TTS
`chunk.js` เป็นฟังก์ชันล้วน รับรายการย่อหน้า คืน `{paragraphIndex, text}[]`
- แบ่งทีละย่อหน้า
- ภายในย่อหน้า ถ้ายาวเกิน 200 ให้ตัดที่ช่องว่างหรือที่ขอบคำของ `Intl.Segmenter` (`th`) โดยทุกตัวอักษรอยู่ชิ้นเดียว
- ไม่มีชิ้นยาวเกิน 200

`tts.js` ห่อ `speechSynthesis`
- เลือก voice `th` หลัง `voiceschanged` หรือหลังรายการเสียงไม่ว่าง
- rate จาก store
- เปลี่ยน rate: จำ index ชิ้นปัจจุบัน, `cancel()`, `speak` ชิ้นนั้นใหม่
- ไฮไลต์ด้วย attribute `data-reading` บนย่อหน้าแล้ว `scrollIntoView`
- ตัวเก็บข้อความเดินเฉพาะใน `#reader` ไม่เข้า `#notes` และไม่เข้าปุ่ม

### 3.8 โน้ตและไฟล์
ตรวจ import ด้วยมือ: ชนิดฟิลด์, ความยาว, รูปแบบ id แสดงจำนวนรายการก่อนยืนยัน
Merge เทียบ `updatedAt`

### 3.9 แผนที่
`jambudipa.svg` วาดเอง มองเป็นผืนทวีปอย่างย่อ จุดสถานที่เป็นวงกลมจากพิกัดในข้อมูล คลิกแล้วเปิดรายการหน่วยที่ผูกกับสถานที่นั้น บนมือถือมีรายการสถานที่คู่กับภาพ

---

## 4. กระบวนการเนื้อหา

1. Snapshot bilara ที่ SHA หนึ่งค่า เก็บ manifest
2. วางโครงหน่วยจากชื่อไฟล์ต้นฉบับ (pj, ss, ay, np, pc, pd, sk, as) ไม่ได้ตั้งจำนวนสิกขาบทเอง
3. เลือก segment ของตัวสิกขาบทด้วยสคริปต์ ตรวจด้วยตาว่าเป็นประโยคบัญญัติ ไม่ใช่คำโปรย แล้วล็อก id ลงข้อมูล
4. เขียนสรุปไทยจากบาลีข้อนั้น โดยไม่เปิดคำแปลไทยและไม่เปิด `translation/` ของ SuttaCentral
5. ใส่ `verify` ทุกจุดที่ตัวบทไม่พูดตรงๆ
6. เขียน quiz จากสรุปในแอปเท่านั้น แต่ละข้อชี้ `unitId`
7. `npm test` ต้องผ่านก่อนถือว่าเล่มนั้นเข้าแอป

เล่ม ๒ มี ๒๐๘ สิกขาบท จึงแตกงานใน TASKS เป็นชุดย่อย แต่ยังนับเป็น Phase 1 เดียวกัน

ปัฏฐานใน phase ท้ายสรุปตามบทของต้นฉบับ ไม่แจงเซลล์ของเมทริกซ์ทั้งก้อน เพราะตัวบทวนซ้ำระดับที่ไฟล์เดี่ยวรับไม่ไหวและไม่ช่วยการอ่าน

---

## 5. การทดสอบ

| ชั้น | สิ่งที่ตรวจ |
|---|---|
| `node --check` | ต้นฉบับและสคริปต์ในไฟล์ build |
| ทับศัพท์ | ≥ 50 คู่ รวมตัวอย่างใน SPEC §6.4 ทั้ง `ṃ` และ `ṁ` |
| อ้างอิง | parser `sya`, การสืบหน้า, เลขเล่มตรงสารบัญ |
| checksum | ทุก passage ตรง snapshot |
| ข้อมูล | SPEC §11 |
| jsdom | ทุก view, นำทาง, โน้ต, ค้น, quiz, ความคืบหน้า, TTS ห้ากรณีใน SPEC §14 |
| Playwright | ภาพเดสก์ท็อปและมือถือ ไม่มี pageerror ไม่มี request ภายนอก |

---

## 6. ขนาดไฟล์และบาลีทั้งคัมภีร์

`root/pli/ms` ทั้งก้อนใหญ่เกินงบไฟล์เดียวที่จะเปิดบนมือถือและแจกทาง GitHub Pages อย่างสบาย จึงไม่ฝังทั้งคัมภีร์ใน Phase ใด

**ทางที่เสนอ (ใช้ถ้าอนุมัติ Q ใน SPEC ไม่ได้เปลี่ยนข้อนี้):**

| ทาง | วิธี | ผล |
|---|---|---|
| **A ที่ใช้** | HTML มีเฉพาะข้อความสำคัญของเล่มที่ทำแล้ว snapshot เต็มอยู่ที่ `tools/raw/` ซึ่ง git ignore ไว้ checksum อยู่ใน git | เปิด offline ไฟล์เดียวได้ ตรวจบาลีกับต้นฉบับได้ |
| B | แยก `data/pali/vol-NN.json` ให้หน้าเว็บโหลดเมื่อเปิดเล่ม | ใช้ได้บน GitHub Pages แต่ดับเบิลคลิก `file://` แล้ว fetch ไฟล์ข้างเคียงไม่ผ่านในเบราว์เซอร์ส่วนใหญ่ |
| C | บีบอัดก้อนข้อมูลศึกษาใน HTML แบบเดียวกับแอปเซน เมื่อไฟล์ศึกษาเกิน 8 MB ใน phase หลัง | ยังเป็นไฟล์เดียว offline ได้ ไม่ได้แก้ปัญหาบาลีทั้งคัมภีร์ |

ทาง B จะทำเพิ่มเฉพาะเมื่อมีคำขอแยก และจะไม่แทนทาง A

---

## 7. ความเสี่ยง

| ความเสี่ยง | การรับมือ |
|---|---|
| SHA ของ `published` ขยับแล้วตัวบทเปลี่ยน | ปัก commit ใน `sources.js` และ manifest เปลี่ยน SHA คือการตั้งใจ อัปเดต checksum ทั้งก้อน |
| รหัส `sya` ไม่บอกครั้งที่พิมพ์ | ป้ายในแอปอิงรหัสไฟล์ ตาม SPEC §4.1 จนกว่าจะมีหลักยืนยันครั้งที่พิมพ์ |
| ไม่มีเลขข้อ | ตาม Q1 ไม่แต่งเลข |
| เสียงไทยไม่มีในเครื่อง | modal วิธีติดตั้ง ทดสอบด้วย mock |
| Chrome ตัด utterance ยาว | ชิ้น ≤ 200 ตัวอักษร |
| เนื้อหาเล่ม ๒ ปริมาณมาก | แตก task รายกลุ่มสิกขาบท ส่งทดสอบทุกกลุ่ม |
| สับสนปทภาชนีย์กับอรรถกถา | ปทภาชนีย์อยู่ในไฟล์ `root/pli/ms` จึงสรุปได้ อรรถกถาคนละ repo ไม่ถูก snapshot |
| แผนที่ดูเหมือนแผนที่จริง | ป้ายบนภาพว่าเป็นผังการเรียน |

---

## 8. การส่งมอบ

แต่ละ phase: `npm run verify` ผ่าน แล้วรายงานตาม SPEC §15 รออนุมัติก่อน phase ถัดไป
Phase 1 ไม่รวมการสร้าง remote บน GitHub จนกว่าจะมีคำขอ push ไฟล์ workflow สำหรับ Pages อยู่ใน task P1-B04 เพื่อให้พร้อมเมื่อจะ deploy
