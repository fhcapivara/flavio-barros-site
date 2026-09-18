(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav__toggle");

  /* Sticky header border on scroll */
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile nav */
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("nav--open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });

    nav.querySelectorAll(".nav__links a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("nav--open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
      });
    });
  }

  document.addEventListener("click", function (e) {
    if (!nav || !nav.classList.contains("nav--open")) return;
    if (header && header.contains(e.target)) return;
    nav.classList.remove("nav--open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !nav || !nav.classList.contains("nav--open")) return;
    nav.classList.remove("nav--open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu");
      toggle.focus();
    }
  });

  /* Reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else if (reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -32px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  }

  /* Contact form → WhatsApp (no storage) */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var objetivo = (form.querySelector("#objetivo") || {}).value || "";
      var regiao = (form.querySelector("#regiao") || {}).value || "";
      var faixa = (form.querySelector("#faixa") || {}).value || "";
      var prazo = (form.querySelector("#prazo") || {}).value || "";
      var mensagem = (form.querySelector("#mensagem") || {}).value || "";

      var parts = ["Olá, Flávio. Gostaria de agendar uma conversa."];
      if (objetivo) parts.push("Objetivo: " + objetivo);
      if (regiao) parts.push("Região: " + regiao);
      if (faixa) parts.push("Perfil de interesse: " + faixa);
      if (prazo) parts.push("Prazo: " + prazo);
      if (mensagem) parts.push("Obs.: " + mensagem);

      var url =
        "https://wa.me/5516991166681?text=" +
        encodeURIComponent(parts.join("\n"));
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }
})();
