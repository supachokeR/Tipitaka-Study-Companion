"""Who appears in the origin story of each Vibhaṅga rule, read from the Pali before the rule is laid down."""
import json
import re
from pathlib import Path

from people_data import p

ROOT = Path(__file__).resolve().parent / "raw/bilara/root/pli/ms/vinaya"

CAST = [
    (r"chabbaggiy(?:o|ā|e|ehi|ānaṁ|āpi)", "พวกฉัพพัคคีย์", "chabbaggiya"),
    (r"sattarasavaggiy(?:o|ā|e|aṁ|ānaṁ)", "พวกสัตตรสวัคคีย์", "sattarasavaggiya"),
    (r"thullanand(?:ā|aṁ|āya|āti)", "ภิกษุณีถุลลนันทา", "thullananda"),
    (r"sundarīnand(?:ā|aṁ|āya)", "ภิกษุณีสุนทรีนันทา", "sundarinanda"),
    (r"caṇḍakāḷ(?:ī|iṁ)", "ภิกษุณีจัณฑกาฬี", "candakali"),
    (r"upanand(?:a|o|assa|aṁ|ena)", "พระอุปนันทศากยบุตร", "upananda"),
    (r"udāy(?:i|ī|inā|issa|iṁ)", "พระอุทายี", "udayi"),
    (r"seyyasak(?:a|o|assa|aṁ)", "พระเสยยสกะ", "seyyasaka"),
    (r"ariṭṭh(?:a|o|assa|aṁ|ena)", "ภิกษุอริฏฐะ", "arittha"),
    (r"sāgato", "พระสาคตะ", "sagata"),
    (r"devadatt(?:a|o|assa|aṁ)", "เทวทัต", "devadatta"),
    (r"kokālik(?:o|aṁ)", "ภิกษุโกกาลิกะ", "kokalika"),
    (r"pilindavacch(?:o|assa|aṁ|ena)", "พระปิลินทวัจฉะ", "pilindavaccha"),
    (r"dhaniy(?:o|assa)", "พระธนิยะ", "dhaniya"),
    (r"upasen(?:a|o|assa|aṁ)", "พระอุปเสนะ", "upasena"),
    (r"anuruddh(?:o|assa|aṁ)", "พระอนุรุทธะ", "anuruddha"),
    (r"sāriputt(?:o|assa|aṁ)", "พระสารีบุตร", "sariputta"),
    (r"ānand(?:a|o|assa|aṁ)", "พระอานนท์", "ananda"),
    (r"mahāpajāpat(?:i|ī|iṁ)", "พระนางมหาปชาบดี", "mahapajapati"),
    (r"uppalavaṇṇ(?:ā|aṁ|āya)", "ภิกษุณีอุบลวรรณา", "uppalavanna"),
    (r"visākh(?:ā|aṁ|āya|āpi)", "วิสาขามิคารมารดา", "visakha"),
    (r"belaṭṭhasīs(?:a|o|aṁ)", "พระเพลัฏฐสีสะ", "belatthasisa"),
]
PATTERNS = [(re.compile(r"\b" + rx + r"\b"), label, pid) for rx, label, pid in CAST]

NEW = [
    p("thullananda", "ภิกษุณีถุลลนันทา", "thullanandā", "bhikkhuni",
      "ภิกษุณีที่ภิกขุนีวิภังค์กล่าวถึงในเรื่องเกิดของสิกขาบทมากกว่าใคร ตัวบทเล่าว่าท่านเป็นพหูสูต พูดเก่ง และแกล้วกล้าในการแสดงธรรม แต่หลายครั้งประพฤติจนชาวบ้านหรือภิกษุณีด้วยกันติเตียน และเป็นเหตุให้ทรงบัญญัติสิกขาบท"),
    p("sundarinanda", "ภิกษุณีสุนทรีนันทา", "sundarīnandā", "bhikkhuni",
      "ภิกษุณีที่ภิกขุนีวิภังค์กล่าวถึงในเรื่องเกิดของสิกขาบทบางข้อ รายชื่อบทที่ตัวบทกล่าวถึงท่านอยู่ด้านล่าง"),
    p("candakali", "ภิกษุณีจัณฑกาฬี", "caṇḍakāḷī", "bhikkhuni",
      "ภิกษุณีที่ภิกขุนีวิภังค์กล่าวถึงในเรื่องเกิดของสิกขาบทหลายข้อ ส่วนใหญ่เป็นเรื่องการทะเลาะวิวาทและการไม่ยอมรับคำตัดสินของสงฆ์"),
    p("upananda", "พระอุปนันทศากยบุตร", "upananda sakyaputta", "bhikkhu",
      "ภิกษุที่ตัวบทวินัยกล่าวถึงในเรื่องเกิดของสิกขาบทหลายข้อ โดยเฉพาะเรื่องจีวรและการขอของจากคฤหัสถ์ เช่น นิสสัคคิยปาจิตตีย์ที่ห้ามภิกษุเข้าไปกำหนดจีวรที่เขายังไม่ได้ปวารณา"),
    p("sattarasavaggiya", "พวกสัตตรสวัคคีย์", "sattarasavaggiyā", "bhikkhu",
      "ภิกษุกลุ่มสิบเจ็ดรูปที่ตัวบทวินัยกล่าวถึงในเรื่องเกิดของสิกขาบทบางข้อ หลายครั้งเป็นฝ่ายที่ถูกพวกฉัพพัคคีย์รังแก"),
    p("seyyasaka", "พระเสยยสกะ", "seyyasaka", "bhikkhu",
      "ภิกษุในเรื่องเกิดของสังฆาทิเสสข้อแรก ตัวบทเล่าว่าท่านไม่ยินดีในพรหมจรรย์ พระอุทายีแนะวิธีผิด จึงเป็นเหตุให้ทรงบัญญัติสิกขาบทนั้น กรรมขันธกะยังเล่าว่าสงฆ์ลงนิยสกรรมแก่ท่าน"),
    p("arittha", "ภิกษุอริฏฐะ", "ariṭṭha", "bhikkhu",
      "ภิกษุที่เห็นผิดว่าธรรมที่ตรัสว่าเป็นอันตรายไม่เป็นอันตรายจริงแก่ผู้เสพ ภิกษุทั้งหลายตักเตือนแล้วไม่ยอมสละ จึงเป็นเหตุของปาจิตตีย์ข้อนั้น เรื่องเดียวกันอยู่ในอลคัททูปมสูตร"),
    p("belatthasisa", "พระเพลัฏฐสีสะ", "belaṭṭhasīsa", "bhikkhu",
      "ภิกษุที่ตัวบทวินัยกล่าวถึงในเรื่องเกิดของสิกขาบทบางข้อ ดูรายชื่อบทด้านล่าง"),
]


def _index():
    out = {}
    for path in ROOT.rglob("*_root-pli-ms.json"):
        if "-vb-" not in path.name:
            continue
        data = json.loads(path.read_text())
        for key, value in data.items():
            out.setdefault(key.split(":")[0], []).append((key, value))
    return out


def cast_vinaya(units, people_eps, cite):
    from frame import people
    index = _index()
    known = {row["id"] for row in people()}
    for u in units:
        if u["volume"] > 3 or not u["scId"].startswith("pli-tv-b"):
            continue
        rows = index.get(u["scId"])
        if not rows:
            continue
        stop = u["passages"][1]["scSegment"] if len(u["passages"]) > 1 else None
        origin = []
        for key, value in rows:
            if key == stop or len(origin) >= 60:
                break
            origin.append(value)
        text = " ".join(origin).lower()
        hits = []
        for rx, label, pid in PATTERNS:
            m = rx.search(text)
            if m:
                hits.append((m.start(), label, pid))
        hits.sort()
        if not hits:
            continue
        labels = [label for _pos, label, _pid in hits[:4]]
        u["summary"] = u["summary"].rstrip() + "\nผู้เกี่ยวข้องในเรื่องเกิดตามตัวบท: " + " ".join(labels)
        for _pos, label, pid in hits:
            if pid not in known:
                raise SystemExit("vinaya cast person missing " + pid)
            if pid not in u["people"]:
                u["people"].append(pid)
            eps = people_eps.setdefault(pid, [])
            if not any(ep.get("unitId") == u["id"] for ep in eps):
                eps.append({"unitId": u["id"], "textTh": u["titleTh"], "cite": cite(u["passages"][0])})
