(function () {
  var SOURCES = [
    "https://raw.githubusercontent.com/arslnb/zeus-plugins/main/index.json",
    "https://cdn.jsdelivr.net/gh/arslnb/zeus-plugins@main/index.json"
  ];

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(node, value) {
    node.textContent = value;
    return node;
  }

  function tag(value) {
    var el = document.createElement("span");
    el.className = "zeus-plugin-tag";
    return text(el, value);
  }

  function buildCard(plugin) {
    var card = document.createElement("article");
    card.className = "zeus-plugin-card";

    var h = document.createElement("h2");
    h.className = "zeus-plugin-name";
    text(h, plugin.name || plugin.id || "Unnamed plugin");
    card.appendChild(h);

    var summary = document.createElement("p");
    summary.className = "zeus-plugin-summary";
    text(summary, plugin.summary || "No summary provided.");
    card.appendChild(summary);

    var meta = document.createElement("p");
    meta.className = "zeus-plugin-meta-row";
    text(meta, (plugin.id || "unknown") + " · v" + (plugin.version || "0.0.0") + " · by " + (plugin.owner || "community"));
    card.appendChild(meta);

    var tags = document.createElement("div");
    tags.className = "zeus-plugin-tags";
    asArray(plugin.runtime).forEach(function (r) {
      tags.appendChild(tag("runtime:" + r));
    });
    asArray(plugin.categories).forEach(function (c) {
      tags.appendChild(tag(c));
    });
    card.appendChild(tags);

    var actions = document.createElement("div");
    actions.className = "zeus-plugin-actions";

    var source = document.createElement("a");
    source.href = plugin.source_repo || "https://github.com/arslnb/zeus-plugins";
    source.target = "_blank";
    source.rel = "noopener";
    text(source, "source");
    actions.appendChild(source);

    var install = document.createElement("code");
    text(install, "install: " + (plugin.id || "plugin_id"));
    actions.appendChild(install);

    card.appendChild(actions);
    return card;
  }

  function setMeta(metaEl, plugins, sourceUrl) {
    var stamp = new Date().toLocaleString();
    metaEl.textContent = plugins.length + " plugins loaded · source: " + sourceUrl + " · refreshed: " + stamp;
  }

  function render(plugins, sourceUrl) {
    var grid = document.getElementById("plugins-grid");
    var meta = document.getElementById("plugins-meta");
    var empty = document.getElementById("plugins-empty");
    if (!grid || !meta || !empty) return;

    grid.innerHTML = "";
    plugins.forEach(function (plugin) {
      grid.appendChild(buildCard(plugin));
    });

    setMeta(meta, plugins, sourceUrl);
    empty.hidden = true;
  }

  function showError() {
    var meta = document.getElementById("plugins-meta");
    var empty = document.getElementById("plugins-empty");
    if (meta) meta.textContent = "Failed to load plugin index.";
    if (empty) empty.hidden = false;
  }

  function fetchIndex(url) {
    return fetch(url, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function loadFirstAvailable(i) {
    if (i >= SOURCES.length) {
      showError();
      return;
    }

    fetchIndex(SOURCES[i])
      .then(function (payload) {
        var plugins = asArray(payload).sort(function (a, b) {
          return String(a.name || a.id || "").localeCompare(String(b.name || b.id || ""));
        });
        render(plugins, SOURCES[i]);
      })
      .catch(function () {
        loadFirstAvailable(i + 1);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      loadFirstAvailable(0);
    });
  } else {
    loadFirstAvailable(0);
  }
})();
