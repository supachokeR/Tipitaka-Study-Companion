var TSC = globalThis.TSC || (globalThis.TSC = {});

(function () {
  TSC.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (key) {
      if (a[key] == null || a[key] === false) return;
      if (key === "class") node.className = a[key];
      else if (key === "html") node.innerHTML = a[key];
      else if (key.slice(0, 2) === "on" && typeof a[key] === "function") node.addEventListener(key.slice(2), a[key]);
      else if (key === "dataset") Object.assign(node.dataset, a[key]);
      else node.setAttribute(key, a[key] === true ? "" : String(a[key]));
    });
    (children || []).forEach(function (child) {
      if (child == null || child === false) return;
      node.append(typeof child === "string" || typeof child === "number" ? document.createTextNode(String(child)) : child);
    });
    return node;
  };

  TSC.p = function (className, text) {
    return TSC.el("p", { class: className + " tts-p" }, [text]);
  };

  TSC.h = function (level, text) {
    return TSC.el("h" + level, { class: "font-semibold text-[#C2410C]" }, [text]);
  };
})();
