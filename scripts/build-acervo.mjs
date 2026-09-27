#!/usr/bin/env node
/**
 * Acervo: pré-renderiza os imóveis em selecao.html (HTML real, com links, para o Google)
 * e gera as páginas de região em /imoveis/{slug}.html a partir de data/regioes/*.md.
 *
 * Fonte: data/selecao.json (scripts/sync-lanportus.mjs) e data/acervo-exclude.json.
 * O grid padrão segue as mesmas regras de js/selecao.js sem filtros: sem comerciais
 * e sem as referências de data/acervo-exclude.json. Nenhum valor (preço) é publicado.
 *
 * Regiões: publicado: sim + pelo menos 1 imóvel => página indexável e no sitemap.
 * Publicada com 0 imóveis => página continua no ar com noindex e sai do sitemap
 * (volta sozinha quando houver imóveis). publicado: não => página não é gerada.
 *
 * Uso: node scripts/build-acervo.mjs   (também roda no fim de scripts/sync-lanportus.mjs
 * e na Action .github/workflows/build-mercado.yml). Sem dependências. Node 18+.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { markdown } from "./lib/markdown.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE = "https://flaviodebarros.com.br";
const WHATSAPP = "5516991166681";
const SELECAO_HTML = join(ROOT, "selecao.html");
const DATA = join(ROOT, "data", "selecao.json");
const EXCLUDE = join(ROOT, "data", "acervo-exclude.json");
const REGIOES_DIR = join(ROOT, "data", "regioes");
const OUT_DIR = join(ROOT, "imoveis");
const SITEMAP = join(ROOT, "sitemap.xml");
const TEMPLATE_PAGE = join(ROOT, "atuacao.html");
const OG = { url: `${SITE}/images/og/flavio-barros-og-v2-1200x630.jpg`, alt: "Flávio Barros, consultor imobiliário em Ribeirão Preto" };

/* ---- regras iguais às de js/selecao.js ---- */
const TYPE_LABEL = { HOUSE: "Casa", APARTMENT: "Apartamento", TWO_STORY_HOUSE: "Sobrado", LAND: "Terreno", ROOM: "Sala", HALL: "Salão / ponto", BUILDING: "Prédio comercial", OUTHOUSE: "Galpão" };
const COMMERCIAL = { ROOM: 1, HALL: 1, BUILDING: 1, OUTHOUSE: 1 };
const TYPE_ALIAS = { casa: "HOUSE", casas: "HOUSE", apartamento: "APARTMENT", apartamentos: "APARTMENT", sobrado: "TWO_STORY_HOUSE", sobrados: "TWO_STORY_HOUSE", terreno: "LAND", terrenos: "LAND" };

const isCommercialLand = (p) => p.type === "LAND" && /comerci|industri|galp|barrac|lote comercial|terreno comercial/.test(((p.title || "") + " " + (p.neighborhood || "") + " " + (p.tags || []).join(" ")).toLowerCase());
const isCommercialListing = (p) => !!COMMERCIAL[p.type] || isCommercialLand(p);
const typeLabel = (t) => TYPE_LABEL[t] || t || "";
// Anúncios de locação ou aluguel ficam fora do Acervo (mesma regra em js/selecao.js e no sync).
export const isRental = (p) => /loca[cç][aã]o|aluguel/i.test((p.title || "") + " " + (p.description || "") + " " + (p.tags || []).join(" "));
// Anúncios idênticos (mesmo título, tipo, área, quartos e bairro) aparecem uma vez só.
const dupKey = (p) => [norm(p.title), p.type, Math.round(Number(p.area) || 0), Number(p.beds) || 0, norm(p.neighborhood)].join("|");
export function cleanItems(items, log) {
  const seen = new Map();
  const out = [];
  for (const p of items) {
    if (isRental(p)) { if (log) log.rental.push(`${p.ref} (${p.title})`); continue; }
    const k = dupKey(p);
    if (seen.has(k)) { if (log) log.dup.push(`${p.ref} (igual a ${seen.get(k)}: ${p.title})`); continue; }
    seen.set(k, p.ref);
    out.push(p);
  }
  return out;
}

// Mesmo escape de js/selecao.js (escapeHtml), para o HTML sair idêntico.
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['´`’‘]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function detailUrl(p) {
  if (p.detailUrl && p.detailUrl.indexOf("lanportus.com.br") === -1) return p.detailUrl;
  return "imovel.html?ref=" + encodeURIComponent(p.ref);
}
function waUrl(p) {
  return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Olá Flávio, vi o imóvel ref. " + p.ref + " na Seleção do site e gostaria de mais detalhes.");
}

// ATENÇÃO: manter igual a cardHtml() em js/selecao.js.
export function cardHtml(p, prefix = "") {
  const loc = [p.neighborhood, p.city].filter(Boolean).join(" · ");
  const meta = [];
  if (p.type !== "LAND" && !COMMERCIAL[p.type] && p.beds) meta.push(p.beds + " quartos");
  if (p.area) meta.push(Math.round(p.area) + " m²");
  if (p.garages) meta.push(p.garages + " vagas");
  const url = prefix + detailUrl(p);
  const img = p.image
    ? '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" decoding="async" width="560" height="400" />'
    : '<div class="selecao-card__placeholder" aria-hidden="true"></div>';
  return (
    '<article class="selecao-card">' +
    '<a class="selecao-card__media" href="' + esc(url) + '" tabindex="-1" aria-hidden="true">' + img + "</a>" +
    '<div class="selecao-card__body">' +
    '<span class="selecao-card__tag">' + esc(typeLabel(p.type)) + (loc ? " · " + esc(loc) : "") + "</span>" +
    '<h3 class="selecao-card__title"><a href="' + esc(url) + '">' + esc(p.title) + "</a></h3>" +
    (meta.length ? '<div class="selecao-card__meta">' + meta.map((m) => "<span>" + esc(m) + "</span>").join("") + "</div>" : "") +
    '<div class="selecao-card__actions">' +
    '<a class="btn btn--ghost" href="' + esc(url) + '">Ver detalhes</a>' +
    '<a class="btn btn--primary" href="' + esc(waUrl(p)) + '" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>' +
    "</div>" +
    '<p class="selecao-card__ref">Ref. ' + esc(p.ref) + "</p>" +
    "</div></article>"
  );
}

function countText(n) {
  return n + (n === 1 ? " imóvel na seleção" : " imóveis na seleção");
}

function itemListLd(list, name, url) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: list.length,
    itemListElement: list.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/${detailUrl(p)}`, name: p.title })),
  };
}
const ldScript = (ld) => `  <script type="application/ld+json">\n${JSON.stringify(ld, null, 2).replace(/</g, "\\u003c")}\n  </script>`;

function between(html, name, content) {
  const re = new RegExp(`(<!-- ${name}:INICIO[^>]*-->)[\\s\\S]*?(<!-- ${name}:FIM -->)`);
  if (!re.test(html)) throw new Error(`Marcador ${name} não encontrado em selecao.html`);
  return html.replace(re, (_, a, b) => `${a}${content}${b}`);
}

/* ---- regiões ---- */
function parseFrontMatter(src) {
  src = src.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const m = src.match(/^\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kv = line.match(/^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) data[kv[1].toLowerCase()] = kv[2].trim();
  }
  return { data, body: src.slice(m[0].length).trim() };
}
const yes = (v) => /^(sim|true|yes)$/i.test(String(v || "").trim());
const list = (v) => String(v || "").split("|").map((x) => x.trim()).filter(Boolean);

function readRegioes() {
  if (!existsSync(REGIOES_DIR)) return [];
  const out = [];
  for (const f of readdirSync(REGIOES_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort()) {
    const fm = parseFrontMatter(readFileSync(join(REGIOES_DIR, f), "utf8"));
    if (!fm) { console.warn(`Região ignorada (sem bloco ---): ${f}`); continue; }
    const d = fm.data;
    const slug = (d.slug || f.replace(/\.md$/, "")).trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) { console.warn(`Região ignorada (slug inválido "${slug}"): ${f}`); continue; }
    const titulo = d.titulo || "";
    const busca = list(d.busca).map(norm);
    const buscaBairro = list(d.busca_bairro).map(norm);
    if (!titulo || !(busca.length || buscaBairro.length)) { console.warn(`Região ignorada (faltam titulo ou busca): ${f}`); continue; }
    out.push({
      file: f, slug, titulo, busca, buscaBairro,
      publicado: yes(d.publicado),
      nome: d.nome || titulo,
      tituloSeo: d.titulo_seo || `${titulo} | Flávio Barros`,
      descricao: d.descricao || "",
      resumo: list(d.resumo),
      tipos: list(d.tipos).map((t) => TYPE_ALIAS[norm(t)] || t.toUpperCase()),
      comerciais: yes(d.incluir_comerciais),
      body: fm.body,
    });
  }
  return out;
}
function regionMatches(r, p) {
  if (r.tipos.length && !r.tipos.includes(p.type)) return false;
  if (!r.comerciais && isCommercialListing(p)) return false;
  const hay = norm([p.neighborhood, p.condominio, p.title].join(" "));
  const bairro = norm(p.neighborhood);
  return r.busca.some((t) => hay.includes(t)) || r.buscaBairro.some((t) => bairro.includes(t));
}

/* ---- moldura do site (copiada de atuacao.html, como em build-mercado.mjs) ---- */
function loadChrome() {
  const html = readFileSync(TEMPLATE_PAGE, "utf8");
  const grab = (re) => { const m = html.match(re); if (!m) throw new Error("atuacao.html sem " + re); return m[0]; };
  const abs = (s) => s.replace(/\s+aria-current="page"/g, "")
    .replace(/\b(href|src)="(?!https?:|\/\/|\/|#|mailto:|tel:|data:)([^"]*)"/g, '$1="/$2"')
    .replace(/\b(href)="\/index\.html"/g, '$1="/"');
  const header = abs(grab(/<header class="site-header">[\s\S]*?<\/header>/)).replace('<a href="/selecao.html">', '<a href="/selecao.html" aria-current="page">');
  const footer = abs(grab(/<footer class="site-footer">[\s\S]*?<\/footer>/));
  const sticky = abs(grab(/<a class="wa-sticky"[\s\S]*?<\/a>/));
  const after = html.slice(html.indexOf("</footer>"));
  const scripts = (after.match(/<script\b[^>]*src="[^"]*"[^>]*><\/script>/g) || []).map(abs).join("\n  ");
  const headLinks = (html.match(/<link rel="preconnect"[^>]*>|<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/g) || []).join("\n  ");
  return { header, footer, sticky, scripts, headLinks };
}

const GRID_MARKER = /^\s*\[GRADE DE IM[ÓO]VEIS DO ACERVO DESTE BAIRRO\]\s*$/im;

function regionPage(r, items, c) {
  const url = `${SITE}/imoveis/${r.slug}.html`;
  const desc = r.descricao || `${r.titulo}: imóveis à venda com curadoria de Flávio Barros em Ribeirão Preto.`;
  const robots = items.length ? "index,follow" : "noindex,follow";
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá, Flávio. Vi a página ${r.nome} no seu site e gostaria da sua curadoria.`)}`;
  const e = (s) => esc(s);
  const grid = items.length
    ? `<p class="selecao-count">${esc(countText(items.length))}</p>\n        <div class="selecao-grid">\n${items.map((p) => cardHtml(p, "/")).join("\n")}\n        </div>`
    : `<p class="acervo-regiao__vazio">No momento não há imóveis desta região no acervo. Fale comigo e eu aviso quando surgir uma boa opção.</p>`;
  const [before, after = ""] = r.body.split(GRID_MARKER);
  const prose = (md) => md.trim() ? `
    <section class="section acervo-regiao__texto">
      <div class="container">
        <div class="mercado-prose reveal">
${markdown(md.trim())}
        </div>
      </div>
    </section>
` : "";
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Imóveis", item: `${SITE}/selecao.html` },
      { "@type": "ListItem", position: 3, name: r.nome, item: url },
    ],
  };
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${e(desc)}" />
  <title>${e(r.tituloSeo)}</title>
  ${c.headLinks}
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#F7F5F2" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="${robots}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Flávio Barros" />
  <meta property="og:title" content="${e(r.tituloSeo)}" />
  <meta property="og:description" content="${e(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${OG.url}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${e(OG.alt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${e(r.tituloSeo)}" />
  <meta name="twitter:description" content="${e(desc)}" />
  <meta name="twitter:image" content="${OG.url}" />
  <meta name="twitter:image:alt" content="${e(OG.alt)}" />
${ldScript(breadcrumb)}
${items.length ? ldScript(itemListLd(items, r.titulo, url)) + "\n" : ""}</head>
<body>
  <a class="skip-link" href="#main">Ir para o conteúdo</a>
  ${c.header}

  <main id="main">
    <section class="page-hero">
      <div class="container">
        <div class="page-hero__inner reveal">
          <nav class="breadcrumb eyebrow" aria-label="Você está em"><a href="/">Início</a> <span aria-hidden="true">·</span> <a href="/selecao.html">Imóveis</a> <span aria-hidden="true">·</span> <span aria-current="page">${e(r.nome)}</span></nav>
          <h1>${e(r.titulo)}</h1>
${r.resumo.map((x) => `          <p class="lead">${e(x)}</p>`).join("\n")}
        </div>
      </div>
    </section>
${prose(before)}
    <section class="section section--selecao" aria-label="Imóveis do acervo nesta região">
      <div class="container container--wide">
        ${grid}
        <p class="mercado-back"><a href="/selecao.html">← Ver todo o acervo</a></p>
      </div>
    </section>
${prose(after)}
    <section class="section section--dark cta-band">
      <div class="container">
        <div class="cta-band__inner reveal">
          <p class="eyebrow eyebrow--on-dark">Próximo passo</p>
          <h2>Não encontrou o que procura?</h2>
          <p class="lead">Me diga o objetivo e eu faço a curadoria.</p>
          <a class="btn btn--green" href="${e(wa)}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
        </div>
      </div>
    </section>
  </main>

  ${c.footer}

  ${c.sticky}
  ${c.scripts}
</body>
</html>
`;
}

function updateSitemap(entries) {
  let xml = readFileSync(SITEMAP, "utf8");
  xml = xml.replace(/[ \t]*<url>\s*<loc>https:\/\/flaviodebarros\.com\.br\/imoveis\/[\s\S]*?<\/url>[ \t]*\r?\n?/g, "");
  const block = entries.map((e) => `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`).join("");
  xml = xml.replace(/<\/urlset>/, `${block}</urlset>`);
  writeFileSync(SITEMAP, xml);
}

export function buildAcervo() {
  const data = JSON.parse(readFileSync(DATA, "utf8"));
  const items = data.items || [];
  const exclude = new Set(existsSync(EXCLUDE) ? (JSON.parse(readFileSync(EXCLUDE, "utf8")).refs || []).map(String) : []);
  const log = { rental: [], dup: [] };
  const visible = cleanItems(items, log).filter((p) => !exclude.has(String(p.ref)));
  if (log.rental.length) console.log(`Fora do Acervo (locação/aluguel): ${log.rental.join("; ")}`);
  if (log.dup.length) console.log(`Fora do Acervo (duplicados): ${log.dup.join("; ")}`);
  const grid = visible.filter((p) => !isCommercialListing(p));
  const lastmod = String(data.generatedAt || new Date().toISOString()).slice(0, 10);

  // Regiões
  const regioes = readRegioes();
  const chrome = loadChrome();
  mkdirSync(OUT_DIR, { recursive: true });
  const keep = new Set();
  const sitemap = [];
  const links = [];
  for (const r of regioes) {
    if (!r.publicado) continue;
    const its = visible.filter((p) => regionMatches(r, p));
    writeFileSync(join(OUT_DIR, `${r.slug}.html`), regionPage(r, its, chrome));
    keep.add(`${r.slug}.html`);
    if (its.length) {
      sitemap.push({ loc: `${SITE}/imoveis/${r.slug}.html`, lastmod });
      links.push(`<li><a href="/imoveis/${r.slug}.html">${esc(r.nome)}</a></li>`);
    }
    console.log(`Região ${r.slug}: ${its.length} imóvel(is)${its.length ? "" : " (noindex, fora do sitemap)"}`);
  }
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith(".html") && !keep.has(f)) rmSync(join(OUT_DIR, f));
  updateSitemap(sitemap);

  // selecao.html
  let html = readFileSync(SELECAO_HTML, "utf8");
  html = between(html, "ACERVO-GRID", "\n" + grid.map((p) => cardHtml(p)).join("\n") + "\n");
  html = html.replace(/<div class="selecao-grid" id="selecao-grid"[^>]*>/, `<div class="selecao-grid" id="selecao-grid" aria-live="polite" data-refs="${grid.map((p) => esc(p.ref)).join(",")}">`);
  html = between(html, "ACERVO-CONTAGEM", esc(countText(grid.length)));
  html = between(html, "ACERVO-JSONLD", "\n" + ldScript(itemListLd(grid, "Imóveis à venda em Ribeirão Preto e região", `${SITE}/selecao.html`)) + "\n  ");
  html = between(html, "ACERVO-REGIOES", links.length ? `<p class="acervo-regioes__label">Regiões que acompanho de perto:</p><ul class="acervo-regioes__lista">${links.join("")}</ul>` : "");
  writeFileSync(SELECAO_HTML, html);
  console.log(`Acervo: ${grid.length} imóvel(is) no grid padrão de selecao.html; ${links.length} região(ões) listada(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) buildAcervo();
