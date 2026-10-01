"""Quiz sets for dhamma, people, places and glossary. Every answer is read off the built catalog."""

ROLE_TH = {
    "bhikkhu": "ภิกษุ", "bhikkhuni": "ภิกษุณี", "upasaka": "อุบาสก", "upasika": "อุบาสิกา",
    "raja": "กษัตริย์", "brahmana": "พราหมณ์", "titthiya": "เดียรถีย์", "deva": "เทวดา พรหม หรือมาร",
    "other": "บุคคลอื่น",
}


def short(text, n=90):
    text = text.strip()
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def spread(pool, seed, k, avoid):
    out = []
    if not pool:
        return out
    step = 7 if len(pool) % 7 else 5
    i = seed % len(pool)
    tries = 0
    while len(out) < k and tries < len(pool) * 2:
        cand = pool[i]
        if cand not in avoid and cand not in out:
            out.append(cand)
        i = (i + step) % len(pool)
        tries += 1
    return out


def topic_quizzes(base, units):
    out = []
    unit_by_id = {u["id"]: u for u in units}

    def add(scope, question, answer, wrong, explain, href=None, unit_id=None):
        if len(wrong) < 3:
            raise SystemExit("quiz wrong choices short: " + question)
        ref = {"unitId": unit_id}
        if href:
            ref["href"] = href
        out.append({
            "id": f"{scope}-{len(out) + 1}",
            "scope": scope,
            "type": "mcq",
            "q": question,
            "choices": [answer] + wrong[:3],
            "answer": answer,
            "explain": explain,
            "ref": ref,
        })

    dhammas = base["dhammas"]
    cats = sorted({d["categoryTh"] for d in dhammas})
    items_of = {}
    for d in dhammas:
        items_of[d["id"]] = [short(i) for g in d["groups"] for i in (g.get("items") or [])]
    for n, d in enumerate(dhammas):
        href = "#/dhamma/" + d["id"]
        first_unit = (d.get("unitIds") or [None])[0]
        add("dhamma", "หมวดธรรม「" + d["titleTh"] + "」อยู่ในกลุ่มใด", d["categoryTh"],
            spread([c for c in cats if c != d["categoryTh"]], n, 3, set()),
            "หน้ารวมหมวดธรรมจัด" + d["titleTh"] + "ไว้ในกลุ่ม" + d["categoryTh"], href, first_unit)
        near = {d["id"], *d.get("relatedIds", [])}
        foreign = [i for o in dhammas if o["id"] not in near and o["categoryTh"] != d["categoryTh"] for i in items_of[o["id"]]]
        own = set(items_of[d["id"]])
        for gi, g in enumerate(d["groups"]):
            items = g.get("items") or []
            if len(items) < 2:
                continue
            for k in range(min(2, len(items))):
                answer = short(items[(k * 2 + gi) % len(items)])
                add("dhamma", "ข้อใดอยู่ใน「" + d["titleTh"] + " · " + g["titleTh"] + "」", answer,
                    spread(foreign, n * 13 + gi * 5 + k, 3, own),
                    "ข้อนี้อยู่ในหมวด" + d["titleTh"] + " หัวข้อ" + g["titleTh"], href, first_unit)

    people = base["people"]
    by_role = {}
    for p in people:
        by_role.setdefault(p["role"], []).append(p["names"]["th"])
    all_names = [p["names"]["th"] for p in people]
    roles = list(ROLE_TH.values())
    for n, p in enumerate(people):
        href = "#/people/" + p["id"]
        name = p["names"]["th"]
        label = ROLE_TH.get(p["role"], "บุคคลอื่น")
        eps = p.get("episodes") or []
        first_unit = next((e["unitId"] for e in eps if e.get("unitId")), None)
        if p["id"] != "buddha":
            add("people", name + " เป็นใครในพระไตรปิฎก", label,
                spread([r for r in roles if r != label], n, 3, set()),
                name + " อยู่ในกลุ่ม" + label + "ของหน้าบุคคล", href, first_unit)
        for e in eps:
            text = e.get("textTh") or ""
            if not text.startswith("เอตทัคคะ: "):
                continue
            title = text[len("เอตทัคคะ: "):]
            same = by_role.get(p["role"], [])
            pool = same if len(same) > 6 else all_names
            add("people", "ใครได้รับยกย่องเป็นเอตทัคคะในทาง「" + title + "」", name,
                spread(pool, n * 11 + len(out), 3, {name}),
                "เอกนิบาตอังคุตตรนิกายยกย่อง" + name + "ว่าเป็นเอตทัคคะในทาง" + title + " (" + e["cite"] + ")", href, e.get("unitId"))

    places = base["places"]
    place_th = {p["id"]: p["names"]["th"] for p in places}
    names = [p["names"]["th"] for p in places]
    for n, ev in enumerate(base["timeline"]):
        pid = ev.get("placeId")
        if not pid:
            continue
        answer = place_th[pid]
        add("places", "เหตุการณ์「" + ev["titleTh"] + "」เกิดที่ใด", answer,
            spread(names, n * 3 + 1, 3, {answer}), ev["textTh"], "#/place/" + pid, ev.get("unitId"))
    count = 0
    for u in units:
        if count >= 120:
            break
        if not u["places"] or not (u["scId"].startswith("dn") or u["scId"].startswith("mn")):
            continue
        pid = u["places"][0]
        answer = place_th[pid]
        avoid = {place_th[x] for x in u["places"]}
        add("places", "พระสูตร「" + u["titleTh"] + "」ต้นเรื่องกล่าวถึงที่ใด", answer,
            spread(names, count * 5 + 2, 3, avoid),
            "ต้นเรื่องของ " + u["scId"] + " กล่าวถึง" + answer, "#/place/" + pid, u["id"])
        count += 1

    glossary = base["glossary"]
    for n, g in enumerate(glossary):
        same = [x["glossTh"] for x in glossary if x.get("groupTh") == g.get("groupTh") and x["id"] != g["id"]]
        answer = short(g["glossTh"], 110)
        add("glossary", "ศัพท์ " + g["roman"] + " หมายถึงข้อใด", answer,
            [short(x, 110) for x in spread(same, n * 7 + 3, 3, {g["glossTh"]})],
            g["roman"] + ": " + g["glossTh"], "#/glossary/" + g["id"], None)

    for q in out:
        uid = q["ref"]["unitId"]
        if uid is not None and uid not in unit_by_id:
            raise SystemExit("quiz ref missing " + uid)
        if len(set(q["choices"])) != 4:
            raise SystemExit("quiz dup choices " + q["q"])
    return out
