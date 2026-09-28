/*
 * Consentimento de cookies + Google Analytics 4 (Consent Mode v2).
 * Carregado em todas as páginas (antes de js/main.js). As páginas geradas por
 * scripts/build-mercado.mjs e scripts/build-acervo.mjs copiam os <script src> de atuacao.html.
 *
 * - Antes da escolha, ou depois de "Recusar", nada do Google é carregado e nenhum cookie é criado.
 * - O gtag.js só é carregado depois de "Aceitar" (e, nas visitas seguintes, se a escolha salva for "granted").
 * - A escolha fica em localStorage ("fb_consent" = "granted" | "denied").
 * - Qualquer elemento com [data-consent-open] reabre o aviso (ex.: "Preferências de cookies" no rodapé).
 * - Eventos de conversão (só com consentimento): whatsapp_click, dossie_request, capi_submit.
 *   Outros scripts disparam eventos com window.fbConsent.track("nome", { ... }).
 */
(function () {
  "use strict";

  var GA_ID = "G-57YR0KFM63";
  var KEY = "fb_consent";
  var TEXT = "Este site usa cookies para entender quais páginas são mais úteis e melhorar a sua experiência. Nenhum dado é vendido ou compartilhado para publicidade.";

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  if (typeof window.gtag !== "function") window.gtag = gtag;

  // Consent Mode v2: tudo negado por padrão, antes de qualquer config.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied"
  });

  var memory = null; // se o localStorage estiver bloqueado, a escolha vale só nesta página
  function readChoice() {
    var v = null;
    try { v = window.localStorage.getItem(KEY); } catch (e) { v = memory; }
    return v === "granted" || v === "denied" ? v : null;
  }
  function saveChoice(v) {
    memory = v;
    try { window.localStorage.setItem(KEY, v); } catch (e) { /* sem armazenamento */ }
  }

  var loaded = false;
  function enableAnalytics() {
    window["ga-disable-" + GA_ID] = false;
    // Só a medição é liberada; os sinais de anúncios continuam negados.
    gtag("consent", "update", { analytics_storage: "granted" });
    if (loaded) return;
    loaded = true;
    gtag("js", new Date());
    gtag("config", GA_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  function deleteGaCookies() {
    var names = document.cookie.split(";").map(function (c) { return c.split("=")[0].trim(); })
      .filter(function (n) { return n === "_ga" || n.indexOf("_ga_") === 0 || n === "_gid" || n === "_gat" || n.indexOf("_gat_") === 0; });
    if (!names.length) return;
    var parts = location.hostname.split(".");
    var domains = [""];
    for (var i = 0; i < parts.length - 1; i++) {
      var d = parts.slice(i).join(".");
      domains.push(d, "." + d);
    }
    var past = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/";
    names.forEach(function (n) {
      domains.forEach(function (d) { document.cookie = n + past + (d ? "; domain=" + d : ""); });
    });
  }

  function disableAnalytics() {
    if (loaded) gtag("consent", "update", { analytics_storage: "denied" });
    window["ga-disable-" + GA_ID] = true;
    deleteGaCookies();
  }

  function apply(v) {
    if (v === "granted") enableAnalytics();
    else disableAnalytics();
  }

  function track(name, params) {
    if (readChoice() !== "granted" || !loaded) return;
    var p = { event_page_path: location.pathname, transport_type: "beacon" };
    if (params) for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) p[k] = params[k];
    gtag("event", name, p);
  }

  /* ---------- Aviso ---------- */
  var banner = null;
  var opener = null;

  function setOffset() {
    if (!banner || banner.hidden) {
      document.documentElement.classList.remove("consent-open");
      document.documentElement.style.removeProperty("--consent-h");
      return;
    }
    document.documentElement.classList.add("consent-open");
    document.documentElement.style.setProperty("--consent-h", banner.offsetHeight + "px");
  }

  function build() {
    banner = document.createElement("div");
    banner.className = "consent";
    banner.id = "consent";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Aviso de cookies");
    banner.hidden = true;
    banner.innerHTML =
      '<p class="consent__text" id="consent-text"></p>' +
      '<div class="consent__row">' +
      '<a class="consent__link" href="/privacidade.html">Política de privacidade</a>' +
      '<div class="consent__actions">' +
      '<button type="button" class="consent__btn" data-consent-choice="granted">Aceitar</button>' +
      '<button type="button" class="consent__btn" data-consent-choice="denied">Recusar</button>' +
      "</div></div>";
    banner.querySelector(".consent__text").textContent = TEXT;
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-consent-choice]");
      if (!b) return;
      var v = b.getAttribute("data-consent-choice");
      saveChoice(v);
      apply(v);
      hide();
    });
    banner.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && readChoice()) hide();
    });
    document.body.appendChild(banner);
    window.addEventListener("resize", setOffset);
  }

  function show(focus) {
    if (!banner) build();
    banner.hidden = false;
    setOffset();
    if (focus) {
      var current = readChoice();
      var target = banner.querySelector('[data-consent-choice="' + (current || "granted") + '"]');
      if (target) target.focus();
    }
  }

  function hide() {
    if (!banner) return;
    var hadFocus = banner.contains(document.activeElement);
    banner.hidden = true;
    setOffset();
    if (hadFocus && opener && document.contains(opener)) opener.focus();
    opener = null;
  }

  /* ---------- Cliques ---------- */
  var WA_RE = /^(https?:)?\/\/(wa\.me|api\.whatsapp\.com)\//i;
  function linkLocation(a) {
    if (a.closest(".wa-sticky")) return "botao_fixo";
    if (a.id === "capi-wa" || a.closest(".capi-card-wa")) return "capi";
    if (a.closest(".site-header")) return "menu";
    if (a.closest(".site-footer")) return "rodape";
    if (a.closest(".cta-band")) return "faixa_cta";
    if (a.closest("#imovel-root, .imovel")) return "imovel";
    return "conteudo";
  }

  document.addEventListener("click", function (e) {
    var openBtn = e.target.closest("[data-consent-open]");
    if (openBtn) {
      e.preventDefault();
      opener = openBtn;
      show(true);
      return;
    }
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!WA_RE.test(href)) return;
    var where = linkLocation(a);
    track("whatsapp_click", {
      link_location: where,
      link_text: (a.textContent || a.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 80)
    });
    // Curadoria Capi: o envio final é o clique no WhatsApp com o resultado.
    if (where === "capi") track("capi_submit", { capi_result: a.id === "capi-wa" ? "sem_opcoes" : "imovel" });
  }, true);

  window.fbConsent = {
    track: track,
    open: function () { show(true); },
    choice: readChoice
  };

  var saved = readChoice();
  if (saved) apply(saved);
  else show(false);
})();
