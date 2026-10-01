var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  TSC.shuffle = function (list, rng) {
    var rand = rng || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };

  TSC.quiz = {
    pool: function (scope) {
      var all = (TSC.DATA && TSC.DATA.quiz) || [];
      if (!scope || scope === "all") return all;
      if (scope === "vinaya") return all.filter(function (q) { return /^vol-[1-8]$/.test(q.scope) || q.scope === "vinaya-topics"; });
      return all.filter(function (q) { return q.scope === scope; });
    },
    draw: function (scope, rng) {
      var pool = TSC.shuffle(TSC.quiz.pool(scope), rng);
      return pool.slice(0, 10).map(function (q) {
        return Object.assign({}, q, { choices: TSC.shuffle(q.choices, rng) });
      });
    },
    record: function (entry) {
      var hist = TSC.store.get("quizHistory", []);
      hist.unshift(entry);
      TSC.store.set("quizHistory", hist.slice(0, 100));
    },
    history: function () { return TSC.store.get("quizHistory", []); },
    clear: function () { TSC.store.set("quizHistory", []); }
  };
})();
