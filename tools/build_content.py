#!/usr/bin/env python3
"""Build study data from the pinned bilara snapshot. Pali strings are copied, not composed."""
import hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "tools/raw/bilara"
TEXT = RAW / "root/pli/ms/vinaya/pli-tv-bu-vb"
REF = RAW / "reference/pli/ms/vinaya/pli-tv-bu-vb"
COMMIT = "ce5b98f032ec20132a5678bddf15a76c94263913"

PLACES = [
    ("verañjāyaṁ", "ที่เวรัญชา", "veranja", "เวรัญชา", "verañjā", 40, 34),
    ("vesāliyaṁ", "ที่เวสาลี", "vesali", "เวสาลี", "vesālī", 58, 40),
    ("rājagahe", "ที่ราชคฤห์", "rajagaha", "ราชคฤห์", "rājagaha", 62, 48),
    ("sāvatthiyaṁ", "ที่สาวัตถี", "savatthi", "สาวัตถี", "sāvatthī", 48, 32),
    ("kosambiyaṁ", "ที่โกสัมพี", "kosambi", "โกสัมพี", "kosambī", 46, 38),
    ("āḷaviyaṁ", "ที่อาฬวี", "alavi", "อาฬวี", "āḷavī", 50, 36),
    ("kapilavatthusmiṁ", "ที่กบิลพัสดุ์", "kapilavatthu", "กบิลพัสดุ์", "kapilavatthu", 42, 28),
    ("bārāṇasiyaṁ", "ที่พาราณสี", "baranasi", "พาราณสี", "bārāṇasī", 52, 42),
    ("jetavane", "ที่เชตวนาราม", "jetavana", "เชตวัน", "jetavana", 49, 33),
    ("veḷuvane", "ที่เวฬุวนาราม", "veluvana", "เวฬุวัน", "veḷuvana", 63, 49),
]

def load(path):
    return json.loads(path.read_text())

def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def first_sya(ref):
    m = re.search(r"\bsya(\d+)\.(\d+)\b", ref or "")
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))

def ref_path(root_file):
    rel = root_file.relative_to(TEXT)
    return REF / str(rel).replace("_root-pli-ms.json", "_reference.json")

def class_of(name):
    m = re.search(r"pli-tv-b[iu]-vb-([a-z]+)", name)
    return m.group(1) if m else ""

def num_of(name):
    m = re.search(r"-([a-z]+)(\d+)", name)
    return int(m.group(2)) if m else 0

def extract_rule(data):
    keys = list(data)
    idxs = [i for i, k in enumerate(keys) if "uddiseyyātha" in data[k] or "uddisantu" in data[k]]
    if idxs:
        i = idxs[-1] + 1
        parts = []
        while i < len(keys) and len(parts) < 40:
            raw = data[keys[i]]
            i += 1
            if not raw.strip():
                continue
            parts.append((keys[i - 1], raw))
            if "”ti" in raw:
                return parts
    for k, v in data.items():
        if "sikkhā karaṇīyā" in v and v.strip().startswith("“"):
            return [(k, v)]
    return None

def title_of(data):
    for k, v in data.items():
        if re.match(r"\d+\. ", v.strip()):
            return v.strip()
    return ""

def opening_of(data):
    for k, v in data.items():
        if "Tena samayena" in v or "tena samayena" in v:
            return k, v
    return None, ""

SECTIONS = {
    "pj": ("parajika", "ปาราชิกกัณฑ์", 1, "ปาราชิก"),
    "ss": ("sanghadisesa", "สังฆาทิเสสกัณฑ์", 1, "สังฆาทิเสส"),
    "ay": ("aniyata", "อนิยตกัณฑ์", 1, "อนิยต"),
    "np": ("nissaggiya", "นิสสัคคียปาจิตตีย์กัณฑ์", 2, "นิสสัคคิยปาจิตตีย์"),
    "pc": ("pacittiya", "ปาจิตตีย์กัณฑ์", 2, "ปาจิตตีย์"),
    "pd": ("patidesaniya", "ปาฏิเทสนียกัณฑ์", 2, "ปาฏิเทสนียะ"),
    "sk": ("sekhiya", "เสขิยกัณฑ์", 2, "เสขิยะ"),
    "as": ("samatha", "อธิกรณสมถะ", 2, "อธิกรณสมถะ"),
}

# One original sentence of the rule's force, keyed by sc id without the common prefix.
from glosses import GLOSS  # noqa: E402

def main():
    units = []
    people_ids = {"buddha": []}
    place_eps = {pid: [] for *_, pid, _, _, _, _ in [(a, b, c, d, e, f, g) for a, b, c, d, e, f, g in PLACES]}
    order = 0
    files = sorted(TEXT.rglob("*_root-pli-ms.json"))
    for path in files:
        if class_of(path.name) == "as":
            continue
        data = load(path)
        refs = load(ref_path(path))
        parts = extract_rule(data)
        if not parts:
            raise SystemExit("no rule: " + path.name)
        sc = path.name.replace("_root-pli-ms.json", "")
        kind = class_of(sc)
        sec_id, sec_th, vol, penalty = SECTIONS[kind]
        n = num_of(sc)
        gloss = GLOSS[sc]
        open_id, open_text = opening_of(data)
        place_phrase = ""
        place_ids = []
        blob = " ".join(data.values())
        for needle, phrase, pid, *_rest in PLACES:
            if needle in blob or needle in open_text:
                if not place_phrase:
                    place_phrase = phrase
                place_ids.append(pid)
        summary = gloss["summary"]
        if place_phrase:
            origin = "เรื่องเกิดเริ่มในคราวที่พระผู้มีพระภาคประทับ" + place_phrase
            summary += " " + origin
        passages = []
        last_page = None
        if open_id:
            ref = refs.get(open_id, "")
            hit = first_sya(ref)
            page_from = "break" if hit else ("carry" if last_page else None)
            if hit:
                last_page = hit
            cite_page = hit or last_page
            passages.append({
                "id": sc + "-origin",
                "scSegment": open_id,
                "paliRoman": open_text,
                "sha256": sha(open_text),
                "cite": {
                    "volume": cite_page[0] if cite_page else None,
                    "page": cite_page[1] if cite_page else None,
                    "pageFrom": page_from,
                    "sigla": "วิ.มหา.",
                    "scSegment": open_id,
                    "item": None,
                },
                "paraphraseTh": "",
                "terms": [],
            })
        for seg_id, raw in parts:
            ref = refs.get(seg_id, "")
            hit = first_sya(ref)
            page_from = "break" if hit else ("carry" if last_page else None)
            if hit:
                last_page = hit
            cite_page = hit or last_page
            if cite_page and cite_page[0] != vol:
                raise SystemExit(f"sya volume {cite_page[0]} != {vol} for {seg_id}")
            passages.append({
                "id": seg_id,
                "scSegment": seg_id,
                "paliRoman": raw,
                "sha256": sha(raw),
                "cite": {
                    "volume": cite_page[0] if cite_page else None,
                    "page": cite_page[1] if cite_page else None,
                    "pageFrom": page_from,
                    "sigla": "วิ.มหา.",
                    "scSegment": seg_id,
                    "item": None,
                },
                "paraphraseTh": "",
                "terms": gloss.get("terms", []),
            })
        unit_people = ["buddha"] + gloss.get("people", [])
        for pid in unit_people:
            people_ids.setdefault(pid, [])
        unit = {
            "id": kind + str(n),
            "anchorId": f"v{vol:02d}-{kind}{n}",
            "volume": vol,
            "sectionId": sec_id,
            "kind": "sikkhapada",
            "scId": sc,
            "number": n,
            "order": order,
            "titleTh": gloss["title"],
            "titleRoman": title_of(data),
            "summary": summary,
            "verify": gloss.get("verify", []),
            "people": unit_people,
            "places": place_ids,
            "dhammaIds": gloss.get("dhamma", []),
            "passages": passages,
            "penalty": penalty,
        }
        order += 1
        units.append(unit)
        for pid in unit_people:
            people_ids[pid].append({"unitId": unit["id"], "textTh": gloss["title"], "cite": TSC_cite(passages[-1])})
        for pid in place_ids:
            place_eps[pid].append({"unitId": unit["id"], "textTh": gloss["title"]})

    as_units, as_extra = build_as(order)
    units.extend(as_units)
    for u in as_units:
        people_ids["buddha"].append({"unitId": u["id"], "textTh": u["titleTh"], "cite": TSC_cite(u["passages"][-1])})

    units.extend(load_bhikkhuni(max(u["order"] for u in units) + 1, people_ids, place_eps))
    units.extend(load_mahavagga(max(u["order"] for u in units) + 1, people_ids, place_eps))
    units.extend(load_parivara(max(u["order"] for u in units) + 1, people_ids, place_eps))
    from load_corpus import load_corpus
    corpus = load_corpus(max(u["order"] for u in units) + 1, sha)
    for u in corpus:
        for pid in u["places"]:
            place_eps.setdefault(pid, []).append({"unitId": u["id"], "textTh": u["titleTh"]})
    units.extend(corpus)

    if sum(1 for u in units if u["volume"] == 1) != 19:
        raise SystemExit("vol 1 count")
    if sum(1 for u in units if u["volume"] == 2) != 208:
        raise SystemExit("vol 2 count")

    from link_suttas import link_people
    from people_sutta import EPISODES
    link_people(units, people_ids, EPISODES)
    data = catalog(units, people_ids, place_eps)
    out = ROOT / "src/data/generated/data.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("var TSC = globalThis.TSC || (globalThis.TSC = {});\nTSC.DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    manifest = {
        "commit": COMMIT,
        "paths": ["root/pli/ms/vinaya/pli-tv-bu-vb", "reference/pli/ms/vinaya/pli-tv-bu-vb"],
        "units": len(units),
    }
    man = ROOT / "tools/checksums/manifest.json"
    man.parent.mkdir(parents=True, exist_ok=True)
    man.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print("units", len(units))

def TSC_cite(p):
    c = p["cite"]
    sigla = c.get("sigla") or "วิ.มหา."
    if c["page"] is None:
        return sigla + " · " + c["scSegment"]
    return f"{sigla} เล่ม {c['volume']} หน้า {c['page']} · {c['scSegment']}"

def build_as(order):
    path = next(TEXT.rglob("pli-tv-bu-vb-as1-7_root-pli-ms.json"))
    data = load(path)
    refs = load(ref_path(path))
    names = {
        1: ("สัมมุขาวินัย", "ระงับอธิกรณ์ในที่พร้อมหน้า ผู้กล่าวและผู้ถูกกล่าวอยู่พร้อมกัน"),
        2: ("สติวินัย", "ระงับด้วยการยกความที่พระอรหันต์มีสติ ไม่ต้องรับอาบัติที่ไม่มี"),
        3: ("อมูฬหวินัย", "ระงับเมื่อภิกษุหายจากความเป็นบ้า แล้วไม่ถือเอาสิ่งที่ทำในเวลาเป็นบ้า"),
        4: ("ปฏิญญาตกรณะ", "ระงับตามที่ภิกษุรับสารภาพเอง"),
        5: ("เยภุยยสิกา", "ระงับด้วยเสียงข้างมากของสงฆ์"),
        6: ("ตัสสปาปิยสิกา", "ระงับโดยลงโทษภิกษุผู้พูดเลี่ยงและไม่รับตามความจริง"),
        7: ("ติณวัตถารกะ", "ระงับอธิกรณ์ที่ยุ่งด้วยการกลบไว้ เหมือนหญ้ากลบของโสโครก ทั้งสองฝ่ายไม่ขุดคุ้ยต่อ"),
    }
    units = []
    last = None
    for n, (title, summary) in names.items():
        segs = [(k, v) for k, v in data.items() if k.startswith(f"pli-tv-bu-vb-as{n}:") and v.strip() and not k.endswith(":0.1") and "Mahāvibhaṅga" not in v and "Theravāda" not in v and "Adhikaraṇasamatha" not in v]
        if not segs:
            segs = [(k, v) for k, v in data.items() if k.startswith(f"pli-tv-bu-vb-as{n}:") and v.strip()][:2]
        passages = []
        for seg_id, raw in segs[:4]:
            hit = first_sya(refs.get(seg_id, ""))
            page_from = "break" if hit else ("carry" if last else None)
            if hit:
                last = hit
            cite_page = hit or last
            passages.append({
                "id": seg_id,
                "scSegment": seg_id,
                "paliRoman": raw,
                "sha256": sha(raw),
                "cite": {"volume": cite_page[0] if cite_page else None, "page": cite_page[1] if cite_page else None, "pageFrom": page_from, "sigla": "วิ.มหา.", "scSegment": seg_id, "item": None},
                "paraphraseTh": "",
                "terms": [],
            })
        units.append({
            "id": "as" + str(n),
            "anchorId": f"v02-as{n}",
            "volume": 2,
            "sectionId": "samatha",
            "kind": "sikkhapada",
            "scId": "pli-tv-bu-vb-as" + str(n),
            "number": n,
            "order": order + n,
            "titleTh": title,
            "titleRoman": title,
            "summary": summary + " ข้อความนี้อยู่ในท้ายมหาวิภังค์ เล่ม ๒ เป็นวิธีระงับอธิกรณ์ ไม่ใช่สิกขาบทที่มีโทษสลายสังฆราษฎร์",
            "verify": [],
            "people": ["buddha"],
            "places": [],
            "dhammaIds": [],
            "passages": passages,
            "penalty": "อธิกรณสมถะ",
        })
    return units, None

def load_bhikkhuni(start_order, people_ids, place_eps):
    from glosses_bi import GLOSS_BI
    text_root = ROOT / "tools/raw/bilara/root/pli/ms/vinaya/pli-tv-bi-vb"
    ref_root = ROOT / "tools/raw/bilara/reference/pli/ms/vinaya/pli-tv-bi-vb"
    meta = {
        "pj": ("bi-parajika", "ปาราชิก"),
        "ss": ("bi-sanghadisesa", "สังฆาทิเสส"),
        "np": ("bi-nissaggiya", "นิสสัคคิยปาจิตตีย์"),
        "pc": ("bi-pacittiya", "ปาจิตตีย์"),
        "pd": ("bi-patidesaniya", "ปาฏิเทสนียะ"),
        "sk": ("bi-sekhiya", "เสขิยะ"),
    }
    units = []
    order = start_order
    files = sorted(p for p in text_root.rglob("*_root-pli-ms.json") if class_of(p.name) != "as")
    for path in files:
        if path.name.startswith("pli-tv-bi-vb-pj1-4"):
            continue
        data = load(path)
        rel = path.relative_to(text_root)
        ref_file = ref_root / str(rel).replace("_root-pli-ms.json", "_reference.json")
        refs = load(ref_file)
        parts = extract_rule(data)
        if not parts:
            raise SystemExit("no bhikkhuni rule: " + path.name)
        sc = path.name.replace("_root-pli-ms.json", "")
        gloss = GLOSS_BI[sc]
        kind = class_of(sc)
        section_id, penalty = meta[kind]
        n = num_of(sc)
        slug = sc.replace("pli-tv-bi-vb-", "")
        place_phrase = ""
        place_ids = []
        blob = " ".join(data.values())
        for needle, phrase, pid, *_rest in PLACES:
            if needle in blob:
                if not place_phrase:
                    place_phrase = phrase
                if pid not in place_ids:
                    place_ids.append(pid)
        summary = gloss["summary"]
        if place_phrase:
            summary += " เรื่องเกิดเริ่มในคราวที่พระผู้มีพระภาคประทับ" + place_phrase
        passages = []
        last_page = None
        rows = []
        open_id, open_text = opening_of(data)
        if open_id:
            rows.append((open_id, open_text))
        rows.extend(parts)
        seen = set()
        for seg_id, raw in rows:
            if seg_id in seen:
                continue
            seen.add(seg_id)
            hit = first_sya(refs.get(seg_id, ""))
            page_from = "break" if hit else ("carry" if last_page else None)
            if hit:
                last_page = hit
            cite_page = hit or last_page
            if cite_page and cite_page[0] != 3:
                raise SystemExit(f"sya volume {cite_page[0]} != 3 for {seg_id}")
            passages.append({
                "id": seg_id,
                "scSegment": seg_id,
                "paliRoman": raw,
                "sha256": sha(raw),
                "cite": {
                    "volume": cite_page[0] if cite_page else None,
                    "page": cite_page[1] if cite_page else None,
                    "pageFrom": page_from,
                    "sigla": "วิ.ภิกฺขุนี.",
                    "scSegment": seg_id,
                    "item": None,
                },
                "paraphraseTh": "",
                "terms": [],
            })
        unit = {
            "id": "bi-" + slug,
            "anchorId": "v03-" + slug,
            "volume": 3,
            "sectionId": section_id,
            "kind": "sikkhapada",
            "scId": sc,
            "number": n,
            "order": order,
            "titleTh": gloss["title"],
            "titleRoman": title_of(data),
            "summary": summary,
            "verify": [],
            "people": ["buddha"],
            "places": place_ids,
            "dhammaIds": [],
            "passages": passages,
            "penalty": penalty,
        }
        order += 1
        units.append(unit)
        people_ids.setdefault("buddha", []).append({"unitId": unit["id"], "textTh": unit["titleTh"], "cite": TSC_cite(passages[-1])})
        for pid in place_ids:
            place_eps.setdefault(pid, []).append({"unitId": unit["id"], "textTh": unit["titleTh"]})
    units.extend(load_bhikkhuni_as(order, people_ids))
    return units

def load_bhikkhuni_as(start_order, people_ids):
    text_root = ROOT / "tools/raw/bilara/root/pli/ms/vinaya/pli-tv-bi-vb"
    ref_root = ROOT / "tools/raw/bilara/reference/pli/ms/vinaya/pli-tv-bi-vb"
    path = next(text_root.rglob("pli-tv-bi-vb-as1-7_root-pli-ms.json"))
    data = load(path)
    refs = load(ref_root / "pli-tv-bi-vb-as1-7_reference.json")
    names = {
        1: ("สัมมุขาวินัย", "ระงับอธิกรณ์ในที่พร้อมหน้า"),
        2: ("สติวินัย", "ระงับด้วยการยกความที่พระอรหันต์มีสติ"),
        3: ("อมูฬหวินัย", "ระงับเมื่อหายจากความเป็นบ้า"),
        4: ("ปฏิญญาตกรณะ", "ระงับตามคำรับของตนเอง"),
        5: ("เยภุยยสิกา", "ระงับด้วยเสียงข้างมาก"),
        6: ("ตัสสปาปิยสิกา", "ระงับโดยปรับผู้พูดไม่ตรง"),
        7: ("ติณวัตถารกะ", "ระงับโดยกลบอธิกรณ์ที่ยุ่งไว้"),
    }
    units = []
    last = None
    for n, (title, summary) in names.items():
        segs = [(k, v) for k, v in data.items() if k.startswith(f"pli-tv-bi-vb-as{n}:") and v.strip() and "Mahāvibhaṅga" not in v and "Theravāda" not in v and "Bhikkhunivibhaṅga" not in v]
        passages = []
        for seg_id, raw in segs[:3]:
            hit = first_sya(refs.get(seg_id, ""))
            page_from = "break" if hit else ("carry" if last else None)
            if hit:
                last = hit
            cite_page = hit or last
            passages.append({
                "id": seg_id,
                "scSegment": seg_id,
                "paliRoman": raw,
                "sha256": sha(raw),
                "cite": {"volume": cite_page[0] if cite_page else 3, "page": cite_page[1] if cite_page else None, "pageFrom": page_from, "sigla": "วิ.ภิกฺขุนี.", "scSegment": seg_id, "item": None},
                "paraphraseTh": "",
                "terms": [],
            })
        unit = {
            "id": "bi-as" + str(n),
            "anchorId": f"v03-as{n}",
            "volume": 3,
            "sectionId": "bi-samatha",
            "kind": "sikkhapada",
            "scId": "pli-tv-bi-vb-as" + str(n),
            "number": n,
            "order": start_order + n - 1,
            "titleTh": title,
            "titleRoman": title,
            "summary": summary,
            "verify": [],
            "people": ["buddha"],
            "places": [],
            "dhammaIds": [],
            "passages": passages,
            "penalty": "อธิกรณสมถะ",
        }
        units.append(unit)
        people_ids.setdefault("buddha", []).append({"unitId": unit["id"], "textTh": title, "cite": TSC_cite(passages[-1])})
    return units

def khandhaka_volume(kd):
    if kd <= 4:
        return 4
    if kd <= 10:
        return 5
    if kd <= 14:
        return 6
    return 7

def load_mahavagga(start_order, people_ids, place_eps):
    from glosses_kd import STORIES as early
    from glosses_cv import STORIES as later
    STORIES = early + later
    text_root = ROOT / "tools/raw/bilara/root/pli/ms/vinaya/pli-tv-kd"
    ref_root = ROOT / "tools/raw/bilara/reference/pli/ms/vinaya/pli-tv-kd"
    units = []
    order = start_order
    quiz = []
    by_title = {}
    for story in STORIES:
        data = json.loads((text_root / f"pli-tv-kd{story['kd']}_root-pli-ms.json").read_text())
        refs = json.loads((ref_root / f"pli-tv-kd{story['kd']}_reference.json").read_text())
        items = list(data.items())
        start = None
        for i, (k, v) in enumerate(items):
            if v.strip().startswith(story["match"]):
                start = i
                break
        if start is None:
            raise SystemExit("missing heading " + story["match"])
        end = len(items)
        for j in range(start + 1, len(items)):
            t = items[j][1].strip()
            if re.match(r"\d+\. ", t) and len(t) < 90 and not t.startswith(story["match"]):
                end = j
                break
        picked = []
        for k, v in items[start:end]:
            raw = v.strip()
            if not raw or not first_sya(refs.get(k, "")):
                continue
            if len(raw) > 420 and picked:
                continue
            picked.append((k, v))
            if len(picked) >= 2:
                break
        if not picked:
            for k, v in items[start:end]:
                if first_sya(refs.get(k, "")):
                    picked = [(k, v)]
                    break
        if not picked:
            picked = [items[start]]
        volume = khandhaka_volume(story["kd"])
        sigla = "วิ.ม." if story["kd"] <= 10 else "วิ.จู."
        passages = []
        last = None
        for seg_id, raw in picked:
            hit = first_sya(refs.get(seg_id, ""))
            page_from = "break" if hit else ("carry" if last else None)
            if hit:
                last = hit
            cite_page = hit or last
            if cite_page and cite_page[0] != volume:
                raise SystemExit(f"{seg_id} sya {cite_page} != {volume}")
            passages.append({
                "id": seg_id,
                "scSegment": seg_id,
                "paliRoman": raw,
                "sha256": sha(raw),
                "cite": {
                    "volume": cite_page[0] if cite_page else volume,
                    "page": cite_page[1] if cite_page else None,
                    "pageFrom": page_from,
                    "sigla": sigla,
                    "scSegment": seg_id,
                    "item": None,
                },
                "paraphraseTh": "",
                "terms": [],
            })
        uid = f"kd{story['kd']}-{len([u for u in units if u['scId'].endswith(str(story['kd']))]) + 1}"
        # stable id from heading
        slug = re.sub(r"[^a-z0-9]+", "-", story["match"].lower()).strip("-")
        uid = f"kd{story['kd']}-{slug[:40]}"
        unit = {
            "id": uid,
            "anchorId": "v0" + str(volume) + "-" + uid,
            "volume": volume,
            "sectionId": f"kd{story['kd']}",
            "kind": "chapter",
            "scId": f"pli-tv-kd{story['kd']}",
            "number": story["kd"],
            "order": order,
            "titleTh": story["title"],
            "titleRoman": story["match"],
            "summary": story["summary"],
            "verify": [],
            "people": ["buddha"] + story["people"],
            "places": [],
            "dhammaIds": [],
            "passages": passages,
            "penalty": "มหาวรรค" if volume <= 5 else "จุลวรรค",
        }
        # places from text of the picked window
        blob = " ".join(v for _, v in items[start:end][:40])
        for needle, phrase, pid, *_rest in PLACES:
            if needle in blob and pid not in unit["places"]:
                unit["places"].append(pid)
                place_eps.setdefault(pid, []).append({"unitId": uid, "textTh": story["title"]})
        order += 1
        units.append(unit)
        by_title[story["title"]] = uid
        for pid in unit["people"]:
            people_ids.setdefault(pid, []).append({"unitId": uid, "textTh": story["title"], "cite": TSC_cite(passages[-1])})
    return units

def load_parivara(start_order, people_ids, place_eps):
    from glosses_pvr import CHAPTERS
    text_root = ROOT / "tools/raw/bilara/root/pli/ms/vinaya/pli-tv-pvr"
    ref_root = ROOT / "tools/raw/bilara/reference/pli/ms/vinaya/pli-tv-pvr"
    units = []
    order = start_order
    for index, story in enumerate(CHAPTERS, start=1):
        data = json.loads((text_root / f"{story['file']}_root-pli-ms.json").read_text())
        refs = json.loads((ref_root / f"{story['file']}_reference.json").read_text())
        items = list(data.items())
        start = None
        for i, (k, v) in enumerate(items):
            if v.strip().startswith(story["match"]):
                start = i
                break
        if start is None:
            raise SystemExit("missing parivara heading " + story["match"])
        picked = []
        for k, v in items[start:]:
            raw = v.strip()
            if not raw or not first_sya(refs.get(k, "")):
                continue
            if len(raw) > 420 and picked:
                continue
            picked.append((k, v))
            if len(picked) >= 2:
                break
        if not picked:
            for k, v in items[start:]:
                if first_sya(refs.get(k, "")):
                    picked = [(k, v)]
                    break
        if not picked:
            picked = [items[start]]
        passages = []
        last = None
        for seg_id, raw in picked:
            hit = first_sya(refs.get(seg_id, ""))
            page_from = "break" if hit else ("carry" if last else None)
            if hit:
                last = hit
            cite_page = hit or last
            if cite_page and cite_page[0] != 8:
                raise SystemExit(f"{seg_id} sya {cite_page} != 8")
            passages.append({
                "id": seg_id,
                "scSegment": seg_id,
                "paliRoman": raw,
                "sha256": sha(raw),
                "cite": {
                    "volume": cite_page[0] if cite_page else 8,
                    "page": cite_page[1] if cite_page else None,
                    "pageFrom": page_from,
                    "sigla": "วิ.ป.",
                    "scSegment": seg_id,
                    "item": None,
                },
                "paraphraseTh": "",
                "terms": [],
            })
        uid = "pvr-" + str(index)
        unit = {
            "id": uid,
            "anchorId": "v08-" + uid,
            "volume": 8,
            "sectionId": "pvr",
            "kind": "chapter",
            "scId": story["file"],
            "number": index,
            "order": order,
            "titleTh": story["title"],
            "titleRoman": story["match"],
            "summary": story["summary"],
            "verify": [],
            "people": ["buddha"] + story["people"],
            "places": [],
            "dhammaIds": [],
            "passages": passages,
            "penalty": "ปริวาร",
        }
        order += 1
        units.append(unit)
        for pid in unit["people"]:
            people_ids.setdefault(pid, []).append({"unitId": uid, "textTh": story["title"], "cite": TSC_cite(passages[-1])})
    return units

def catalog(units, people_eps, place_eps):
    # The rest of the catalog is static study framing, not Pali.
    from frame import frame
    base = frame()
    base["units"] = units
    base["sections"] = [
        {"id": "parajika", "volume": 1, "titleTh": "ปาราชิกกัณฑ์", "titleRoman": "Pārājikakaṇḍa", "order": 1},
        {"id": "sanghadisesa", "volume": 1, "titleTh": "สังฆาทิเสสกัณฑ์", "titleRoman": "Saṅghādisesakaṇḍa", "order": 2},
        {"id": "aniyata", "volume": 1, "titleTh": "อนิยตกัณฑ์", "titleRoman": "Aniyatakaṇḍa", "order": 3},
        {"id": "nissaggiya", "volume": 2, "titleTh": "นิสสัคคียปาจิตตีย์กัณฑ์", "titleRoman": "Nissaggiyakaṇḍa", "order": 4},
        {"id": "pacittiya", "volume": 2, "titleTh": "ปาจิตตีย์กัณฑ์", "titleRoman": "Pācittiyakaṇḍa", "order": 5},
        {"id": "patidesaniya", "volume": 2, "titleTh": "ปาฏิเทสนียกัณฑ์", "titleRoman": "Pāṭidesanīyakaṇḍa", "order": 6},
        {"id": "sekhiya", "volume": 2, "titleTh": "เสขิยกัณฑ์", "titleRoman": "Sekhiyakaṇḍa", "order": 7},
        {"id": "samatha", "volume": 2, "titleTh": "อธิกรณสมถะ", "titleRoman": "Adhikaraṇasamatha", "order": 8},
        {"id": "bi-parajika", "volume": 3, "titleTh": "ปาราชิกของภิกษุณี", "titleRoman": "Pārājika", "order": 9},
        {"id": "bi-sanghadisesa", "volume": 3, "titleTh": "สังฆาทิเสสของภิกษุณี", "titleRoman": "Saṅghādisesa", "order": 10},
        {"id": "bi-nissaggiya", "volume": 3, "titleTh": "นิสสัคคีย์ของภิกษุณี", "titleRoman": "Nissaggiya", "order": 11},
        {"id": "bi-pacittiya", "volume": 3, "titleTh": "ปาจิตตีย์ของภิกษุณี", "titleRoman": "Pācittiya", "order": 12},
        {"id": "bi-patidesaniya", "volume": 3, "titleTh": "ปาฏิเทสนียะของภิกษุณี", "titleRoman": "Pāṭidesanīya", "order": 13},
        {"id": "bi-sekhiya", "volume": 3, "titleTh": "เสขิยะของภิกษุณี", "titleRoman": "Sekhiya", "order": 14},
        {"id": "bi-samatha", "volume": 3, "titleTh": "อธิกรณสมถะ", "titleRoman": "Adhikaraṇasamatha", "order": 15},
    ]
    names = {
        1: "มหาขันธกะ", 2: "อุโบสถขันธกะ", 3: "วัสสูปนายิกขันธกะ", 4: "ปวารณาขันธกะ",
        5: "จัมมขันธกะ", 6: "เภสัชชขันธกะ", 7: "กฐินขันธกะ", 8: "จีวรขันธกะ",
        9: "จัมเปยยขันธกะ", 10: "โกสัมพกขันธกะ",
        11: "กรรมขันธกะ", 12: "ปาริวาสิกขันธกะ", 13: "สมุจจยขันธกะ", 14: "สมถขันธกะ",
        15: "ขุททกวัตถุขันธกะ", 16: "เสนาสนขันธกะ", 17: "สังฆเภทกขันธกะ", 18: "วัตรขันธกะ",
        19: "ปาติโมกขฐานขันธกะ", 20: "ภิกขุนีขันธกะ", 21: "ปัญจสติกขันธกะ", 22: "สัตตสติกขันธกะ",
    }
    for n, title in names.items():
        base["sections"].append({
            "id": f"kd{n}",
            "volume": 4 if n <= 4 else 5 if n <= 10 else 6 if n <= 14 else 7,
            "titleTh": title,
            "titleRoman": f"Khandhaka {n}",
            "order": 20 + n,
        })
    base["sections"].append({
        "id": "pvr",
        "volume": 8,
        "titleTh": "ปริวาร",
        "titleRoman": "Parivāra",
        "order": 50,
    })
    for n in range(9, 46):
        vols = [u for u in units if u["volume"] == n]
        if not vols:
            continue
        title = next(v["titleTh"] for v in base["volumes"] if v["n"] == n)
        base["sections"].append({
            "id": f"corpus-{n}",
            "volume": n,
            "titleTh": title,
            "titleRoman": title,
            "order": 100 + n,
        })
        vol = next(v for v in base["volumes"] if v["n"] == n)
        vol["status"] = "ready"
        vol["overview"] = (
            f"เล่ม {n} {title} มี {len(vols)} บทในแอปนี้ "
            "แต่ละบทยกบาลีสั้น ๆ พร้อมเลขหน้าจากไฟล์อ้างอิง sya "
            "คำอธิบายภาษาไทยบอกที่ประทับและหัวข้อในต้นฉบับ "
            "ทีฆนิกายสามสิบสี่สูตรและมัชฌิมนิกายหนึ่งร้อยห้าสิบสองสูตรเขียนเป็นเรื่องให้เห็นเหตุการณ์"
        )
        vol["furtherStudy"] = "อ่านทีละบทตามลำดับในเล่ม บาลีที่ใช้เป็นที่อ้างอิงไม่ถูกอ่านออกเสียง เล่มที่อยู่ก่อนหน้าในปิฎกเดียวกันช่วยให้เห็นว่าบทนี้ต่อจากชุดใด"
    for person in base["people"]:
        person["episodes"] = people_eps.get(person["id"], [])
    for place in base["places"]:
        place["episodes"] = place_eps.get(place["id"], [])
    by_dhamma = {row["id"]: row for row in base["dhammas"]}
    title_links = {
        "สัปดาห์แรกใต้ต้นโพธิ์": ["paticca"],
        "พบปัญจวัคคีย์ที่ป่าอิสิปตนะ": ["sacca", "magga"],
    }
    for unit in units:
        ids = title_links.get(unit["titleTh"])
        if not ids:
            continue
        unit["dhammaIds"] = ids
        for did in ids:
            by_dhamma[did]["unitIds"].append(unit["id"])
    from dhammas import LINKS
    from link_suttas import link_dhammas
    link_dhammas(units, by_dhamma, LINKS)
    from quiz_topics import topic_quizzes
    base["quiz"] = quizzes(units) + topic_quizzes(base, units)
    bind_plans(base["plans"], units)
    return base

def bind_plans(plans, units):
    by_title = {}
    for unit in units:
        by_title.setdefault(unit["titleTh"], unit)
    for plan in plans:
        for step in plan["steps"]:
            title = step.get("titleTh")
            if not title:
                continue
            unit = by_title.get(title)
            if unit is None:
                raise SystemExit("plan missing unit " + title)
            step["unitId"] = unit["id"]
            step["volume"] = unit["volume"]

def quizzes(units):
    by_class = {}
    for u in units:
        by_class.setdefault(u["penalty"], []).append(u["penalty"])
    penalties = ["ปาราชิก", "สังฆาทิเสส", "อนิยต", "นิสสัคคิยปาจิตตีย์", "ปาจิตตีย์", "ปาฏิเทสนียะ", "เสขิยะ", "อธิกรณสมถะ"]
    out = []
    n = 0
    def add(u, question, answer, choices, explain):
        nonlocal n
        n += 1
        out.append({
            "id": "q" + str(n),
            "scope": "vol-" + str(u["volume"]),
            "type": "mcq",
            "q": question,
            "choices": choices,
            "answer": answer,
            "explain": explain,
            "ref": {"unitId": u["id"]},
        })
    for u in units:
        if u["volume"] == 1:
            wrong = [p for p in penalties if p != u["penalty"]][:3]
            add(u, "สิกขาบท「" + u["titleTh"] + "」อยู่ในชั้นใดของภิกขุวิภังค์", u["penalty"], [u["penalty"]] + wrong, "ตัวบทจัดสิกขาบทนี้ไว้ในชั้น" + u["penalty"])
            add(u, "「" + u["titleTh"] + "」อยู่ในเล่มใดของมหาวิภังค์ฉบับสยามรัฐ", "เล่ม ๑", ["เล่ม ๑", "เล่ม ๒", "เล่ม ๓", "เล่ม ๘"], "ปาราชิก สังฆาทิเสส และอนิยตอยู่ในเล่ม ๑")
    vol2_units = [u for u in units if u["volume"] == 2]
    for u in vol2_units[:40]:
        wrong = [p for p in penalties if p != u["penalty"]][:3]
        add(u, "สิกขาบท「" + u["titleTh"] + "」อยู่ในชั้นใด", u["penalty"], [u["penalty"]] + wrong, "ดูตัวบทของ " + u["scId"])
    vol3_units = [u for u in units if u["volume"] == 3]
    for u in vol3_units[:40]:
        wrong = [p for p in penalties if p != u["penalty"]][:3]
        add(u, "สิกขาบท「" + u["titleTh"] + "」อยู่ในชั้นใดของภิกขุนีวิภังค์", u["penalty"], [u["penalty"]] + wrong, "ดูตัวบทของ " + u["scId"])
    khandha = {
        1: "มหาขันธกะ", 2: "อุโบสถขันธกะ", 3: "วัสสูปนายิกขันธกะ", 4: "ปวารณาขันธกะ",
        5: "จัมมขันธกะ", 6: "เภสัชชขันธกะ", 7: "กฐินขันธกะ", 8: "จีวรขันธกะ",
        9: "จัมเปยยขันธกะ", 10: "โกสัมพกขันธกะ",
        11: "กรรมขันธกะ", 12: "ปาริวาสิกขันธกะ", 13: "สมุจจยขันธกะ", 14: "สมถขันธกะ",
        15: "ขุททกวัตถุขันธกะ", 16: "เสนาสนขันธกะ", 17: "สังฆเภทกขันธกะ", 18: "วัตรขันธกะ",
        19: "ปาติโมกขฐานขันธกะ", 20: "ภิกขุนีขันธกะ", 21: "ปัญจสติกขันธกะ", 22: "สัตตสติกขันธกะ",
    }
    for u in units:
        if u["volume"] in (4, 5):
            answer = khandha[u["number"]]
            wrong = [name for name in list(khandha.values())[:10] if name != answer][:3]
            add(u, "เรื่อง「" + u["titleTh"] + "」อยู่ในขันธกะใด", answer, [answer] + wrong, u["summary"].split("\n")[0])
            add(u, "เรื่อง「" + u["titleTh"] + "」อยู่ในเล่มใดของมหาวรรค", "เล่ม " + str(u["volume"]), ["เล่ม 4", "เล่ม 5", "เล่ม 1", "เล่ม 8"], "มหาขันธกะถึงปวารณาอยู่ในเล่ม ๔ จัมมะถึงโกสัมพีอยู่ในเล่ม ๕")
        elif u["volume"] in (6, 7):
            answer = khandha[u["number"]]
            wrong = [name for name in list(khandha.values())[10:] if name != answer][:3]
            add(u, "เรื่อง「" + u["titleTh"] + "」อยู่ในขันธกะใด", answer, [answer] + wrong, u["summary"].split("\n")[0])
            add(u, "เรื่อง「" + u["titleTh"] + "」อยู่ในเล่มใดของจุลวรรค", "เล่ม " + str(u["volume"]), ["เล่ม 6", "เล่ม 7", "เล่ม 4", "เล่ม 8"], "กรรมถึงสมถะอยู่ในเล่ม ๖ ขุททกวัตถุถึงสัตตสติกะอยู่ในเล่ม ๗")
        elif u["volume"] == 8:
            add(u, "บท「" + u["titleTh"] + "」อยู่ในคัมภีร์ใด", "ปริวาร", ["ปริวาร", "มหาวรรค", "จุลวรรค", "มหาวิภังค์"], u["summary"].split("\n")[0])
            add(u, "บท「" + u["titleTh"] + "」อยู่ในเล่มใด", "เล่ม 8", ["เล่ม 8", "เล่ม 7", "เล่ม 3", "เล่ม 1"], "ปริวารคือวินัยเล่ม ๘")
    for vol in range(9, 46):
        group = [u for u in units if u["volume"] == vol]
        made = 0
        round_no = 0
        while made < 20 and group and round_no < 20:
            for u in group:
                if made >= 24:
                    break
                sigla = u["passages"][0]["cite"]["sigla"]
                if round_no == 0:
                    choices = ["เล่ม " + str(vol)]
                    for extra in (1, 8, 12, 34, 45):
                        label = "เล่ม " + str(extra)
                        if label not in choices:
                            choices.append(label)
                        if len(choices) == 4:
                            break
                    add(u, "บท「" + u["titleTh"] + "」อยู่ในเล่มใด", "เล่ม " + str(vol), choices, u["summary"].split("\n")[0][:180])
                elif round_no == 1:
                    pitaka = [u["penalty"]] + [x for x in ("วินัย", "สุตตันต", "อภิธรรม", "ปริวาร") if x != u["penalty"]]
                    add(u, "บท「" + u["titleTh"] + "」อยู่ในปิฎกใด", u["penalty"], pitaka[:4], "สุตตันตปิฎกคือเล่ม ๙ ถึง ๓๓ อภิธรรมปิฎกคือเล่ม ๓๔ ถึง ๔๕")
                else:
                    others = [x for x in ("วิ.มหา.", "ม.มู.", "อภิ.ป.", "ที.สี.", "สํ.ส.") if x != sigla]
                    add(u, "อักษรย่อของบท「" + u["titleTh"] + "」คือข้อใด", sigla, [sigla] + others[:3], "อักษรย่ออยู่ที่บรรทัดอ้างอิงของบท")
                made += 1
            round_no += 1
    vol1 = [q for q in out if q["scope"] == "vol-1"]
    vol2 = [q for q in out if q["scope"] == "vol-2"]
    vol3 = [q for q in out if q["scope"] == "vol-3"]
    vol4 = [q for q in out if q["scope"] == "vol-4"]
    vol5 = [q for q in out if q["scope"] == "vol-5"]
    counts = [len([q for q in out if q["scope"] == "vol-" + str(n)]) for n in range(1, 46)]
    short = [n for n in range(9, 46) if counts[n - 1] < 20]
    if counts[0] < 30 or counts[1] < 40 or counts[2] < 30 or any(counts[n - 1] < 20 for n in range(4, 46)) or short:
        raise SystemExit("quiz short " + str(counts))
    return out

if __name__ == "__main__":
    main()
