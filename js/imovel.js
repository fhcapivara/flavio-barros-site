(function () {
  "use strict";

  var WA = "5516991166681";
  var DATA_URL = "data/selecao.json";
  var CATALOG_URL = "https://lanportus.com.br/catalog-data.js";
  var RESIDENTIAL = { HOUSE: 1, APARTMENT: 1, TWO_STORY_HOUSE: 1 };
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
  var COMMERCIAL = { ROOM: 1, HALL: 1, BUILDING: 1, OUTHOUSE: 1 };;

  var params = new URLSearchParams(location.search);
  var ref = (params.get("ref") || "").trim();

  var els = {
    loading: document.getElementById("imovel-loading"),
    missing: document.getElementById("imovel-missing"),
    card: document.getElementById("imovel-card"),
    title: document.getElementById("doc-title"),
    desc: document.getElementById("meta-desc"),
  };

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Títulos vêm do catálogo Lanportus e às vezes trazem o valor ("Venda R$5.790.000,00").
  // Regra do site: nenhum preço aparece ao visitante, então o trecho sai antes de exibir.
  // ATENÇÃO: manter igual em js/selecao.js, js/imovel.js, js/capi.js e scripts/build-acervo.mjs.
  function cleanTitle(s) {
    return String(s || "")
      .replace(/\s*(?:\b(?:venda|valor|pre[cç]o|por|apenas)\s*:?\s*)?R\$\s*\d[\d.,]*(?:\s*(?:milh(?:[õo]es|[ãa]o)|mil|mi|mm|k)(?![a-zà-ú]))?/gi, " ")
      .replace(/\s*\b\d+(?:[.,]\d+)?\s*milh(?:[õo]es|[ãa]o)(?!\s*de\s*m)(?![a-zà-ú])/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s\-\u2013|·,:/]+|[\s\-\u2013|·,:/]+$/g, "")
      .trim();
  }

  function waUrl(p) {
    var msg =
      "Olá Flávio, vi o imóvel ref. " +
      p.ref +
      " no Acervo do site e gostaria de mais detalhes.";
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }

  function showMissing() {
    if (els.loading) els.loading.hidden = true;
    if (els.card) els.card.hidden = true;
    if (els.missing) els.missing.hidden = false;
    if (els.title) els.title.textContent = "Imóvel não encontrado | Acervo · Flávio Barros";
  }

  function render(p) {
    var nome = cleanTitle(p.title) || "Imóvel";
    var loc = [p.neighborhood, p.city].filter(Boolean).join(" · ");
    var tipo = TYPE_LABEL[p.type] || p.type || "Imóvel";
    var bits = [];
    if (p.type !== "LAND" && !COMMERCIAL[p.type] && p.beds) bits.push(p.beds + " quartos");
    if (p.suites) bits.push(p.suites + " suítes");
    if (p.baths) bits.push(p.baths + " banheiros");
    if (p.garages) bits.push(p.garages + " vagas");
    if (p.area) bits.push(Math.round(p.area) + " m²");

    var bairro = p.neighborhood || p.city || "Ribeirão Preto";
    var pageTitle =
      nome +
      " | " +
      bairro +
      " · Acervo · Flávio Barros";
    var meta =
      (tipo ? tipo + " · " : "") +
      bairro +
      ", Ribeirão Preto e região. Fale no WhatsApp com Flávio Barros.";
    if (els.title) els.title.textContent = pageTitle;
    if (els.desc) els.desc.setAttribute("content", meta);
    document.title = pageTitle;
    var robots = document.getElementById("robots-meta");
    if (robots) robots.setAttribute("content", "noindex,follow");

    // A capa do catálogo vem recortada para o card (w=560); no detalhe pede a versão maior.
    var src = /cdn\.sanity\.io/.test(p.image || "")
      ? p.image.replace(/([?&])w=\d+/, "$1w=1200").replace(/([?&])h=\d+/, "$1h=800")
      : p.image;
    var img = p.image
      ? '<figure class="imovel-detail__media"><img src="' +
        escapeHtml(src) +
        '" alt="' +
        escapeHtml(nome) +
        '" width="1200" height="800" decoding="async" fetchpriority="high" /></figure>'
      : "";

    els.card.innerHTML =
      img +
      '<div class="imovel-detail__body">' +
      '<p class="eyebrow">' +
      escapeHtml(tipo) +
      (loc ? " · " + escapeHtml(loc) : "") +
      "</p>" +
      "<h1>" +
      escapeHtml(nome) +
      "</h1>" +
      (bits.length
        ? '<ul class="imovel-detail__facts">' +
          bits
            .map(function (b) {
              return "<li>" + escapeHtml(b) + "</li>";
            })
            .join("") +
          "</ul>"
        : "") +
      (p.condominio
        ? "<p class=\"imovel-detail__condo\">Condomínio: " +
          escapeHtml(p.condominio) +
          "</p>"
        : "") +
      '<p class="imovel-detail__ref">Ref. ' +
      escapeHtml(p.ref) +
      "</p>" +
      '<p class="imovel-detail__actions">' +
      '<a class="btn btn--primary" href="' +
      escapeHtml(waUrl(p)) +
      '" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a> ' +
      '<a class="btn btn--ghost" href="selecao.html">Voltar ao Acervo</a>' +
      "</p>" +
      '<p class="muted imovel-detail__note">Curadoria no site de Flávio Barros. Inventário alinhado ao Acervo Lanportus.</p>' +
      "</div>";

    if (els.loading) els.loading.hidden = true;
    if (els.missing) els.missing.hidden = true;
    els.card.hidden = false;
  }

  function findRef(items) {
    for (var i = 0; i < (items || []).length; i++) {
      if (String(items[i].ref) === String(ref)) return items[i];
    }
    return null;
  }

  // Mesmo leitor de js/selecao.js (parseCatalogText) para window.LANPORTUS_CATALOG.
  function parseCatalogText(text) {
    var start = text.indexOf("window.LANPORTUS_CATALOG");
    if (start < 0) throw new Error("catalog missing");
    var i = text.indexOf("=", start) + 1;
    while (/\s/.test(text[i])) i++;
    if (text[i] !== "[") throw new Error("bad catalog");
    var depth = 0, inStr = false, esc = false, quote = "";
    for (var j = i; j < text.length; j++) {
      var c = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === quote) inStr = false;
        continue;
      }
      if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
      if (c === "[") depth++;
      if (c === "]") {
        depth--;
        if (depth === 0) return JSON.parse(text.slice(i, j + 1));
      }
    }
    throw new Error("unterminated");
  }

  // Mesmas regras de curadoria do Acervo (js/selecao.js clientFilter + cleanItems e
  // scripts/sync-lanportus.mjs): só entra o que o Acervo também mostraria. Valores nunca aparecem.
  function passesCuration(p) {
    var sale = Number(p.sale) || 0;
    var hay = (p.title || "") + " " + (p.description || "") + " " + (p.tags || []).join(" ");
    if (/loca[cç][aã]o|aluguel/i.test(hay)) return false;
    if (p.type === "LAND") return sale >= 600000;
    if (RESIDENTIAL[p.type]) return sale >= 3000000;
    if (COMMERCIAL[p.type]) return sale >= 300000;
    return false;
  }

  // Anúncio novo no catálogo Lanportus que ainda não entrou no snapshot local.
  function loadFromCatalog() {
    return fetch(CATALOG_URL, { mode: "cors", cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("catalog " + r.status);
        return r.text();
      })
      .then(function (text) {
        var p = findRef(parseCatalogText(text));
        if (!p || !passesCuration(p)) return null;
        return {
          ref: String(p.ref),
          title: p.title || "",
          type: p.type,
          neighborhood: p.neighborhood || "",
          condominio: p.condominio || null,
          city: p.city || "",
          area: Number(p.area) || 0,
          beds: Number(p.beds) || 0,
          baths: Number(p.baths) || 0,
          garages: Number(p.garages) || 0,
          suites: Number(p.suites) || 0,
          image: p.image || "",
        };
      });
  }

  if (!ref) {
    showMissing();
    return;
  }

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("json " + r.status);
      return r.json();
    })
    .then(function (data) {
      return findRef(Array.isArray(data) ? data : (data && data.items) || []);
    })
    .catch(function () {
      return null;
    })
    .then(function (found) {
      return found || loadFromCatalog();
    })
    .then(function (found) {
      if (!found) showMissing();
      else render(found);
    })
    .catch(function () {
      showMissing();
    });
})();
