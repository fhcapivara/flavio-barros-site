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
      text: "No seu dia a dia, você prefere um ambiente mais recolhido e silencioso, ou com mais movimento e convivência?",
      options: [
        { label: "Mais recolhido e silencioso", value: "privacidade" },
        { label: "Mais movimento e convivência", value: "integracao" },
        { label: "Um equilíbrio entre os dois", value: "meio" },
      ],
    },
    {
      id: "chegada",
      text: "Ao chegar em casa, faz mais sentido ter contato com área externa e jardim, ou a praticidade de um apartamento?",
      options: [
        { label: "Área externa e jardim", value: "casa" },
        { label: "Praticidade de apartamento", value: "apto" },
        { label: "Ainda considero construir", value: "terreno" },
      ],
    },
    {
      id: "objetivo",
      text: "Neste momento, o foco é morar, investir, ou ainda avaliar as duas possibilidades?",
      options: [
        { label: "Morar", value: "morar" },
        { label: "Investir", value: "investir" },
        { label: "Avaliar as duas possibilidades", value: "ambos" },
      ],
    },
    {
      id: "regiao",
      text: "Há algum bairro ou região em Ribeirão Preto (ou arredores) que já desperta o seu interesse, ou prefere manter as opções em aberto?",
      options: [{ label: "Prefiro manter as opções em aberto", value: "aberto" }],
      allowFree: true,
    },
    {
      id: "decisores",
      text: "Além de você, alguém mais participa dessa decisão?",
      options: [
        { label: "Sim, alguém da família", value: "casa" },
        { label: "Sim, um sócio", value: "socio" },
        { label: "Por enquanto, apenas eu", value: "sozinho" },
      ],
    },
    {
      id: "prazo",
      text: "Vocês desejam avançar com mais urgência, ou preferem escolher com calma?",
      options: [
        { label: "Com mais urgência", value: "curto" },
        { label: "Escolher com calma", value: "medio" },
        { label: "Ainda estamos explorando", value: "explorando" },
      ],
    },
    {
      id: "rotina",
      text: "Há algo indispensável na rotina — espaço para trabalho, visitas, animais — que eu deva considerar?",
      options: [
        { label: "Espaço para visitas", value: "visitas" },
        { label: "Espaço para trabalho", value: "office" },
        { label: "Espaço para animais", value: "pets" },
        { label: "Um pouco de cada", value: "tudo" },
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
      "Com base no que você compartilhou, separei três opções. Posso enviá-las ao WhatsApp do Flávio?"
    );
    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "capi-choice";
    yes.textContent = "Sim, mostrar as três";
    yes.addEventListener("click", showResults);
    const no = document.createElement("button");
    no.type = "button";
    no.className = "capi-choice";
    no.textContent = "Prefiro ajustar uma resposta";
    no.addEventListener("click", () => {
      step = 0;
      Object.keys(answers).forEach((k) => delete answers[k]);
      thread.innerHTML = "";
      bubble(
        "capi",
        "Olá, eu sou a Capi. Em poucas perguntas, consigo entender o ritmo que você busca e apresentar três caminhos alinhados a ele."
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
    bubble("user", "Sim, mostrar as três");
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
      "Olá, eu sou a Capi. Em poucas perguntas, consigo entender o ritmo que você busca e apresentar três caminhos alinhados a ele."
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
