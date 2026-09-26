/*
 * Leitura de mercado: download de estudos, compartilhamento e avaliação dos textos.
 * Sem bibliotecas externas, sem cookies. Carregado em todas as páginas de /mercado/.
 *
 * ESTUDOS_ENDPOINT: URL do app da Web do Google Apps Script (termina em /exec).
 * Enquanto estiver vazio, o botão "Baixar o estudo" mostra "Download disponível em breve"
 * e os votos ficam só no navegador do visitante.
 */
var ESTUDOS_ENDPOINT = "";

(function () {
  "use strict";

  function post(data) {
    // text/plain evita a requisição de preflight (CORS) no Apps Script.
    return fetch(ESTUDOS_ENDPOINT, {
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

  /* ---------- Estudos: formulário de download ---------- */
  var modal = document.getElementById("estudos-modal");
  if (modal) {
    var form = modal.querySelector(".estudos-form");
    var errorEl = modal.querySelector(".estudos-form__error");
    var submit = modal.querySelector(".estudos-form__submit");
    var titleEl = modal.querySelector("[data-estudos-titulo]");
    var nomeEl = modal.querySelector("[data-estudos-nome]");
    var linkEl = modal.querySelector("[data-estudos-link]");
    var waEl = modal.querySelector("[data-estudos-wa]");
    var phone = form.elements.telefone;
    var current = null;
    var lastTrigger = null;

    var showStep = function (name) {
      modal.querySelectorAll("[data-estudos-step]").forEach(function (el) {
        el.hidden = el.getAttribute("data-estudos-step") !== name;
      });
    };
    var setError = function (msg) {
      errorEl.textContent = msg || "";
      errorEl.hidden = !msg;
    };
    var open = function (id, titulo, trigger) {
      current = { id: id, titulo: titulo };
      lastTrigger = trigger || null;
      titleEl.textContent = titulo;
      setError("");
      submit.disabled = false;
      submit.textContent = "Liberar download";
      if (!ESTUDOS_ENDPOINT) {
        waEl.href = "https://wa.me/5516991166681?text=" + encodeURIComponent("Olá, Flávio. Gostaria de receber o estudo \"" + titulo + "\".");
        showStep("breve");
      } else {
        showStep("form");
      }
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      document.documentElement.classList.add("estudos-modal-open");
      var first = modal.querySelector("[data-estudos-step]:not([hidden]) input, [data-estudos-step]:not([hidden]) .btn");
      if (first) setTimeout(function () { first.focus(); }, 30);
    };
    var close = function () {
      if (typeof modal.close === "function") modal.close();
      else modal.removeAttribute("open");
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
        open(btn.getAttribute("data-estudo-id"), btn.getAttribute("data-estudo-titulo"), btn);
      });
    });
    if (location.hash === "#baixar") {
      var auto = document.querySelector(".estudos-panel [data-estudo-id]");
      if (auto) open(auto.getAttribute("data-estudo-id"), auto.getAttribute("data-estudo-titulo"), auto);
    }

    // Máscara leve: (16) 99999-9999
    phone.addEventListener("input", function () {
      var d = phone.value.replace(/\D/g, "");
      if (d.length > 11 && d.indexOf("55") === 0) d = d.slice(2);
      d = d.slice(0, 11);
      var cut = d.length > 10 ? 7 : 6;
      var out = d;
      if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2, cut);
      if (d.length > cut) out += "-" + d.slice(cut);
      phone.value = out;
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!current) return;
      var nome = form.elements.nome.value.replace(/\s+/g, " ").trim();
      var digits = phone.value.replace(/\D/g, "");
      if (nome.length < 2) { setError("Informe o seu nome."); form.elements.nome.focus(); return; }
      if (digits.length < 10) { setError("Informe um telefone com DDD, por exemplo (16) 99999-9999."); phone.focus(); return; }
      if (!form.elements.consentimento.checked) { setError("Marque a autorização para liberar o download."); return; }
      if (!ESTUDOS_ENDPOINT) { showStep("breve"); return; }
      setError("");
      submit.disabled = true;
      submit.textContent = "Liberando o download…";
      post({
        acao: "download",
        estudo_id: current.id,
        nome: nome,
        telefone: phone.value,
        consentimento: true,
        pagina: location.origin + location.pathname,
        empresa: form.elements.empresa.value,
      }).then(function (res) {
        if (!res || !res.ok || !res.url) throw new Error((res && res.erro) || "sem url");
        nomeEl.textContent = nome.split(" ")[0];
        linkEl.href = res.url;
        showStep("ok");
        linkEl.focus();
        try { window.open(res.url, "_blank", "noopener"); } catch (err) { /* o botão continua disponível */ }
      }).catch(function () {
        submit.disabled = false;
        submit.textContent = "Liberar download";
        setError("Não foi possível liberar o download agora. Tente de novo em instantes ou fale comigo pelo WhatsApp, (16) 99116-6681.");
      });
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
        if (!ESTUDOS_ENDPOINT) return;
        var cid = store("mercado-cid");
        if (!cid) cid = store("mercado-cid", Math.random().toString(36).slice(2) + Date.now().toString(36));
        post({ acao: "voto", artigo: artigo, titulo: box.getAttribute("data-titulo"), voto: voto, cid: cid || "" }).catch(function () {});
      });
    });
  });
})();
