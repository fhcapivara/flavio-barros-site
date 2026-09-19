(function () {
  "use strict";

  var WA = "5516991166681";
  var DATA_URL = "data/curadoria-vip.json";

  var els = {
    grid: document.getElementById("vip-grid"),
    empty: document.getElementById("vip-empty"),
  };

  if (!els.grid) return;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function waUrl(item) {
    var note = (item && item.whatsappNote) || "";
    var title = (item && item.title) || "";
    var msg =
      note ||
      (title
        ? "Olá Flávio, vi \"" +
          title +
          "\" na Curadoria VIP e gostaria de mais detalhes."
        : "Olá, Flávio. Quero agendar o encontro presencial da Curadoria VIP.");
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }

  function emptyWaUrl() {
    return (
      "https://wa.me/" +
      WA +
      "?text=" +
      encodeURIComponent(
        "Olá, Flávio. Quero agendar o encontro presencial da Curadoria VIP."
      )
    );
  }

  function cardHtml(item) {
    var loc = [item.neighborhood, item.city].filter(Boolean).join(" · ");
    var media;
    if (item.coverImage) {
      media =
        '<div class="vip-card__media">' +
        '<img src="' +
        escapeHtml(item.coverImage) +
        '" alt="" loading="lazy" decoding="async" width="640" height="400" />' +
        "</div>";
    } else {
      media =
        '<div class="vip-card__media vip-card__media--placeholder arch-block" aria-hidden="true"></div>';
    }

    var actions = '<div class="vip-card__actions">';
    if (item.videoUrl) {
      actions +=
        '<a class="btn btn--ghost" href="' +
        escapeHtml(item.videoUrl) +
        '" target="_blank" rel="noopener noreferrer">Ver vídeo</a>';
    }
    actions +=
      '<a class="btn btn--primary" href="' +
      escapeHtml(waUrl(item)) +
      '" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a></div>';

    return (
      '<article class="vip-card card reveal">' +
      media +
      '<div class="vip-card__body card__body">' +
      (loc
        ? '<span class="card__tag">' + escapeHtml(loc) + "</span>"
        : '<span class="card__tag">Curadoria VIP</span>') +
      '<h3 class="card__title">' +
      escapeHtml(item.title || "Imóvel selecionado") +
      "</h3>" +
      (item.criterio
        ? '<p class="card__text">' + escapeHtml(item.criterio) + "</p>"
        : "") +
      actions +
      "</div></article>"
    );
  }

  function showEmpty() {
    els.grid.innerHTML = "";
    els.grid.hidden = true;
    if (els.empty) {
      els.empty.hidden = false;
      var link = els.empty.querySelector("a[data-vip-wa]");
      if (link) link.href = emptyWaUrl();
    }
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
      if (!r.ok) throw new Error("vip json " + r.status);
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
