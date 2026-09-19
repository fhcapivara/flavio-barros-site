(function () {
  "use strict";

  var DATA_URL = "data/selecao-prime.json";
  var els = {
    grid: document.getElementById("prime-grid"),
    empty: document.getElementById("prime-empty"),
  };

  if (!els.grid) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardHtml(item) {
    var loc = [item.neighborhood, item.city].filter(Boolean).join(" · ");
    var detail = item.detailUrl || "#";
    var media =
      '<div class="vip-card__media"><a href="' +
      escapeHtml(detail) +
      '">' +
      (item.coverImage
        ? '<img src="' +
          escapeHtml(item.coverImage) +
          '" alt="' +
          escapeHtml(item.title || "") +
          '" loading="lazy" decoding="async" width="640" height="400" />'
        : '<span class="vip-card__media--placeholder arch-block" aria-hidden="true"></span>') +
      "</a></div>";

    var sub = item.subtitle
      ? '<p class="vip-card__subtitle">' + escapeHtml(item.subtitle) + "</p>"
      : "";

    return (
      '<article class="vip-card card reveal" data-prime-id="' +
      escapeHtml(item.id || "") +
      '">' +
      media +
      '<div class="vip-card__body card__body">' +
      (loc
        ? '<span class="card__tag">' + escapeHtml(loc) + "</span>"
        : '<span class="card__tag">Seleção Prime</span>') +
      '<h3 class="card__title"><a class="card__title-link" href="' +
      escapeHtml(detail) +
      '">' +
      escapeHtml(item.title || "Imóvel selecionado") +
      "</a></h3>" +
      sub +
      (item.criterio
        ? '<p class="card__text">' + escapeHtml(item.criterio) + "</p>"
        : "") +
      '<p class="vip-card__actions"><a class="btn btn--primary" href="' +
      escapeHtml(detail) +
      '">Saiba mais</a></p>' +
      "</div></article>"
    );
  }

  function showEmpty() {
    if (els.grid.children.length) {
      if (els.empty) els.empty.hidden = true;
      return;
    }
    els.grid.hidden = true;
    if (els.empty) els.empty.hidden = false;
  }

  function render(items) {
    if (!items || !items.length) {
      showEmpty();
      return;
    }
    els.grid.hidden = false;
    els.grid.innerHTML = items.map(cardHtml).join("");
    if (els.empty) els.empty.hidden = true;
  }

  fetch(DATA_URL, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("prime json " + r.status);
      return r.json();
    })
    .then(function (data) {
      var items = Array.isArray(data) ? data : (data && data.items) || [];
      render(items);
    })
    .catch(function () {
      showEmpty();
    });
})();
