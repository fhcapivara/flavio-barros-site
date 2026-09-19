(function () {
  "use strict";

  var WA = "5516991166681";
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

  function waUrl(item) {
    var note = (item && item.whatsappNote) || "";
    var title = (item && item.title) || "";
    var msg =
      note ||
      (title
        ? 'Olá, Flávio. Vi "' +
          title +
          '" na Seleção Prime e gostaria de mais detalhes.'
        : "Olá, Flávio. Vi a Seleção Prime no site e gostaria de conversar.");
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }

  function emptyWaUrl() {
    return (
      "https://wa.me/" +
      WA +
      "?text=" +
      encodeURIComponent(
        "Olá, Flávio. Vi a Seleção Prime no site e gostaria de conversar."
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
        '" alt="' +
        escapeHtml(item.title || "") +
        '" loading="lazy" decoding="async" width="640" height="400" />' +
        "</div>";
    } else {
      media =
        '<div class="vip-card__media vip-card__media--placeholder arch-block" aria-hidden="true"></div>';
    }

    var actions = '<div class="vip-card__actions">';
    if (item.detailUrl) {
      actions +=
        '<a class="btn btn--primary" href="' +
        escapeHtml(item.detailUrl) +
        '">Ler a história</a>';
    }
    if (item.videoUrl) {
      actions +=
        '<a class="btn btn--ghost" href="' +
        escapeHtml(item.detailUrl || item.videoUrl) +
        '">Ver vídeo</a>';
    }
    actions +=
      '<a class="btn btn--ghost" href="' +
      escapeHtml(waUrl(item)) +
      '" target="_blank" rel="noopener noreferrer">Visitar</a></div>';

    var sub = item.subtitle
      ? '<p class="vip-card__subtitle">' + escapeHtml(item.subtitle) + "</p>"
      : "";

    return (
      '<article class="vip-card card reveal">' +
      media +
      '<div class="vip-card__body card__body">' +
      (loc
        ? '<span class="card__tag">' + escapeHtml(loc) + "</span>"
        : '<span class="card__tag">Seleção Prime</span>') +
      '<h3 class="card__title">' +
      escapeHtml(item.title || "Imóvel selecionado") +
      "</h3>" +
      sub +
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
      var link = els.empty.querySelector("a[data-prime-wa]");
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
