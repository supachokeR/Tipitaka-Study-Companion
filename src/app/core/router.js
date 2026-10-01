var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  var routes = [
    [/^\/$/, "home"],
    [/^\/pitaka\/([a-z]+)$/, "pitaka"],
    [/^\/vol\/(\d+)$/, "volume"],
    [/^\/vol\/(\d+)\/([a-z0-9-]+)\/([a-z0-9-]+)$/, "unit"],
    [/^\/people$/, "people"],
    [/^\/people\/([a-z0-9-]+)$/, "person"],
    [/^\/dhamma$/, "dhamma"],
    [/^\/dhamma\/([a-z0-9-]+)$/, "dhammaOne"],
    [/^\/map$/, "map"],
    [/^\/place\/([a-z0-9-]+)$/, "place"],
    [/^\/glossary$/, "glossary"],
    [/^\/glossary\/([a-z0-9-]+)$/, "term"],
    [/^\/plan$/, "plan"],
    [/^\/search$/, "search"],
    [/^\/quiz$/, "quiz"],
    [/^\/quiz\/([a-z0-9-]+)$/, "quiz"],
    [/^\/progress$/, "progress"],
    [/^\/notes$/, "notes"],
    [/^\/about$/, "about"]
  ];

  TSC.parseHash = function (hash) {
    var raw = (hash || "#/").replace(/^#/, "") || "/";
    var bits = raw.split("?");
    var path = bits[0] || "/";
    if (path.charAt(0) !== "/") path = "/" + path;
    var query = new URLSearchParams(bits[1] || "");
    for (var i = 0; i < routes.length; i++) {
      var m = path.match(routes[i][0]);
      if (m) return { name: routes[i][1], params: m.slice(1), query: query, path: path };
    }
    return { name: "missing", params: [], query: query, path: path };
  };

  TSC.navigate = function (hash) {
    if (location.hash === hash) TSC.render();
    else location.hash = hash;
  };

  TSC.render = function () {
    var carry = TSC.tts && TSC.tts.takeAdvance();
    if (TSC.tts && !carry) TSC.tts.stop();
    var route = TSC.parseHash(location.hash || "#/");
    TSC.store.set("lastLocation", location.hash || "#/");
    var reader = document.getElementById("reader");
    reader.replaceChildren();
    var view = TSC.views[route.name] || TSC.views.missing;
    reader.append(view(route));
    if (TSC.notesPanel) TSC.notesPanel.refresh(route);
    var q = document.getElementById("q");
    if (q && route.name === "search") q.value = route.query.get("q") || "";
    if (carry && TSC.tts) TSC.tts.readSelector(reader, { keep: true });
  };

  TSC.router = {
    start: function () {
      window.addEventListener("hashchange", TSC.render);
      if (!location.hash) location.hash = "#/";
      else TSC.render();
    }
  };
})();
