"""Attach people and dhamma sets to units by locating a Pali needle in the pinned bilara text.

A needle is either a segment id (contains ":") or a lowercase substring of the Pali.
The build stops when a needle is not found, so every link points at text that exists.
"""
import json
import re
from pathlib import Path

from load_corpus import sigla_for

ROOT = Path(__file__).resolve().parents[1]
TEXT = ROOT / "tools/raw/bilara/root/pli/ms"
REF = ROOT / "tools/raw/bilara/reference/pli/ms"
VINAYA_SIGLA = {1: "วิ.มหา.", 2: "วิ.มหา.", 3: "วิ.ภิกฺขุนี.", 4: "วิ.ม.", 5: "วิ.ม.", 6: "วิ.จู.", 7: "วิ.จู.", 8: "วิ.ป."}

_files = None
_cache = {}


def _file(stem):
    global _files
    if _files is None:
        _files = {p.name.replace("_root-pli-ms.json", ""): p for p in TEXT.rglob("*_root-pli-ms.json")}
    path = _files.get(stem)
    if path is None:
        raise SystemExit("link: no bilara file " + stem)
    return path


def _load(stem):
    if stem not in _cache:
        path = _file(stem)
        data = json.loads(path.read_text())
        ref = REF / path.relative_to(TEXT)
        ref = Path(str(ref).replace("_root-pli-ms.json", "_reference.json"))
        refs = json.loads(ref.read_text()) if ref.exists() else {}
        _cache[stem] = (path, data, refs)
    return _cache[stem]


def locate(stem, needle, fallback_volume=None):
    path, data, refs = _load(stem)
    if ":" in needle:
        if needle not in data:
            raise SystemExit(f"link: segment {needle} not in {stem}")
        seg = needle
    else:
        seg = next((k for k, v in data.items() if needle.lower() in v.lower()), None)
        if seg is None:
            raise SystemExit(f"link: '{needle}' not in {stem}")
    hit = None
    passed = False
    for key in data:
        match = re.search(r"\bsya(\d+)\.(\d+)\b", refs.get(key, ""))
        if match:
            hit = (int(match.group(1)), int(match.group(2)))
            if passed:
                break
        if key == seg:
            if hit:
                break
            passed = True
    volume = hit[0] if hit else fallback_volume
    if "vinaya" in path.parts:
        sigla = VINAYA_SIGLA.get(volume, "วิ.")
    else:
        sigla = sigla_for(path, volume)
    if hit:
        cite = f"{sigla} เล่ม {hit[0]} หน้า {hit[1]} · {seg}"
    elif volume:
        cite = f"{sigla} เล่ม {volume} · {seg}"
    else:
        cite = f"{sigla} · {seg}"
    return seg, cite, volume


def _units_by_stem(units):
    rows = {}
    for unit in units:
        rows.setdefault(unit["scId"], []).append(unit)
    return rows


def _pick(rows, stem, unit_id, by_id):
    if unit_id:
        if unit_id not in by_id:
            raise SystemExit("link: no unit " + unit_id)
        return by_id[unit_id]
    found = rows.get(stem, [])
    return found[0] if len(found) == 1 else None


def link_people(units, people_eps, episodes):
    rows = _units_by_stem(units)
    by_id = {u["id"]: u for u in units}
    for row in episodes:
        pid, stem, needle, text = row[:4]
        unit = _pick(rows, stem, row[4] if len(row) > 4 else None, by_id)
        _seg, cite, volume = locate(stem, needle, unit["volume"] if unit else None)
        people_eps.setdefault(pid, []).append({
            "unitId": unit["id"] if unit else None,
            "volume": unit["volume"] if unit else volume,
            "textTh": text,
            "cite": cite,
        })
        if unit and pid not in unit["people"]:
            unit["people"].append(pid)


def link_dhammas(units, by_dhamma, links):
    rows = _units_by_stem(units)
    by_id = {u["id"]: u for u in units}
    for did, targets in links.items():
        if did not in by_dhamma:
            raise SystemExit("link: no dhamma " + did)
        for target in targets:
            stem, needle = target[:2]
            unit = _pick(rows, stem, target[2] if len(target) > 2 else None, by_id)
            if unit is None:
                raise SystemExit("link: no single unit for " + stem)
            locate(stem, needle, unit["volume"])
            if did not in unit["dhammaIds"]:
                unit["dhammaIds"].append(did)
            if unit["id"] not in by_dhamma[did]["unitIds"]:
                by_dhamma[did]["unitIds"].append(unit["id"])
