"""Study units for every sutta and abhidhamma file in the pinned bilara snapshot.

Pali segments are copied. Thai notes describe the setting and the headings in the file.
The thirty-four Digha suttas use the scene notes in dn_stories.py.
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT = ROOT / "tools/raw/bilara/root/pli/ms"
REF = ROOT / "tools/raw/bilara/reference/pli/ms"

SKIP_BOOKS = {"mil", "ne", "pe"}
FALLBACK_VOLUME = {"an5": 22, "an6": 22, "an7": 23, "an9": 23}
PLACES = [
    ("sāvatthiyaṁ", "สาวัตถี"),
    ("jetavane", "เชตวัน"),
    ("rājagahe", "ราชคฤห์"),
    ("veḷuvane", "เวฬุวัน"),
    ("vesāliyaṁ", "เวสาลี"),
    ("kosambiyaṁ", "โกสัมพี"),
    ("kapilavatthusmiṁ", "กบิลพัสดุ์"),
    ("bārāṇasiyaṁ", "พาราณสี"),
    ("nāḷandāyaṁ", "นาลันทา"),
    ("campāyaṁ", "จัมปา"),
    ("sākete", "สาเกต"),
    ("kusinārāyaṁ", "กุสินารา"),
    ("pāvāyaṁ", "ปาวา"),
    ("rājagahe", "ราชคฤห์"),
]
SIGLA_BY_VOLUME = {
    9: "ที.สี.", 10: "ที.ม.", 11: "ที.ปา.",
    12: "ม.มู.", 13: "ม.ม.", 14: "ม.อุ.",
    15: "สํ.ส.", 16: "สํ.นิ.", 17: "สํ.ข.", 18: "สํ.สฬา.", 19: "สํ.ม.",
}
AN_SIGLA = {
    "an1": "องฺ.เอก.", "an2": "องฺ.ทุก.", "an3": "องฺ.ติก.", "an4": "องฺ.จตุกฺก.",
    "an5": "องฺ.ปญฺจก.", "an6": "องฺ.ฉกฺก.", "an7": "องฺ.สตฺตก.", "an8": "องฺ.อฏฺฐก.",
    "an9": "องฺ.นวก.", "an10": "องฺ.ทสก.", "an11": "องฺ.เอกาทสก.",
}
KN_SIGLA = {
    "kp": "ขุ.ขุ.", "dhp": "ขุ.ธ.", "ud": "ขุ.อุ.", "iti": "ขุ.อิติ.", "snp": "ขุ.สุ.",
    "vv": "ขุ.วิ.", "pv": "ขุ.เป.", "thag": "ขุ.เถร.", "thig": "ขุ.เถรี.",
    "ja": "ขุ.ชา.", "mnd": "ขุ.ม.", "cnd": "ขุ.จู.", "ps": "ขุ.ปฏิ.",
    "tha-ap": "ขุ.อป.", "thi-ap": "ขุ.อป.", "bv": "ขุ.พุทธ.", "cp": "ขุ.จริยา.",
}
ABHI_SIGLA = {
    "ds": "อภิ.สงฺ.", "vb": "อภิ.วิ.", "dt": "อภิ.ธา.", "pp": "อภิ.ปุ.",
    "kv": "อภิ.ก.", "ya": "อภิ.ย.", "patthana": "อภิ.ป.",
}
BOOK_BLURB = {
    "dn": "ทีฆนิกายเป็นพระสูตรยาว",
    "mn": "มัชฌิมนิกายเป็นพระสูตรความยาวกลาง",
    "sn": "สังยุตตนิกายรวบสูตรสั้นไว้ตามเรื่องเดียวกัน",
    "an": "อังคุตตรนิกายเรียงธรรมตามจำนวน",
    "kp": "ขุททกปาฐะเป็นบทสวดสั้นชุดต้นของขุททกนิกาย",
    "dhp": "ธรรมบทเป็นคาถาที่รวบไว้ตามวรรค",
    "ud": "อุทานเป็นคำที่พระผู้มีพระภาคเปล่งเมื่อทรงเห็นเหตุ",
    "iti": "อิติวุตตกะขึ้นต้นว่าข้อนี้พระผู้มีพระภาคตรัสไว้",
    "snp": "สุตตนิบาตเป็นคาถาและสูตรชุดต้น",
    "vv": "วิมานวัตถุเล่าผู้ที่ไปเกิดในวิมานเพราะบุญ",
    "pv": "เปตวัตถุเล่าผู้ที่ไปเกิดเป็นเปรตเพราะกรรม",
    "thag": "เถรคาถาเป็นคาถาของภิกษุ",
    "thig": "เถรีคาถาเป็นคาถาของภิกษุณี",
    "ja": "ชาดกเล่าเรื่องในอดีตที่พระผู้มีพระภาคตรัส",
    "mnd": "มหานิทเทสอธิบายสูตรในสุตตนิบาตเป็นชุดยาว",
    "cnd": "จูฬนิทเทสอธิบายขัคควิสาณสูตรและปารายนวรรค",
    "ps": "ปฏิสัมภิทามรรคแจกธรรมที่ภิกษุทำให้แจ้ง",
    "tha-ap": "อปทานของพระเถระเล่าบุญในอดีตที่ทำให้ได้บรรลุ",
    "thi-ap": "อปทานของพระเถรีเล่าบุญในอดีตที่ทำให้ได้บรรลุ",
    "bv": "พุทธวงศ์เล่าพระพุทธเจ้าในอดีตตามลำดับ",
    "cp": "จริยาปิฎกเล่าจริยาที่พระโพธิสัตว์บำเพ็ญ",
    "ds": "ธัมมสังคณีแจกธรรมที่เป็นกุศล อกุศล และอัพยากฤต",
    "vb": "วิภังค์ของอภิธรรมขยายหมวดธรรมทีละชุด ไม่ใช่วิภังค์สิกขาบท",
    "dt": "ธาตุกถาจับคู่ธรรมกับขันธ์ อายตนะ และธาตุ",
    "pp": "ปุคคลบัญญัติรวบชื่อเรียกบุคคลตามธรรมที่เขามี",
    "kv": "กถาวัตถุเป็นคำถามที่แยกถ้อยคำที่ตรงกับพระธรรมออกจากถ้อยคำที่คลาด",
    "ya": "ยมกจับคู่คำถามสองด้านเพื่อตรวจว่าธรรมนั้นเป็นอย่างนั้นหรือไม่",
    "patthana": "ปัฏฐานแสดงปัจจัยที่ธรรมอาศัยกันเกิดขึ้น บทนี้เป็นบทหนึ่งของปัจจัยนั้น ไม่ใช่ตารางทุกช่อง",
}


def first_sya(ref):
    match = re.search(r"\bsya(\d+)\.(\d+)\b", ref or "")
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def book_of(path):
    parts = path.relative_to(TEXT).parts
    if parts[0] == "sutta":
        if parts[1] == "kn":
            return parts[2]
        return parts[1]
    return parts[1]


def sigla_for(path, volume):
    book = book_of(path)
    if book in AN_SIGLA:
        return AN_SIGLA[book]
    if book in KN_SIGLA:
        return KN_SIGLA[book]
    if book in ABHI_SIGLA:
        return ABHI_SIGLA[book]
    return SIGLA_BY_VOLUME.get(volume, "พระไตรปิฎก")


def natural_key(path):
    stem = path.name.replace("_root-pli-ms.json", "")
    return [int(piece) if piece.isdigit() else piece for piece in re.split(r"(\d+)", stem)]


def row_book(path):
    return book_of(path)


def wanted(path):
    book = book_of(path)
    return book not in SKIP_BOOKS


def transliterate_all(strings):
    payload = json.dumps(list(strings), ensure_ascii=False)
    script = r"""
const fs = require("fs");
const vm = require("vm");
const src = fs.readFileSync("src/app/text/transliterate.js", "utf8");
const ctx = {};
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const out = input.map((item) => {
  try { return ctx.TSC.transliterate(item); }
  catch (error) { return item; }
});
process.stdout.write(JSON.stringify(out));
"""
    result = subprocess.run(
        ["node", "--input-type=commonjs", "-e", script],
        input=payload.encode("utf-8"),
        cwd=ROOT,
        check=True,
        capture_output=True,
    )
    return json.loads(result.stdout.decode("utf-8"))


def load_corpus(start_order, sha):
    from dn_stories import DN
    files = sorted(TEXT.rglob("*_root-pli-ms.json"), key=natural_key)
    files = [path for path in files if "sutta" in path.parts or "abhidhamma" in path.parts]
    files = [path for path in files if wanted(path)]
    pending = []
    strings = []

    def remember(text):
        strings.append(text)
        return len(strings) - 1

    for path in files:
        data = json.loads(path.read_text())
        ref_path = REF / path.relative_to(TEXT)
        ref_path = Path(str(ref_path).replace("_root-pli-ms.json", "_reference.json"))
        if not ref_path.exists():
            continue
        refs = json.loads(ref_path.read_text())
        items = [(key, value) for key, value in data.items() if value and value.strip()]
        title = ""
        for key, value in items[:6]:
            text = value.strip()
            if text and "Nikāya" not in text and "Abhidhamma" not in text and len(text) < 80:
                title = text
                break
        if not title:
            title = path.name.replace("_root-pli-ms.json", "")
        headings = []
        for key, value in items:
            text = value.strip()
            if re.match(r"\d+\. ", text) and len(text) < 70:
                headings.append(text)
            if len(headings) >= 6:
                break
        blob = " ".join(value for _key, value in items[:30])
        places = []
        for needle, label in PLACES:
            if needle in blob and label not in places:
                places.append(label)
        picked = []
        volume = None
        for key, value in items:
            hit = first_sya(refs.get(key, ""))
            if not hit:
                continue
            volume = hit[0]
            if len(value.strip()) > 420 and picked:
                continue
            picked.append((key, value))
            if len(picked) >= 2:
                break
        if not picked:
            for key, value in items:
                text = value.strip()
                if text and len(text) < 420 and "Nikāya" not in text and "Abhidhamma" not in text:
                    picked = [(key, value)]
                    break
        if volume is None:
            volume = FALLBACK_VOLUME.get(path.parent.name)
        pending.append({
            "path": path,
            "title_i": remember(title),
            "head_i": [remember(item) for item in headings],
            "places": places,
            "picked": picked,
            "refs": refs,
            "volume": volume,
            "book": book_of(path),
            "parent": path.parent,
        })

    folder_vols = {}
    for row in pending:
        if row["volume"]:
            folder_vols.setdefault(row["parent"], set()).add(row["volume"])
    kept = []
    for row in pending:
        if row["volume"] is None:
            known = folder_vols.get(row["parent"], set())
            if len(known) == 1:
                row["volume"] = next(iter(known))
            elif row["parent"].name == "ja":
                row["volume"] = 27
            elif row["parent"].name == "tha-ap":
                row["volume"] = 32
        if row["volume"] is None or not row["picked"]:
            continue
        if row["volume"] < 9 or row["volume"] > 45:
            continue
        kept.append(row)
    pending = kept

    thai = transliterate_all(strings)
    units = []
    order = start_order
    for row in pending:
        title_th = thai[row["title_i"]]
        heads = [thai[index] for index in row["head_i"]]
        stem = row["path"].name.replace("_root-pli-ms.json", "")
        dn_number = int(stem[2:]) if stem.startswith("dn") and stem[2:].isdigit() else None
        if dn_number in DN:
            summary = DN[dn_number]
        else:
            where = ""
            if row["places"]:
                where = "พระผู้มีพระภาคประทับที่" + " และ".join(row["places"][:2]) + ". "
            outline = ""
            if heads:
                outline = "หัวข้อในข้อความนี้ขึ้นต้นว่า " + " ".join(heads[:6]) + ". "
            summary = (
                BOOK_BLURB.get(row["book"], "ข้อความนี้เป็นส่วนหนึ่งของพระไตรปิฎก")
                + " ชื่อในต้นฉบับอ่านเป็นไทยว่า " + title_th + ". "
                + where + outline
                + "บาลีที่ยกไว้ใช้สำหรับอ้างเลขหน้า ไม่ใช่คำแปลทั้งสูตร"
            ).strip()
        passages = []
        last = None
        for seg_id, raw in row["picked"]:
            hit = first_sya(row["refs"].get(seg_id, ""))
            page_from = "break" if hit else ("carry" if last else None)
            if hit:
                last = hit
            cite_page = hit or last
            passages.append({
                "id": seg_id,
                "scSegment": seg_id,
                "paliRoman": raw,
                "sha256": sha(raw),
                "cite": {
                    "volume": cite_page[0] if cite_page else row["volume"],
                    "page": cite_page[1] if cite_page else None,
                    "pageFrom": page_from,
                    "sigla": sigla_for(row["path"], row["volume"]),
                    "scSegment": seg_id,
                    "item": None,
                },
                "paraphraseTh": "",
                "terms": [],
            })
        uid = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
        units.append({
            "id": uid,
            "anchorId": f"v{row['volume']:02d}-{uid}",
            "volume": row["volume"],
            "sectionId": f"corpus-{row['volume']}",
            "kind": "sutta" if "sutta" in row["path"].parts else "chapter",
            "scId": stem,
            "number": dn_number or row["volume"],
            "order": order,
            "titleTh": title_th,
            "titleRoman": strings[row["title_i"]],
            "summary": summary,
            "verify": [],
            "people": [],
            "places": [],
            "dhammaIds": [],
            "passages": passages,
            "penalty": "สุตตันต" if row["volume"] <= 33 else "อภิธรรม",
        })
        order += 1
    return units
