"""Print the bilara files and first segment that contain each needle. Study aid only."""
import json
import sys
from pathlib import Path

TEXT = Path(__file__).resolve().parents[1] / "tools/raw/bilara/root/pli/ms"


def main():
    needles = [n.lower() for n in sys.argv[1:]]
    hits = {n: [] for n in needles}
    for path in sorted(TEXT.rglob("*_root-pli-ms.json")):
        data = json.loads(path.read_text())
        stem = path.name.replace("_root-pli-ms.json", "")
        for needle in needles:
            if len(hits[needle]) >= 8:
                continue
            for key, value in data.items():
                if needle in value.lower():
                    hits[needle].append(f"{stem} {key}")
                    break
    for needle, rows in hits.items():
        print(needle, "=>", "; ".join(rows) or "NONE")


if __name__ == "__main__":
    main()
