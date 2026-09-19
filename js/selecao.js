(function () {
  "use strict";

  var WA = "5516991166681";
  var LOCAL_JSON = "data/selecao.json";
  var CATALOG_URL = "https://lanportus.com.br/catalog-data.js";

  var TYPE_LABEL = {
    HOUSE: "Casa",
    APARTMENT: "Apartamento",
    TWO_STORY_HOUSE: "Sobrado",
    LAND: "Terreno",
    ROOM: "Sala",
    HALL: "Salão / ponto",
    BUILDING: "Prédio comercial",
    OUTHOUSE: "Galpão",
  };

  var RESIDENTIAL = { HOUSE: 1, APARTMENT: 1, TWO_STORY_HOUSE: 1 };
  var COMMERCIAL = { ROOM: 1, HALL: 1, BUILDING: 1, OUTHOUSE: 1 };

  var state = {
    items: [],
    q: "",
    tipo: "",
    regiao: "",
    quartos: "",
    chip: "",
  };

  var els = {
    form: document.getElementById("selecao-form"),
    q: document.getElementById("q"),
    tipo: document.getElementById("tipo"),
    regiao: document.getElementById("regiao"),
    quartos: document.getElementById("quartos"),
    grid: document.getElementById("selecao-grid"),
    empty: document.getElementById("selecao-empty"),
    count: document.getElementById("selecao-count"),
    chips: document.querySelectorAll(".selecao-chip"),
    robots: document.getElementById("robots-meta"),
  };

  if (!els.form || !els.grid) return;

  function formatBRL(n) {
    try {
      return Number(n).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });
    } catch (e) {
      return "R$ " + Math.round(Number(n) || 0);
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalize(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function detailUrl(p) {
    if (p.detailUrl && p.detailUrl.indexOf("lanportus.com.br") === -1) {
      return p.detailUrl;
    }
    return "imovel.html?ref=" + encodeURIComponent(p.ref);
  }

  function waUrl(p) {
    var msg =
      "Olá Flávio, vi o imóvel ref. " +
      p.ref +
      " na Seleção do site e gostaria de mais detalhes.";
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }

  function typeLabel(t) {
    return TYPE_LABEL[t] || t || "";
  }

  function hasFacetQuery() {
    var params = new URLSearchParams(location.search);
    var keys = ["q", "tipo", "regiao", "quartos", "chip"];
    for (var i = 0; i < keys.length; i++) {
      var v = params.get(keys[i]);
      if (v != null && String(v).trim() !== "") return true;
    }
    return false;
  }

  function syncRobots() {
    if (!els.robots) return;
    els.robots.setAttribute(
      "content",
      hasFacetQuery() ? "noindex,follow" : "index,follow"
    );
  }

  function readParams() {
    var params = new URLSearchParams(location.search);
    state.q = params.get("q") || "";
    state.tipo = params.get("tipo") || "";
    state.regiao = params.get("regiao") || "";
    state.quartos = params.get("quartos") || "";
    state.chip = params.get("chip") || "";
    if (els.q) els.q.value = state.q;
    if (els.tipo) els.tipo.value = state.tipo;
    if (els.regiao) els.regiao.value = state.regiao;
    if (els.quartos) els.quartos.value = state.quartos;
    els.chips.forEach(function (btn) {
      var on = btn.getAttribute("data-chip") === state.chip;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });
  }

  function writeParams(replace) {
    var params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.tipo) params.set("tipo", state.tipo);
    if (state.regiao) params.set("regiao", state.regiao);
    if (state.quartos) params.set("quartos", state.quartos);
    if (state.chip) params.set("chip", state.chip);
    var qs = params.toString();
    var url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    syncRobots();
  }

  function populateRegioes() {
    if (!els.regiao) return;
    var set = {};
    state.items.forEach(function (p) {
      var n = (p.neighborhood || "").trim();
      if (n) set[n] = 1;
    });
    var list = Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR");
    });
    var current = state.regiao;
    els.regiao.innerHTML = '<option value="">Todas</option>';
    list.forEach(function (n) {
      var opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      els.regiao.appendChild(opt);
    });
    els.regiao.value = current;
  }

  function matches(p) {
    if (state.tipo && p.type !== state.tipo) return false;

    if (state.chip === "alto") {
      if (!RESIDENTIAL[p.type]) return false;
    } else if (state.chip === "terrenos") {
      if (p.type !== "LAND") return false;
    } else if (state.chip === "comercial") {
      if (!COMMERCIAL[p.type]) return false;
    } else if (state.chip === "disponiveis") {
      if (!(Number(p.sale) > 0)) return false;
    }

    if (state.regiao) {
      if (normalize(p.neighborhood) !== normalize(state.regiao)) return false;
    }

    if (state.quartos) {
      var minBeds = parseInt(state.quartos, 10) || 0;
      if (p.type === "LAND" || COMMERCIAL[p.type]) return false;
      if ((Number(p.beds) || 0) < minBeds) return false;
    }

    if (state.q) {
      var needle = normalize(state.q);
      var hay = normalize(
        [
          p.title,
          p.neighborhood,
          p.city,
          p.condominio,
          typeLabel(p.type),
          p.ref,
          (p.tags || []).join(" "),
        ].join(" ")
      );
      if (hay.indexOf(needle) === -1) return false;
    }

    return true;
  }

  function cardHtml(p) {
    var loc = [p.neighborhood, p.city].filter(Boolean).join(" · ");
    var meta = [];
    if (p.type !== "LAND" && !COMMERCIAL[p.type] && p.beds) meta.push(p.beds + " quartos");
    if (p.area) meta.push(Math.round(p.area) + " m²");
    if (p.garages) meta.push(p.garages + " vagas");
    var img = p.image
      ? '<img src="' +
        escapeHtml(p.image) +
        '" alt="" loading="lazy" decoding="async" width="560" height="400" />'
      : '<div class="selecao-card__placeholder" aria-hidden="true"></div>';

    return (
      '<article class="selecao-card">' +
      '<a class="selecao-card__media" href="' +
      escapeHtml(detailUrl(p)) +
      '">' +
      img +
      "</a>" +
      '<div class="selecao-card__body">' +
      '<span class="selecao-card__tag">' +
      escapeHtml(typeLabel(p.type)) +
      (loc ? " · " + escapeHtml(loc) : "") +
      "</span>" +
      '<h3 class="selecao-card__title">' +
      '<a href="' +
      escapeHtml(detailUrl(p)) +
      '">' +
      escapeHtml(p.title) +
      "</a></h3>" +
      '<p class="selecao-card__price">' +
      escapeHtml(formatBRL(p.sale)) +
      "</p>" +
      (meta.length
        ? '<div class="selecao-card__meta">' +
          meta
            .map(function (m) {
              return "<span>" + escapeHtml(m) + "</span>";
            })
            .join("") +
          "</div>"
        : "") +
      '<div class="selecao-card__actions">' +
      '<a class="btn btn--ghost" href="' +
      escapeHtml(detailUrl(p)) +
      '">Ver detalhes</a>' +
      '<a class="btn btn--primary" href="' +
      escapeHtml(waUrl(p)) +
      '" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>' +
      "</div>" +
      '<p class="selecao-card__ref">Ref. ' +
      escapeHtml(p.ref) +
      "</p>" +
      "</div></article>"
    );
  }

  function render() {
    var filtered = state.items.filter(matches);
    els.grid.innerHTML = filtered.map(cardHtml).join("");
    var total = state.items.length;
    var n = filtered.length;
    if (els.count) {
      els.count.textContent =
        n === total
          ? n + (n === 1 ? " imóvel na seleção" : " imóveis na seleção")
          : n +
            " de " +
            total +
            (total === 1 ? " imóvel" : " imóveis") +
            " com este critério";
    }
    if (els.empty) els.empty.hidden = n > 0;
    els.grid.hidden = n === 0;
  }

  function collectFromForm() {
    state.q = (els.q && els.q.value.trim()) || "";
    state.tipo = (els.tipo && els.tipo.value) || "";
    state.regiao = (els.regiao && els.regiao.value) || "";
    state.quartos = (els.quartos && els.quartos.value) || "";
  }

  function onFilterChange() {
    collectFromForm();
    writeParams(true);
    render();
  }

  function applyChip(name) {
    if (state.chip === name) {
      state.chip = "";
    } else {
      state.chip = name;
      if (name === "terrenos") {
        state.tipo = "LAND";
        if (els.tipo) els.tipo.value = "LAND";
        state.quartos = "";
        if (els.quartos) els.quartos.value = "";
      } else if (name === "comercial") {
        state.tipo = "";
        if (els.tipo) els.tipo.value = "";
        state.quartos = "";
        if (els.quartos) els.quartos.value = "";
      } else if (name === "alto") {
        if (state.tipo === "LAND" || COMMERCIAL[state.tipo]) {
          state.tipo = "";
          if (els.tipo) els.tipo.value = "";
        }
      }
    }
    els.chips.forEach(function (btn) {
      var on = btn.getAttribute("data-chip") === state.chip;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("is-active", on);
    });
    writeParams(true);
    render();
  }

  function parseCatalogText(text) {
    var start = text.indexOf("window.LANPORTUS_CATALOG");
    if (start < 0) throw new Error("catalog missing");
    var eq = text.indexOf("=", start);
    var i = eq + 1;
    while (/\s/.test(text[i])) i++;
    if (text[i] !== "[") throw new Error("bad catalog");
    var depth = 0;
    var inStr = false;
    var esc = false;
    var quote = "";
    for (var j = i; j < text.length; j++) {
      var c = text[j];
      if (inStr) {
        if (esc) {
          esc = false;
          continue;
        }
        if (c === "\\") {
          esc = true;
          continue;
        }
        if (c === quote) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") {
        inStr = true;
        quote = c;
        continue;
      }
      if (c === "[") depth++;
      if (c === "]") {
        depth--;
        if (depth === 0) return JSON.parse(text.slice(i, j + 1));
      }
    }
    throw new Error("unterminated");
  }

  /* Client refresh uses the same internal rules as sync; values never shown in UI. */
  function clientFilter(catalog) {
    var RES_MIN = 3000000;
    var LAND_MIN = 600000;
    var COMM_MIN = 300000;
    return catalog
      .filter(function (p) {
        var sale = Number(p.sale) || 0;
        if (p.type === "LAND") return sale >= LAND_MIN;
        if (RESIDENTIAL[p.type]) return sale >= RES_MIN;
        if (COMMERCIAL[p.type]) return sale >= COMM_MIN;
        return false;
      })
      .map(function (p) {
        return {
          ref: String(p.ref),
          title: p.title || "",
          type: p.type,
          neighborhood: p.neighborhood || "",
          condominio: p.condominio || null,
          city: p.city || "",
          sale: Number(p.sale) || 0,
          area: Number(p.area) || 0,
          beds: Number(p.beds) || 0,
          baths: Number(p.baths) || 0,
          garages: Number(p.garages) || 0,
          suites: Number(p.suites) || 0,
          featured: Boolean(p.featured),
          tags: Array.isArray(p.tags) ? p.tags : [],
          image: p.image || "",
          slug: p.slug || "",
          detailUrl: "imovel.html?ref=" + encodeURIComponent(String(p.ref)),
        };
      });
  }

  function loadLocal() {
    return fetch(LOCAL_JSON, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("local json " + r.status);
      return r.json();
    });
  }

  function tryCatalogRefresh() {
    return fetch(CATALOG_URL, { mode: "cors", cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("catalog " + r.status);
        return r.text();
      })
      .then(function (text) {
        return clientFilter(parseCatalogText(text));
      });
  }

  function bind() {
    ["input", "change"].forEach(function (evt) {
      els.form.addEventListener(evt, function (e) {
        if (!e.target) return;
        if (
          e.target.id === "q" ||
          e.target.id === "tipo" ||
          e.target.id === "regiao" ||
          e.target.id === "quartos"
        ) {
          onFilterChange();
        }
      });
    });

    els.form.addEventListener("submit", function (e) {
      e.preventDefault();
      onFilterChange();
    });

    els.chips.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyChip(btn.getAttribute("data-chip"));
      });
    });

    window.addEventListener("popstate", function () {
      readParams();
      syncRobots();
      render();
    });
  }

  function boot(items) {
    state.items = items || [];
    populateRegioes();
    readParams();
    syncRobots();
    bind();
    render();
  }

  loadLocal()
    .then(function (data) {
      var items = data && data.items ? data.items : [];
      boot(items);
      tryCatalogRefresh()
        .then(function (fresh) {
          if (fresh && fresh.length) {
            state.items = fresh;
            populateRegioes();
            render();
          }
        })
        .catch(function () {
          /* CORS or network: keep local JSON */
        });
    })
    .catch(function () {
      tryCatalogRefresh()
        .then(boot)
        .catch(function () {
          if (els.count) {
            els.count.textContent =
              "Não foi possível carregar a seleção agora. Tente de novo em instantes.";
          }
          if (els.empty) els.empty.hidden = false;
        });
    });
})();
