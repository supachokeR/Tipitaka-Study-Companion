var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var KINDS = [
    ["question", "คำถาม"],
    ["research", "ข้อค้นคว้า"],
    ["general", "ทั่วไป"]
  ];

  function anchorFromRoute(route) {
    if (!route) return {};
    if (route.name === "unit") return { volume: Number(route.params[0]), unitId: route.params[2] };
    if (route.name === "volume") return { volume: Number(route.params[0]) };
    return {};
  }

  function tagList(note) {
    return TSC.el("div", { class: "flex flex-wrap gap-1" }, (note.tags || []).map(function (tag) {
      return TSC.el("span", { class: "rounded-full bg-[#F97316]/15 px-2 py-0.5 text-xs" }, [tag]);
    }));
  }

  TSC.modal = {
    voiceHelp: function () {
      var root = document.getElementById("modal-root");
      root.replaceChildren(TSC.el("div", { class: "fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center", role: "dialog", "aria-modal": "true", "aria-label": "วิธีติดตั้งเสียงไทย" }, [
        TSC.el("div", { class: "glass-card max-h-[80vh] w-full max-w-lg overflow-auto p-5" }, [
          TSC.h(2, "เครื่องนี้ยังไม่มีเสียงไทย"),
          TSC.p("mt-3", "แอปอ่านด้วยเสียงภาษาไทย (th-TH) ของเครื่อง ถ้ายังไม่ได้ติดตั้ง ให้เพิ่มเสียงตามระบบที่ใช้"),
          TSC.el("ul", { class: "mt-3 space-y-2 text-sm" }, [
            ["Windows", "Settings → Time & language → Speech → Add voices แล้วเลือก Thai"],
            ["macOS", "System Settings → Accessibility → Spoken Content → System voice → Manage Voices แล้วเพิ่ม Thai"],
            ["iOS", "Settings → Accessibility → Spoken Content → Voices → Thai"],
            ["Android", "Settings → System → Languages หรือแอป Text-to-speech แล้วติดตั้งชุดภาษาไทย"]
          ].map(function (row) {
            return TSC.el("li", {}, [TSC.el("strong", {}, [row[0] + ": "]), row[1]]);
          })),
          TSC.el("button", { type: "button", class: "tap mt-4 rounded-xl bg-[#F97316] px-4 text-white", "aria-label": "ปิดคำแนะนำเสียง", onclick: function () { root.replaceChildren(); } }, ["ปิด"])
        ])
      ]));
    }
  };

  TSC.passageView = function (passage) {
    var thai = TSC.transliterate(passage.paliRoman.replace(/<[^>]+>/g, ""));
    var line = TSC.el("div", { class: "mt-3" });
    var roman = TSC.el("p", { class: "mt-1 hidden font-serif leading-7 text-sm", lang: "pi-Latn" }, [passage.paliRoman.trim()]);
    var thaiP = TSC.el("p", { class: "font-serif text-lg leading-8", lang: "pi" }, [thai]);
    line.append(
      thaiP,
      roman,
      TSC.el("button", {
        type: "button",
        class: "mt-1 text-sm text-[#C2410C]",
        "aria-label": "สลับบาลีอักษรไทยกับโรมัน",
        onclick: function () {
          thaiP.classList.toggle("hidden");
          roman.classList.toggle("hidden");
        }
      }, ["สลับอักษรไทย / โรมัน"]),
      TSC.el("p", { class: "mt-1 text-sm text-[#C2410C]" }, [TSC.formatCite(passage.cite)])
    );
    return line;
  };

  TSC.notesPanel = {
    refresh: function (route) {
      var aside = document.getElementById("notes");
      var anchor = anchorFromRoute(route);
      var q = "";
      function draw() {
        var list = q ? TSC.notes.search(q) : TSC.notes.forAnchor(anchor);
        aside.replaceChildren(TSC.el("div", { class: "glass-card p-4" }, [
          TSC.h(2, "โน้ต"),
          TSC.el("form", {
            class: "mt-3 space-y-2",
            onsubmit: function (ev) {
              ev.preventDefault();
              var fd = new FormData(ev.target);
              var tags = String(fd.get("tags") || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
              TSC.notes.create({
                anchor: anchor,
                title: String(fd.get("title") || ""),
                body: String(fd.get("body") || ""),
                tags: tags,
                kind: String(fd.get("kind") || "general")
              });
              ev.target.reset();
              draw();
            }
          }, [
            TSC.el("input", { name: "title", required: true, placeholder: "หัวข้อ", "aria-label": "หัวข้อโน้ต", class: "w-full rounded-xl border px-3 py-2" }),
            TSC.el("textarea", { name: "body", required: true, placeholder: "คำถามหรือข้อค้นคว้า", "aria-label": "เนื้อความโน้ต", class: "h-24 w-full rounded-xl border px-3 py-2" }),
            TSC.el("input", { name: "tags", placeholder: "tag คั่นด้วยจุลภาค", "aria-label": "แท็ก", class: "w-full rounded-xl border px-3 py-2" }),
            TSC.el("select", { name: "kind", "aria-label": "ชนิดโน้ต", class: "w-full rounded-xl border px-3 py-2" }, KINDS.map(function (k) {
              return TSC.el("option", { value: k[0] }, [k[1]]);
            })),
            TSC.el("button", { type: "submit", class: "tap rounded-xl bg-[#F97316] px-4 text-white" }, ["บันทึกโน้ต"])
          ]),
          TSC.el("input", {
            class: "mt-3 w-full rounded-xl border px-3 py-2",
            placeholder: "ค้นในโน้ต",
            "aria-label": "ค้นในโน้ต",
            value: q,
            oninput: function (ev) { q = ev.target.value; draw(); }
          }),
          list.length ? TSC.el("button", {
            type: "button",
            class: "tap mt-3 rounded-xl border border-[#F97316] px-3 text-sm",
            "aria-label": "อ่านโน้ตทั้งหมด",
            onclick: function () { TSC.tts.readSelector(aside.querySelector("[data-note-list]")); }
          }, ["อ่านโน้ตทั้งหมด"]) : null,
          TSC.el("div", { class: "mt-3 space-y-3", "data-note-list": "" }, list.map(function (n) {
            var card = TSC.el("article", { class: "rounded-xl bg-white/60 p-3" }, [
              TSC.el("h3", { class: "font-semibold tts-p" }, [n.title]),
              TSC.p("text-sm", n.body),
              tagList(n)
            ]);
            card.append(TSC.el("div", { class: "mt-2 flex gap-3" }, [
              TSC.el("button", {
                type: "button",
                class: "tap text-sm text-[#C2410C]",
                "aria-label": "อ่านโน้ต " + n.title,
                onclick: function () { TSC.tts.readSelector(card); }
              }, ["อ่าน"]),
              TSC.el("button", {
                type: "button",
                class: "tap text-sm text-[#C2410C]",
                "aria-label": "ลบโน้ต",
                onclick: function () {
                  if (window.confirm("ลบโน้ตนี้หรือไม่")) {
                    TSC.notes.remove(n.id);
                    draw();
                  }
                }
              }, ["ลบ"])
            ]));
            return card;
          })),
          TSC.el("a", { href: "#/notes", class: "mt-3 inline-block text-sm text-[#C2410C]" }, ["ดูโน้ตทั้งหมด"])
        ]));
      }
      draw();
    }
  };

  TSC.mountChrome = function () {
    document.getElementById("storage-banner").hidden = true;
    document.addEventListener("tsc:storage-unavailable", function () {
      var banner = document.getElementById("storage-banner");
      banner.hidden = false;
      banner.textContent = "โน้ตจะไม่ถูกบันทึก — กรุณา export";
    });
    document.getElementById("search-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var value = document.getElementById("q").value.trim();
      location.hash = "#/search?q=" + encodeURIComponent(value);
    });
    document.getElementById("read-page").addEventListener("click", function () {
      TSC.tts.readPage();
    });
    var themeBtn = document.getElementById("theme-toggle");
    function paintTheme() {
      var dark = document.documentElement.dataset.theme === "dark";
      themeBtn.textContent = dark ? "โหมดสว่าง" : "โหมดมืด";
      themeBtn.setAttribute("aria-label", dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด");
      themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
    }
    if (themeBtn) {
      if (!document.documentElement.dataset.theme) document.documentElement.dataset.theme = TSC.store.get("theme", "light");
      paintTheme();
      themeBtn.addEventListener("click", function () {
        var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        TSC.store.set("theme", next);
        paintTheme();
      });
    }
    document.querySelectorAll("[data-pane]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.body.dataset.pane = btn.getAttribute("data-pane");
      });
    });
    document.body.dataset.pane = "read";
    var bar = document.getElementById("tts-bar");
    bar.querySelector("[data-act=prev]").addEventListener("click", function () { TSC.tts.prev(); });
    bar.querySelector("[data-act=toggle]").addEventListener("click", function () { TSC.tts.pause(); });
    bar.querySelector("[data-act=stop]").addEventListener("click", function () { TSC.tts.stop(); });
    bar.querySelector("[data-act=next]").addEventListener("click", function () { TSC.tts.next(); });
    bar.querySelectorAll("[data-rate]").forEach(function (btn) {
      btn.addEventListener("click", function () { TSC.tts.setRate(btn.getAttribute("data-rate")); });
    });
    var saved = TSC.store.get("ttsRate", "1");
    document.querySelectorAll("[data-rate]").forEach(function (btn) {
      var on = btn.getAttribute("data-rate") === String(saved);
      btn.classList.toggle("bg-[#F97316]", on);
      btn.classList.toggle("text-white", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };
})();
