var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  function D() { return TSC.DATA; }

  function volume(n) {
    return (D().volumes || []).find(function (v) { return v.n === Number(n); });
  }

  function units(n) {
    return (D().units || []).filter(function (u) { return u.volume === Number(n); })
      .sort(function (a, b) { return a.order - b.order; });
  }

  function link(hash, text) {
    return TSC.el("a", { href: hash, class: "text-[#C2410C] underline-offset-2 hover:underline" }, [text]);
  }

  function crumbs(items) {
    var nav = TSC.el("nav", { class: "mb-3 text-sm", "aria-label": "เส้นทาง" });
    items.forEach(function (item, i) {
      if (i) nav.append(" / ");
      nav.append(item[1] ? link(item[1], item[0]) : item[0]);
    });
    return nav;
  }

  function readButton(label, scope) {
    return TSC.el("button", {
      type: "button",
      class: "tap rounded-xl border border-[#F97316] px-3 text-sm",
      "aria-label": "อ่าน" + label,
      onclick: function () { TSC.tts.readSelector(scope()); }
    }, ["อ่าน"]);
  }

  function section(title, bodyNodes) {
    var box = TSC.el("section", { class: "glass-card mt-4 p-4" });
    var head = TSC.el("div", { class: "flex items-center justify-between gap-2" }, [
      TSC.h(2, title),
      readButton(title, function () { return box; })
    ]);
    box.append(head);
    bodyNodes.forEach(function (n) { box.append(n); });
    return box;
  }

  function paras(text) {
    return String(text || "").split(/\n+/).filter(Boolean).map(function (line) {
      return TSC.p("mt-3 leading-8", line);
    });
  }

  TSC.views = {
    missing: function () {
      return TSC.el("div", { class: "glass-card p-6" }, [TSC.h(1, "ไม่พบหน้านี้"), link("#/", "กลับภาพรวม")]);
    },
    home: function () {
      var wrap = TSC.el("div", {}, [
        crumbs([["ภาพรวม"]]),
        TSC.h(1, "ศึกษาพระไตรปิฎกทีละเล่ม"),
        TSC.p("mt-2", "เนื้อหาชั้นพระไตรปิฎก ตามโครงฉบับสยามรัฐ ๔๕ เล่ม บาลีมาจาก Mahāsaṅgīti ผ่าน SuttaCentral และทับศัพท์เป็นอักษรไทย")
      ]);
      (D().home || []).forEach(function (block) {
        wrap.append(section(block.title, paras(block.body).concat([
          TSC.el("span", { class: "mt-2 inline-block text-xs text-[#C2410C]" }, ["เชิงโครง"])
        ])));
      });
      var list = TSC.el("div", { class: "mt-4 grid gap-3" });
      (D().pitakas || []).forEach(function (p) {
        list.append(TSC.el("a", { href: "#/pitaka/" + p.id, class: "glass-card block p-4" }, [
          TSC.el("h2", { class: "font-semibold" }, [p.nameTh]),
          TSC.p("text-sm", "เล่ม " + p.volumes[0] + "–" + p.volumes[p.volumes.length - 1])
        ]));
      });
      wrap.append(list);
      return wrap;
    },
    pitaka: function (route) {
      var p = (D().pitakas || []).find(function (x) { return x.id === route.params[0]; });
      if (!p) return TSC.views.missing();
      var wrap = TSC.el("div", {}, [crumbs([["ภาพรวม", "#/"], [p.nameTh]]), TSC.h(1, p.nameTh)]);
      p.volumes.forEach(function (n) {
        var vol = volume(n);
        wrap.append(TSC.el("a", { href: "#/vol/" + n, class: "glass-card mt-3 block p-4" }, [
          TSC.el("h2", { class: "font-semibold" }, ["เล่ม " + n + " " + (vol ? vol.titleTh : "")]),
          TSC.el("span", { class: "text-sm" }, [vol && vol.status === "ready" ? "มีเนื้อหา" : "กำลังจัดทำ"])
        ]));
      });
      return wrap;
    },
    volume: function (route) {
      var vol = volume(route.params[0]);
      if (!vol) return TSC.views.missing();
      var pitaka = (D().pitakas || []).find(function (p) { return p.id === vol.pitaka; });
      var wrap = TSC.el("div", {}, [
        crumbs([["ภาพรวม", "#/"], [pitaka ? pitaka.nameTh : "ปิฎก", "#/pitaka/" + vol.pitaka], ["เล่ม " + vol.n]]),
        TSC.h(1, "เล่ม " + vol.n + " " + vol.titleTh)
      ]);
      if (vol.status !== "ready") {
        wrap.append(TSC.p("mt-3", "กำลังจัดทำ"));
        return wrap;
      }
      var ids = units(vol.n).map(function (u) { return u.id; });
      wrap.append(TSC.p("mt-2", "อ่านแล้ว " + TSC.progress.percent(ids) + "%"));
      wrap.append(section("ภาพรวม", paras(vol.overview)));
      var grouped = {};
      units(vol.n).forEach(function (u) {
        grouped[u.sectionId] = grouped[u.sectionId] || [];
        grouped[u.sectionId].push(u);
      });
      Object.keys(grouped).forEach(function (sid) {
        var sec = (D().sections || []).find(function (s) { return s.id === sid; });
        var list = TSC.el("ol", { class: "mt-3 space-y-2" });
        grouped[sid].forEach(function (u) {
          list.append(TSC.el("li", {}, [
            link("#/vol/" + vol.n + "/" + u.sectionId + "/" + u.id, u.number + ". " + u.titleTh),
            TSC.progress.has(u.id) ? " · อ่านแล้ว" : ""
          ]));
        });
        wrap.append(section(sec ? sec.titleTh : sid, [list]));
      });
      wrap.append(section("ศึกษาต่อ", paras(vol.furtherStudy)));
      return wrap;
    },
    unit: function (route) {
      var volN = Number(route.params[0]);
      var unit = units(volN).find(function (u) { return u.id === route.params[2]; });
      var vol = volume(volN);
      if (!unit || !vol) return TSC.views.missing();
      var list = units(volN);
      var at = list.findIndex(function (u) { return u.id === unit.id; });
      var wrap = TSC.el("div", {}, [
        crumbs([
          ["ภาพรวม", "#/"],
          ["เล่ม " + vol.n, "#/vol/" + vol.n],
          [unit.titleTh]
        ]),
        TSC.h(1, unit.titleTh),
        TSC.p("text-sm", unit.scId + (unit.titleRoman ? " · " + unit.titleRoman : ""))
      ]);
      var nav = TSC.el("div", { class: "mt-3 flex gap-2" });
      if (list[at - 1]) nav.append(link("#/vol/" + volN + "/" + list[at - 1].sectionId + "/" + list[at - 1].id, "ก่อนหน้า"));
      if (list[at + 1]) nav.append(link("#/vol/" + volN + "/" + list[at + 1].sectionId + "/" + list[at + 1].id, "ถัดไป"));
      wrap.append(nav);
      wrap.append(TSC.el("button", {
        type: "button",
        class: "tap mt-3 rounded-xl border border-[#F97316] px-3",
        "aria-label": "อ่านแล้ว",
        onclick: function (ev) {
          TSC.progress.toggle(unit.id);
          ev.target.textContent = TSC.progress.has(unit.id) ? "อ่านแล้ว" : "ทำเครื่องหมายว่าอ่านแล้ว";
        }
      }, [TSC.progress.has(unit.id) ? "อ่านแล้ว" : "ทำเครื่องหมายว่าอ่านแล้ว"]));
      var summaryBits = paras(unit.summary);
      (unit.verify || []).forEach(function (v) { summaryBits.push(TSC.p("mt-2", "⚠️ " + v)); });
      wrap.append(section("สรุป", summaryBits));
      var passageNodes = (unit.passages || []).map(TSC.passageView);
      (unit.passages || []).forEach(function (p) {
        (p.terms || []).forEach(function (term) {
          passageNodes.push(TSC.p("mt-2 text-sm", TSC.transliterate(term.roman) + " (" + term.roman + ") " + term.glossTh));
        });
      });
      wrap.append(section("บาลี–ไทยเทียบ", passageNodes));
      var people = TSC.el("ul", { class: "mt-3 space-y-1" });
      (unit.people || []).forEach(function (id) {
        var person = (D().people || []).find(function (p) { return p.id === id; });
        if (person) people.append(TSC.el("li", {}, [link("#/people/" + id, person.names.th)]));
      });
      wrap.append(section("บุคคล", [people]));
      var places = TSC.el("ul", { class: "mt-3 space-y-1" });
      (unit.places || []).forEach(function (id) {
        var place = (D().places || []).find(function (p) { return p.id === id; });
        if (place) places.append(TSC.el("li", {}, [link("#/map", place.names.th)]));
      });
      wrap.append(section("สถานที่", [places]));
      return wrap;
    },
    people: function () {
      var wrap = TSC.el("div", {}, [crumbs([["ภาพรวม", "#/"], ["บุคคล"]]), TSC.h(1, "บุคคล")]);
      var roles = ["bhikkhu", "bhikkhuni", "upasaka", "upasika", "raja", "titthiya"];
      var labels = { bhikkhu: "ภิกษุ", bhikkhuni: "ภิกษุณี", upasaka: "อุบาสก", upasika: "อุบาสิกา", raja: "กษัตริย์", titthiya: "เดียรถีย์" };
      roles.forEach(function (role) {
        var people = (D().people || []).filter(function (p) { return p.role === role; });
        if (!people.length) return;
        var list = TSC.el("ul", { class: "mt-2 space-y-1" });
        people.forEach(function (p) { list.append(TSC.el("li", {}, [link("#/people/" + p.id, p.names.th)])); });
        wrap.append(section(labels[role], [list]));
      });
      return wrap;
    },
    person: function (route) {
      var person = (D().people || []).find(function (p) { return p.id === route.params[0]; });
      if (!person) return TSC.views.missing();
      var eps = TSC.el("div", {});
      (person.episodes || []).forEach(function (ep) {
        eps.append(TSC.p("mt-3", ep.textTh + " " + (ep.cite || "")));
      });
      return TSC.el("div", {}, [
        crumbs([["บุคคล", "#/people"], [person.names.th]]),
        TSC.h(1, person.names.th),
        TSC.p("mt-2", person.names.roman || ""),
        section("เรื่องราว", [TSC.p("mt-3", person.blurb || "")].concat(Array.from(eps.childNodes)))
      ]);
    },
    dhamma: function () {
      var wrap = TSC.el("div", {}, [crumbs([["ภาพรวม", "#/"], ["หมวดธรรม"]]), TSC.h(1, "หมวดธรรม")]);
      (D().dhammas || []).forEach(function (d) {
        wrap.append(TSC.el("a", { href: "#/dhamma/" + d.id, class: "glass-card mt-3 block p-4" }, [d.titleTh]));
      });
      return wrap;
    },
    dhammaOne: function (route) {
      var d = (D().dhammas || []).find(function (x) { return x.id === route.params[0]; });
      if (!d) return TSC.views.missing();
      var links = (d.unitIds || []).map(function (id) {
        var u = (D().units || []).find(function (x) { return x.id === id; });
        return u ? TSC.el("li", {}, [link("#/vol/" + u.volume + "/" + u.sectionId + "/" + u.id, u.titleTh)]) : null;
      }).filter(Boolean);
      var body = paras(d.summaryTh);
      body.push(links.length ? TSC.el("ul", { class: "mt-3 space-y-1" }, links) : TSC.p("mt-3", "ยังไม่มีสูตรในชุดข้อมูลนี้"));
      return TSC.el("div", {}, [crumbs([["หมวดธรรม", "#/dhamma"], [d.titleTh]]), section(d.titleTh, body)]);
    },
    map: function () {
      var wrap = TSC.el("div", {}, [
        crumbs([["ภาพรวม", "#/"], ["พุทธประวัติและแผนที่"]]),
        TSC.h(1, "แผนที่ชมพูทวีป"),
        TSC.p("mt-2", "แผนที่อย่างย่อเพื่อการเรียน ไม่ใช่แผนที่ภูมิศาสตร์")
      ]);
      var ns = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 100 70");
      svg.setAttribute("class", "mt-4 w-full rounded-2xl bg-white/70");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "แผนที่อย่างย่อชมพูทวีป");
      var shape = document.createElementNS(ns, "path");
      shape.setAttribute("d", "M30 12 C40 8 60 10 72 20 C80 32 78 48 68 58 C55 66 38 62 28 50 C18 38 20 20 30 12 Z");
      shape.setAttribute("fill", "#FDE68A");
      shape.setAttribute("stroke", "#C2410C");
      shape.setAttribute("stroke-width", "0.6");
      svg.append(shape);
      (D().places || []).forEach(function (p) {
        if (!p.map) return;
        var dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", p.map.x);
        dot.setAttribute("cy", p.map.y);
        dot.setAttribute("r", "1.4");
        dot.setAttribute("fill", "#F97316");
        var label = document.createElementNS(ns, "text");
        label.setAttribute("x", p.map.x + 2);
        label.setAttribute("y", p.map.y);
        label.setAttribute("font-size", "2.4");
        label.textContent = p.names.th;
        svg.append(dot, label);
      });
      wrap.append(svg);
      (D().timeline || []).forEach(function (ev) {
        var line = ev.textTh;
        wrap.append(TSC.p("mt-3", ev.titleTh + " — " + line));
      });
      return wrap;
    },
    glossary: function () {
      var list = TSC.el("ul", { class: "mt-3 space-y-2" });
      (D().glossary || []).forEach(function (g) {
        list.append(TSC.el("li", {}, [link("#/glossary/" + g.id, TSC.transliterate(g.roman) + " · " + g.roman)]));
      });
      return TSC.el("div", {}, [crumbs([["ภาพรวม", "#/"], ["ศัพท์"]]), TSC.h(1, "ศัพท์บาลี"), list]);
    },
    term: function (route) {
      var g = (D().glossary || []).find(function (x) { return x.id === route.params[0]; });
      if (!g) return TSC.views.missing();
      return TSC.el("div", {}, [
        crumbs([["ศัพท์", "#/glossary"], [g.roman]]),
        section(TSC.transliterate(g.roman), [
          TSC.p("mt-3", g.roman),
          TSC.p("mt-2", g.glossTh)
        ])
      ]);
    },
    plan: function () {
      var wrap = TSC.el("div", {}, [crumbs([["ภาพรวม", "#/"], ["แผนการศึกษา"]]), TSC.h(1, "แผนการศึกษา")]);
      (D().plans || []).forEach(function (plan) {
        var list = TSC.el("ol", { class: "mt-3 space-y-1" });
        plan.volumes.forEach(function (n) {
          var vol = volume(n);
          list.append(TSC.el("li", {}, [link("#/vol/" + n, "เล่ม " + n + " " + (vol ? vol.titleTh : ""))]));
        });
        wrap.append(section(plan.title, [TSC.p("mt-3", plan.body), list]));
      });
      var table = TSC.el("table", { class: "mt-3 w-full text-left text-sm" }, [
        TSC.el("tr", {}, [TSC.el("th", {}, ["อักษรย่อ"]), TSC.el("th", {}, ["เล่ม"]), TSC.el("th", {}, ["คัมภีร์"])])
      ]);
      (D().abbreviations || []).forEach(function (a) {
        table.append(TSC.el("tr", {}, [
          TSC.el("td", { class: "pr-3" }, [a.sigla]),
          TSC.el("td", { class: "pr-3" }, [String(a.volume)]),
          TSC.el("td", {}, [a.workTh])
        ]));
      });
      wrap.append(section("ตารางคำย่อ", [table]));
      return wrap;
    },
    search: function (route) {
      var q = route.query.get("q") || "";
      var hits = q ? TSC.search.query(q) : [];
      var list = TSC.el("div", { class: "mt-4 space-y-3" });
      hits.forEach(function (hit) {
        var snippet = hit.text.slice(0, 180);
        var mark = TSC.el("p", { class: "text-sm" });
        if (q && snippet.toLowerCase().indexOf(q.toLowerCase()) !== -1) {
          var i = snippet.toLowerCase().indexOf(q.toLowerCase());
          mark.append(snippet.slice(0, i), TSC.el("mark", {}, [snippet.slice(i, i + q.length)]), snippet.slice(i + q.length));
        } else mark.append(snippet);
        list.append(TSC.el("a", { href: hit.route, class: "glass-card block p-3" }, [
          TSC.el("div", { class: "text-xs text-[#C2410C]" }, [hit.type]),
          TSC.el("h2", { class: "font-semibold" }, [hit.title]),
          mark
        ]));
      });
      return TSC.el("div", {}, [TSC.h(1, "ค้นหา"), q ? TSC.p("mt-2", "พบ " + hits.length + " รายการ") : TSC.p("mt-2", "พิมพ์คำค้นที่แถบบน"), list]);
    },
    quiz: function (route) {
      var scope = route.params[0] || "";
      var wrap = TSC.el("div", {}, [crumbs([["ภาพรวม", "#/"], ["แบบทดสอบ"]]), TSC.h(1, "แบบทดสอบ")]);
      if (!scope) {
        ["vol-1", "vol-2", "vinaya"].forEach(function (id) {
          wrap.append(TSC.el("a", { href: "#/quiz/" + id, class: "glass-card mt-3 block p-4" }, [id === "vinaya" ? "วินัยปิฎก" : "เล่ม " + id.slice(4)]));
        });
        var hist = TSC.el("ul", { class: "mt-3 space-y-1" });
        TSC.quiz.history().forEach(function (h) {
          hist.append(TSC.el("li", {}, [h.scope + " " + h.score + "/" + h.total + " " + h.date]));
        });
        wrap.append(section("ประวัติคะแนน", [
          hist,
          TSC.el("button", { type: "button", class: "tap mt-3 text-sm", onclick: function () { TSC.quiz.clear(); location.hash = "#/quiz"; } }, ["ล้างประวัติ"])
        ]));
        return wrap;
      }
      var round = TSC.quiz.draw(scope);
      var cursor = 0;
      var score = 0;
      var box = TSC.el("div", { class: "glass-card mt-4 p-4" });
      function show() {
        box.replaceChildren();
        if (!round.length) {
          box.append(TSC.p("", "ยังไม่มีข้อในชุดนี้"));
          return;
        }
        if (cursor >= round.length) {
          TSC.quiz.record({ scope: scope, score: score, total: round.length, date: new Date().toISOString() });
          box.append(TSC.h(2, "ได้ " + score + " จาก " + round.length));
          return;
        }
        var q = round[cursor];
        box.append(TSC.p("", (cursor + 1) + ". " + q.q));
        q.choices.forEach(function (choice) {
          box.append(TSC.el("button", {
            type: "button",
            class: "tap mt-2 block w-full rounded-xl border px-3 text-left",
            onclick: function (ev) {
              var ok = choice === q.answer;
              if (ok) score += 1;
              ev.target.textContent = (ok ? "ถูก " : "ผิด ") + choice;
              box.append(TSC.p("mt-3", (ok ? "เฉลยถูก: " : "เฉลย: " + q.answer + " ") + q.explain));
              var unit = (D().units || []).find(function (u) { return u.id === q.ref.unitId; });
              if (unit) box.append(link("#/vol/" + unit.volume + "/" + unit.sectionId + "/" + unit.id, "ไปที่สิกขาบท"));
              box.append(TSC.el("button", { type: "button", class: "tap mt-3 rounded-xl bg-[#F97316] px-4 text-white", onclick: function () { cursor += 1; show(); } }, ["ข้อถัดไป"]));
              box.querySelectorAll("button").forEach(function (b, i) { if (i < q.choices.length) b.disabled = true; });
            }
          }, [choice]));
        });
      }
      show();
      wrap.append(box);
      return wrap;
    },
    progress: function () {
      var wrap = TSC.el("div", {}, [TSC.h(1, "ความคืบหน้า")]);
      (D().pitakas || []).forEach(function (p) {
        var ids = (D().units || []).filter(function (u) { return p.volumes.indexOf(u.volume) !== -1; }).map(function (u) { return u.id; });
        wrap.append(section(p.nameTh, [TSC.p("mt-3", TSC.progress.percent(ids) + "%")]));
      });
      return wrap;
    },
    notes: function () {
      var list = TSC.el("div", { class: "mt-4 space-y-3" });
      TSC.notes.all().forEach(function (n) {
        list.append(TSC.el("article", { class: "glass-card p-4" }, [
          TSC.el("h2", { class: "font-semibold" }, [n.title]),
          TSC.p("mt-2", n.body),
          TSC.p("text-sm", (n.tags || []).join(", "))
        ]));
      });
      var tools = TSC.el("div", { class: "mt-3 flex flex-wrap gap-2" }, [
        TSC.el("button", { type: "button", class: "tap rounded-xl bg-[#F97316] px-3 text-white", onclick: function () { TSC.io.download(true); } }, ["ส่งออก JSON"]),
        TSC.el("button", {
          type: "button",
          class: "tap rounded-xl border px-3",
          onclick: function () {
            var raw = window.prompt("วาง JSON");
            if (!raw) return;
            try {
              var mode = window.confirm("ตกลง = รวมกับของเดิม, ยกเลิก = แทนที่") ? "merge" : "replace";
              TSC.io.importPayload(JSON.parse(raw), mode);
              location.hash = "#/notes";
              TSC.render();
            } catch (err) {
              window.alert(err.message);
            }
          }
        }, ["นำเข้า JSON"])
      ]);
      return TSC.el("div", {}, [TSC.h(1, "โน้ตทั้งหมด"), tools, list]);
    },
    about: function () {
      var s = (D().sources && D().sources[0]) || {};
      return TSC.el("div", {}, [
        TSC.h(1, "เกี่ยวกับและลิขสิทธิ์"),
        section("แหล่งบาลี", paras(
          "ตัวบทบาลีมาจาก suttacentral/bilara-data สาขา published คอมมิต " + (s.commit || "") +
          " โฟลเดอร์ root/pli/ms ฉบับ Mahāsaṅgīti ตัวบทโบราณเป็น public domain ตามคำชี้แจงของ SuttaCentral แอปไม่นำคำแปลใน Bilara เข้ามา และไม่คัดลอกคำแปลไทย\n" +
          "เลขหน้ามาจากโทเคน sya ในไฟล์ reference ซึ่งให้เล่มกับหน้า ไม่มีเลขข้อ จึงแสดงอักษรย่อ เล่ม หน้า คู่กับรหัส SuttaCentral\n" +
          "โค้ดของแอปเป็น MIT ถอดความ บทความ และแบบทดสอบเป็น CC BY 4.0"
        )),
        section("วิธีอ่านเลขอ้างอิง", paras(
          "ตัวอย่าง วิ.มหา. เล่ม 1 หน้า 1 · pli-tv-bu-vb-pj1:1.1.1 หมายถึงหน้าตามรหัส sya1.1 ของภิกขุวิภังค์ ปาราชิกที่ 1\n" +
          "รหัส MN 10 คือสติปัฏฐานสูตรในมัชฌิมนิกาย ซึ่งสารบัญฉบับสยามรัฐอยู่เล่ม 12 เนื้อหายังไม่เข้าชุดนี้"
        ))
      ]);
    }
  };
})();
