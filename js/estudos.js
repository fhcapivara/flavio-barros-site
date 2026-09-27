/*
 * Leitura de mercado: pedido de estudos pelo WhatsApp, compartilhamento e avaliação dos textos.
 * Sem bibliotecas externas, sem cookies (a medição fica em js/consent.js). Carregado em todas as páginas de /mercado/.
 *
 * Estudos: o visitante informa só o nome. O nome serve apenas para montar a mensagem
 * do WhatsApp e não é enviado a nenhum servidor nem guardado.
 *
 * VOTOS_ENDPOINT: URL opcional (por exemplo, app da Web do Google Apps Script) que recebe
 * os votos "Esta leitura foi útil?". Enquanto estiver vazio, os votos ficam só no navegador.
 */
var VOTOS_ENDPOINT = "";

(function () {
  "use strict";

  var WHATSAPP = "5516991166681";

  function post(data) {
    // text/plain evita a requisição de preflight (CORS) no Apps Script.
    return fetch(VOTOS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
      redirect: "follow",
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
    return value;
  }

  /* ---------- Estudos: pedido pelo WhatsApp ---------- */
  var modal = document.getElementById("estudos-modal");
  if (modal) {
    var form = modal.querySelector(".estudos-form");
    var errorEl = modal.querySelector(".estudos-form__error");
    var titleEl = modal.querySelector("[data-estudos-titulo]");
    var current = null;
    var lastTrigger = null;

    var setError = function (msg) {
      errorEl.textContent = msg || "";
      errorEl.hidden = !msg;
    };
    var fromButton = function (btn) {
      var titulo = btn.getAttribute("data-estudo-titulo") || "";
      return {
        titulo: titulo,
        material: btn.getAttribute("data-estudo-material") || titulo.split(":")[0].trim(),
      };
    };
    var open = function (btn) {
      current = fromButton(btn);
      lastTrigger = btn || null;
      titleEl.textContent = current.titulo;
      setError("");
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      document.documentElement.classList.add("estudos-modal-open");
      var first = form.elements.nome;
      if (first) setTimeout(function () { first.focus(); }, 30);
    };
    var close = function () {
      if (typeof modal.close === "function") modal.close();
      else { modal.removeAttribute("open"); document.documentElement.classList.remove("estudos-modal-open"); }
    };
    modal.addEventListener("close", function () {
      document.documentElement.classList.remove("estudos-modal-open");
      if (lastTrigger) lastTrigger.focus();
    });
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest("[data-estudos-close]")) close();
    });

    document.querySelectorAll("[data-estudo-id]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        open(btn);
      });
    });
    if (location.hash === "#solicitar" || location.hash === "#baixar") {
      var auto = document.querySelector(".estudos-panel [data-estudo-id]");
      if (auto) open(auto);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!current) return;
      if (form.elements.empresa && form.elements.empresa.value) { close(); return; }
      var nome = form.elements.nome.value.replace(/\s+/g, " ").trim();
      if (nome.length < 2) { setError("Informe o seu nome."); form.elements.nome.focus(); return; }
      setError("");
      var text = "Olá, Flávio, meu nome é " + nome + " e gostaria de receber o material " + current.material + ".";
      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text);
      // Medição (só com consentimento, via js/consent.js). O nome não é enviado.
      if (window.fbConsent) window.fbConsent.track("dossie_request", { material: current.material });
      var win = null;
      try { win = window.open(url, "_blank"); } catch (err) { win = null; }
      if (win) {
        try { win.opener = null; } catch (err) { /* sem acesso, tudo bem */ }
      } else {
        // Janela bloqueada (comum no Safari do iPhone): segue na mesma aba.
        window.location.href = url;
        return;
      }
      close();
    });
  }

  /* ---------- Compartilhar ---------- */
  document.querySelectorAll(".mercado-share").forEach(function (box) {
    var url = box.getAttribute("data-share-url");
    var title = box.getAttribute("data-share-title");
    var status = box.querySelector(".mercado-share__status");
    var timer = null;
    var say = function (msg) {
      status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { status.textContent = ""; }, 4000);
    };
    var copy = function (after) {
      var done = function () { say(after || "Link copiado"); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done, function () { fallback(); });
      } else fallback();
      function fallback() {
        var t = document.createElement("textarea");
        t.value = url;
        t.setAttribute("readonly", "");
        t.style.position = "fixed";
        t.style.opacity = "0";
        document.body.appendChild(t);
        t.select();
        try { document.execCommand("copy"); done(); } catch (e) { say("Copie o endereço da página na barra do navegador."); }
        document.body.removeChild(t);
      }
    };
    box.querySelectorAll("[data-share]").forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener("click", function () {
        if (btn.getAttribute("data-share") === "instagram" && navigator.share) {
          navigator.share({ title: title, text: "Achei esta leitura do Flávio Barros interessante: " + title, url: url }).catch(function () {});
        } else if (btn.getAttribute("data-share") === "instagram") {
          copy("Link copiado. Cole no Instagram para compartilhar.");
        } else {
          copy();
        }
      });
    });
  });

  /* ---------- Esta leitura foi útil? ---------- */
  document.querySelectorAll(".mercado-vote").forEach(function (box) {
    var artigo = box.getAttribute("data-artigo");
    var key = "mercado-voto:" + artigo;
    var thanks = box.querySelector(".mercado-vote__thanks");
    var buttons = box.querySelector(".mercado-vote__buttons");
    var question = box.querySelector(".mercado-vote__question");
    var done = function () {
      buttons.hidden = true;
      question.hidden = true;
      thanks.hidden = false;
    };
    box.hidden = false;
    if (store(key)) { done(); return; }
    box.querySelectorAll("[data-voto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var voto = btn.getAttribute("data-voto");
        store(key, voto);
        done();
        if (!VOTOS_ENDPOINT) return;
        var cid = store("mercado-cid");
        if (!cid) cid = store("mercado-cid", Math.random().toString(36).slice(2) + Date.now().toString(36));
        post({ acao: "voto", artigo: artigo, titulo: box.getAttribute("data-titulo"), voto: voto, cid: cid || "" }).catch(function () {});
      });
    });
  });
})();
