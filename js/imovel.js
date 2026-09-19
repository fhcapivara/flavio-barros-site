(function () {
  "use strict";

  var WA = "5516991166681";
  var DATA_URL = "data/selecao.json";
  var TYPE_LABEL = {
    HOUSE: "Casa",
    APARTMENT: "Apartamento",
    TWO_STORY_HOUSE: "Sobrado",
    LAND: "Terreno",
  };

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
    var loc = [p.neighborhood, p.city].filter(Boolean).join(" · ");
    var tipo = TYPE_LABEL[p.type] || p.type || "Imóvel";
    var bits = [];
    if (p.type !== "LAND" && p.beds) bits.push(p.beds + " quartos");
    if (p.suites) bits.push(p.suites + " suítes");
    if (p.baths) bits.push(p.baths + " banheiros");
    if (p.garages) bits.push(p.garages + " vagas");
    if (p.area) bits.push(Math.round(p.area) + " m²");

    var bairro = p.neighborhood || p.city || "Ribeirão Preto";
    var pageTitle =
      (p.title || "Imóvel") +
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

    var img = p.image
      ? '<figure class="imovel-detail__media"><img src="' +
        escapeHtml(p.image) +
        '" alt="' +
        escapeHtml(p.title || "") +
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
      escapeHtml(p.title || "Imóvel") +
      "</h1>" +
      '<p class="imovel-detail__price">' +
      escapeHtml(formatBRL(p.sale)) +
      "</p>" +
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
      var items = Array.isArray(data) ? data : (data && data.items) || [];
      var found = null;
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].ref) === String(ref)) {
          found = items[i];
          break;
        }
      }
      if (!found) showMissing();
      else render(found);
    })
    .catch(function () {
      showMissing();
    });
})();
