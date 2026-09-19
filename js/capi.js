(() => {
  "use strict";

  const WA = "5516991166681";
  const thread = document.getElementById("capi-thread");
  const choicesEl = document.getElementById("capi-choices");
  const freeWrap = document.getElementById("capi-free");
  const freeInput = document.getElementById("capi-free-input");
  const freeSend = document.getElementById("capi-free-send");
  const hub = document.getElementById("capi-hub");
  const chat = document.getElementById("capi-chat");
  const results = document.getElementById("capi-results");
  const cards = document.getElementById("capi-cards");
  const waBtn = document.getElementById("capi-wa");
  const robots = document.getElementById("robots-meta");
  const startBtn = document.getElementById("capi-start");
  const restartBtn = document.getElementById("capi-restart");
  const resultsLead = document.getElementById("capi-results-lead");

  const answers = {};
  let inventory = [];
  let step = 0;
  let picked = [];

  const steps = [
    {
      id: "ritmo",
      text: "No dia a dia, você tá mais pra casa cheia e movimento, ou pra silêncio e recolhimento?",
      options: [
        { label: "Casa cheia e movimento", value: "integracao" },
        { label: "Silêncio e recolhimento", value: "privacidade" },
        { label: "Um meio-termo", value: "meio" },
      ],
    },
    {
      id: "chegada",
      text: "Quando você chega do trabalho, prefere pisar no quintal ou jardim, ou subir de elevador e travar a porta?",
      options: [
        { label: "Quintal ou jardim", value: "casa" },
        { label: "Elevador e porta", value: "apto" },
        { label: "Ainda penso em construir", value: "terreno" },
      ],
    },
    {
      id: "objetivo",
      text: "Isso é mais pra morar de verdade, pra renda, ou ainda misturando as duas ideias?",
      options: [
        { label: "Morar de verdade", value: "morar" },
        { label: "Renda", value: "investir" },
        { label: "Misturando as duas", value: "ambos" },
      ],
    },
    {
      id: "regiao",
      text: "Tem algum pedaço de Ribeirão (ou região) que já te puxa, ou tá em branco de propósito?",
      options: [{ label: "Ainda estou aberto", value: "aberto" }],
      allowFree: true,
    },
    {
      id: "decisores",
      text: "Quem divide essa decisão com você — alguém em casa, sócio, ou por enquanto é só você?",
      options: [
        { label: "Alguém em casa", value: "casa" },
        { label: "Sócio", value: "socio" },
        { label: "Por enquanto só eu", value: "sozinho" },
      ],
    },
    {
      id: "prazo",
      text: "Vocês estão com pressa de mudar, ou querem acertar sem correr?",
      options: [
        { label: "Com pressa", value: "curto" },
        { label: "Acertar sem correr", value: "medio" },
        { label: "Ainda explorando", value: "explorando" },
      ],
    },
    {
      id: "rotina",
      text: "Espaço pra visitas, home office, pets… o que não pode faltar na rotina?",
      options: [
        { label: "Visitas e convívio", value: "visitas" },
        { label: "Home office", value: "office" },
        { label: "Pets", value: "pets" },
        { label: "Um pouco de tudo", value: "tudo" },
      ],
    },
  ];

  function setSessionMode(on) {
    if (robots) robots.content = on ? "noindex,follow" : "index,follow";
    if (on) history.replaceState(null, "", "#conversa");
    else history.replaceState(null, "", "capi.html");
  }

  function bubble(who, text) {
    const el = document.createElement("div");
    el.className = "capi-bubble capi-bubble--" + who;
    el.textContent = text;
    thread.appendChild(el);
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearChoices() {
    choicesEl.innerHTML = "";
    freeWrap.hidden = true;
    freeInput.value = "";
  }

  function ask() {
    clearChoices();
    if (step >= steps.length) {
      finishAsk();
      return;
    }
    const s = steps[step];
    bubble("capi", s.text);
    s.options.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "capi-choice";
      b.textContent = opt.label;
      b.addEventListener("click", () => answer(s.id, opt.value, opt.label));
      choicesEl.appendChild(b);
    });
    if (s.allowFree) {
      freeWrap.hidden = false;
      freeInput.focus();
    }
  }

  function answer(id, value, label) {
    answers[id] = { value, label };
    bubble("user", label);
    step += 1;
    ask();
  }

  function finishAsk() {
    clearChoices();
    bubble(
      "capi",
      "Com o que você me contou, separei 3 opções que fazem sentido. Quer que eu mande no WhatsApp do Flávio?"
    );
    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "capi-choice";
    yes.textContent = "Sim, mostrar as 3";
    yes.addEventListener("click", showResults);
    const no = document.createElement("button");
    no.type = "button";
    no.className = "capi-choice";
    no.textContent = "Quero ajustar algo";
    no.addEventListener("click", () => {
      step = 0;
      Object.keys(answers).forEach((k) => delete answers[k]);
      thread.innerHTML = "";
      bubble(
        "capi",
        "Oi, eu sou a Capi. Imagina o lugar onde você quer viver ou investir — me conta um pouco do seu ritmo que eu te mostro 3 caminhos."
      );
      ask();
    });
    choicesEl.appendChild(yes);
    choicesEl.appendChild(no);
  }

  function typeFilter() {
    const c = answers.chegada && answers.chegada.value;
    if (c === "apto") return ["APARTMENT"];
    if (c === "terreno") return ["LAND"];
    if (c === "casa") return ["HOUSE", "TWO_STORY_HOUSE"];
    return null;
  }

  function bedsMin() {
    const r = answers.rotina && answers.rotina.value;
    if (r === "visitas" || r === "tudo") return 3;
    if (r === "office" || r === "pets") return 2;
    return 0;
  }

  function score(p) {
    let s = 0;
    const ritmo = answers.ritmo && answers.ritmo.value;
    if (ritmo === "privacidade" && (p.type === "HOUSE" || p.type === "LAND" || p.type === "TWO_STORY_HOUSE")) s += 3;
    if (ritmo === "integracao" && p.type === "APARTMENT") s += 3;
    if (ritmo === "meio") s += 1;
    const types = typeFilter();
    if (types && types.includes(p.type)) s += 5;
    const reg = answers.regiao && answers.regiao.value;
    if (reg && reg !== "aberto") {
      const q = String(reg).toLowerCase();
      const hay = ((p.neighborhood || "") + " " + (p.city || "") + " " + (p.title || "")).toLowerCase();
      if (hay.includes(q)) s += 4;
    }
    const bm = bedsMin();
    if (p.type !== "LAND" && bm && (p.beds || 0) >= bm) s += 2;
    if (p.featured) s += 1;
    s += Math.min(3, Math.floor((p.sale || 0) / 5000000));
    return s;
  }

  function selectThree() {
    let pool = inventory.slice();
    const types = typeFilter();
    if (types) {
      const tight = pool.filter((p) => types.includes(p.type));
      if (tight.length >= 3) pool = tight;
    }
    const reg = answers.regiao && answers.regiao.value;
    if (reg && reg !== "aberto") {
      const q = String(reg).toLowerCase();
      const regional = pool.filter((p) =>
        ((p.neighborhood || "") + " " + (p.city || "")).toLowerCase().includes(q)
      );
      if (regional.length >= 3) pool = regional;
    }
    const bm = bedsMin();
    if (bm) {
      const withBeds = pool.filter((p) => p.type === "LAND" || (p.beds || 0) >= bm);
      if (withBeds.length >= 3) pool = withBeds;
    }
    pool.sort((a, b) => score(b) - score(a));
    const out = [];
    const seen = new Set();
    for (const p of pool) {
      if (seen.has(p.ref)) continue;
      seen.add(p.ref);
      out.push(p);
      if (out.length === 3) break;
    }
    return out;
  }

  function money(n) {
    return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }

  function criterioLine(p) {
    const bits = [];
    if (p.neighborhood) bits.push(p.neighborhood);
    if (p.type === "LAND") bits.push("terreno com vocação de uso");
    else if (p.beds) bits.push(p.beds + " quartos");
    if (p.area) bits.push(p.area + " m²");
    return bits.join(" · ") || "Critério alinhado ao seu ritmo";
  }

  function showResults() {
    bubble("user", "Sim, mostrar as 3");
    clearChoices();
    picked = selectThree();
    chat.hidden = true;
    results.hidden = false;
    cards.innerHTML = "";
    if (picked.length < 3) {
      resultsLead.textContent = "Não achei 3 encaixes honestos. Ajuste uma resposta ou fale comigo.";
      waBtn.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(
        "Olá Flávio, falei com a Capi e ainda não fechamos 3 opções. Podemos conversar?"
      );
      return;
    }
    resultsLead.textContent = "Três caminhos que combinam com o que você me contou.";
    picked.forEach((p) => {
      const art = document.createElement("article");
      art.className = "card reveal";
      const img = p.image
        ? '<img src="' + p.image + '" alt="" loading="lazy" />'
        : "";
      art.innerHTML =
        '<div class="card__media">' +
        img +
        '</div><div class="card__body"><h3 class="card__title">' +
        escapeHtml(p.title || "Imóvel") +
        '</h3><p class="card__text">' +
        escapeHtml(criterioLine(p)) +
        '</p><p class="card__meta"><span>' +
        money(p.sale) +
        '</span></p><p class="capi-card-actions"><a class="text-link" href="' +
        escapeHtml(p.detailUrl || "selecao.html") +
        '" target="_blank" rel="noopener noreferrer">Ver detalhes</a></p></div>';
      cards.appendChild(art);
    });
    const msg = waMessage();
    waBtn.href = "https://wa.me/" + WA + "?text=" + encodeURIComponent(msg);
  }

  function waMessage() {
    const obj = (answers.objetivo && answers.objetivo.label) || "";
    const tipo = (answers.chegada && answers.chegada.label) || "";
    const pri = (answers.ritmo && answers.ritmo.label) || "";
    const reg =
      answers.regiao && answers.regiao.value !== "aberto"
        ? answers.regiao.label
        : "aberto";
    const rot = (answers.rotina && answers.rotina.label) || "";
    const prazo = (answers.prazo && answers.prazo.label) || "";
    const dec = (answers.decisores && answers.decisores.label) || "";
    const opts = picked
      .map((p, i) => i + 1 + ") " + (p.title || p.ref) + " (ref " + p.ref + ")")
      .join("; ");
    return (
      "Olá Flávio, falei com a Capi. Busco: " +
      obj +
      ". Tipo: " +
      tipo +
      ". Prioridade: " +
      pri +
      ". Região: " +
      reg +
      ". Rotina: " +
      rot +
      ". Prazo: " +
      prazo +
      ". Decisores: " +
      dec +
      ". As 3 opções: " +
      opts +
      "."
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clearChoices() {
    choicesEl.innerHTML = "";
    freeWrap.hidden = true;
  }

  function start() {
    hub.hidden = true;
    chat.hidden = false;
    results.hidden = true;
    setSessionMode(true);
    step = 0;
    Object.keys(answers).forEach((k) => delete answers[k]);
    thread.innerHTML = "";
    bubble(
      "capi",
      "Oi, eu sou a Capi. Imagina o lugar onde você quer viver ou investir — me conta um pouco do seu ritmo que eu te mostro 3 caminhos."
    );
    ask();
  }

  freeSend.addEventListener("click", () => {
    const v = freeInput.value.trim();
    if (!v) return;
    const s = steps[step];
    answer(s.id, v, v);
  });
  freeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") freeSend.click();
  });
  startBtn.addEventListener("click", start);
  restartBtn.addEventListener("click", start);

  fetch("data/selecao.json")
    .then((r) => r.json())
    .then((data) => {
      inventory = data.items || data || [];
    })
    .catch(() => {
      inventory = [];
    });

  if (location.hash === "#conversa") start();
})();
