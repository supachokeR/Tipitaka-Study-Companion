import assert from "node:assert/strict";
import test from "node:test";
import { loadSrc } from "./helpers/load-src.mjs";

const TSC = loadSrc(["src/app/text/transliterate.js"]);
const tr = TSC.transliterate;

const PAIRS = [
  ["buddha", "พุทฺธ"],
  ["dhamma", "ธมฺม"],
  ["saṅgha", "สงฺฆ"],
  ["bhikkhu", "ภิกฺขุ"],
  ["nibbāna", "นิพฺพาน"],
  ["anattā", "อนตฺตา"],
  ["evaṃ me sutaṃ", "เอวํ เม สุตํ"],
  ["evaṁ me sutaṁ", "เอวํ เม สุตํ"],
  ["pañca", "ปญฺจ"],
  ["viññāṇa", "วิญฺญาณ"],
  ["satipaṭṭhāna", "สติปฏฺฐาน"],
  ["paṭiccasamuppāda", "ปฏิจฺจสมุปฺปาท"],
  ["āyasmā", "อายสฺมา"],
  ["anicca", "อนิจฺจ"],
  ["dukkha", "ทุกฺข"],
  ["magga", "มคฺค"],
  ["phala", "ผล"],
  ["karuṇā", "กรุณา"],
  ["upekkhā", "อุเปกฺขา"],
  ["mettā", "เมตฺตา"],
  ["sīla", "สีล"],
  ["samādhi", "สมาธิ"],
  ["paññā", "ปญฺญา"],
  ["nibbānaṃ", "นิพฺพานํ"],
  ["bhagavā", "ภควา"],
  ["sāvatthiyaṃ", "สาวตฺถิยํ"],
  ["jetavane", "เชตวเน"],
  ["anāthapiṇḍikassa", "อนาถปิณฺฑิกสฺส"],
  ["ārāme", "อาราเม"],
  ["bhikkhūnaṃ", "ภิกฺขูนํ"],
  ["tathāgata", "ตถาคต"],
  ["saṃyutta", "สํยุตฺต"],
  ["aṭṭha", "อฏฺฐ"],
  ["oṭṭha", "โอฏฺฐ"],
  ["atthi", "อตฺถิ"],
  ["khaggavisāṇa", "ขคฺควิสาณ"],
  ["yoniso", "โยนิโส"],
  ["manasikāra", "มนสิการ"],
  ["ānāpāna", "อานาปาน"],
  ["saḷāyatana", "สฬายตน"],
  ["dhammaṃ", "ธมฺมํ"],
  ["bhikkhave", "ภิกฺขเว"],
  ["pārājika", "ปาราชิก"],
  ["saṅghādisesa", "สงฺฆาทิเสส"],
  ["nissaggiya", "นิสฺสคฺคิย"],
  ["pācittiya", "ปาจิตฺติย"],
  ["pāṭidesanīya", "ปาฏิเทสนีย"],
  ["sekhiya", "เสขิย"],
  ["adhikaraṇa", "อธิกรณ"],
  ["sikkhāpada", "สิกฺขาปท"],
  ["verañjā", "เวรญฺชา"],
  ["sudinna", "สุทินฺน"],
  ["vesālī", "เวสาลี"],
  ["rājagaha", "ราชคห"],
  ["cīvara", "จีวร"],
  ["piṇḍapāta", "ปิณฺฑปาต"],
  ["senāsana", "เสนาสน"],
  ["gilāna", "คิลาน"],
  ["uposatha", "อุโปสถ"],
  ["kathina", "กถิน"],
  ["sacca-kiriyā", "สจฺจกิริยา"],
  ["hoti,", "โหติ,"],
  ["1", "1"]
];

test("คู่ทับศัพท์อย่างน้อย 50 คู่ผ่านหมด", () => {
  assert.ok(PAIRS.length >= 50);
  for (const [roman, thai] of PAIRS) {
    assert.equal(tr(roman), thai, roman);
  }
});

test("อักขระที่ไม่รู้จักทำให้ฟังก์ชันโยนข้อผิดพลาด", () => {
  assert.throws(() => tr("dhamma@"));
});
