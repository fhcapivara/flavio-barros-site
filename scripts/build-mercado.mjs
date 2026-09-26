#!/usr/bin/env node
/**
 * Leitura de mercado: gerador estático do blog.
 *
 * Entrada:  mercado/posts/*.md (arquivos iniciados por "_" são ignorados;
 *           posts com "rascunho: true" ou cujo corpo ainda contém
 *           "[LEITURA DO FLÁVIO]" também, sem falhar o build).
 * Saída:    mercado/index.html
 *           mercado/<slug>.html
 *           mercado/categoria/<slug-da-categoria>.html
 *           sitemap.xml (apenas as entradas /mercado/ são substituídas)
 *
 * Todos os arquivos .html em mercado/ e mercado/categoria/ são GERADOS e
 * apagados a cada execução (limpeza de páginas antigas). Não edite à mão.
 *
 * Cabeçalho, navegação, rodapé, WhatsApp fixo e scripts são copiados de
 * atuacao.html a cada build, com caminhos convertidos para absolutos (/...).
 *
 * Sem dependências externas. Node 18+.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE = "https://flaviodebarros.com.br";
const MERCADO = join(ROOT, "mercado");
const POSTS_DIR = join(MERCADO, "posts");
const CAT_DIR = join(MERCADO, "categoria");
const SITEMAP = join(ROOT, "sitemap.xml");
const TEMPLATE_PAGE = join(ROOT, "atuacao.html");
const WHATSAPP = "5516991166681";
const AUTHOR = "Flávio Barros";
const INDEX_THRESHOLD = 5;
// Enquanto o corpo contiver este marcador, o texto é tratado como rascunho.
const PLACEHOLDER = "[LEITURA DO FLÁVIO]";

const CATEGORIES = [
  "Ribeirão Preto e região",
  "Patrimônio, juros e tributos",
  "Investir e comercial",
  "Terreno e projeto",
  "Bairros e condomínios",
];
const CATEGORY_TOPICS = {
  "Ribeirão Preto e região": "o mercado imobiliário de Ribeirão Preto e região",
  "Patrimônio, juros e tributos": "patrimônio, sucessão, juros e tributação de imóveis",
  "Investir e comercial": "investimento imobiliário e imóveis comerciais",
  "Terreno e projeto": "terrenos, construção e projeto",
  "Bairros e condomínios": "bairros e condomínios",
};
const RESERVED_SLUGS = new Set(["index", "categoria", "posts"]);
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];

const problems = [];
function problem(file, msg) {
  problems.push(`${file}: ${msg}`);
  console.error(`::warning file=mercado/posts/${file}::${msg}`);
}

/* ---------------- utilidades ---------------- */
export function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const plain = (s) => String(s).replace(/\s+/g, " ").trim();
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function localPath(p) {
  // Caminho do site -> absoluto a partir da raiz (/images/...). URLs externas ficam iguais.
  p = String(p).trim();
  if (/^(https?:)?\/\//i.test(p) || /^(mailto|tel|data):/i.test(p) || p.startsWith("#")) return p;
  return "/" + p.replace(/^(\.\.\/|\.\/)+/, "").replace(/^\/+/, "");
}
const absUrl = (p) => (/^https?:\/\//i.test(p) ? p : SITE + localPath(p));
const truncate = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

/* ---------------- front matter ---------------- */
function parseFrontMatter(src) {
  src = src.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const m = src.match(/^\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return null;
  const data = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kv = line.match(/^\s*([A-Za-z_À-ú][\wÀ-ú-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) {
      v = v.slice(1, -1);
      if (kv[2].trim().startsWith('"')) v = v.replace(/\\"/g, '"');
    }
    data[kv[1].toLowerCase()] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

/* ---------------- Markdown (subconjunto simples, sem HTML bruto) ---------------- */
function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  // quebra de linha explícita: dois espaços ou "\" no fim
  s = s.replace(/( {2,}|\\)\n/g, "\u0001");
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g, (_, alt, src, title) =>
    `<img src="${esc(localPath(unesc(src)))}" alt="${alt}"${title ? ` title="${title}"` : ""} loading="lazy" decoding="async" />`);
  s = s.replace(/\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g, (_, t, href) => link(unesc(href), t));
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (_, u) => link(unesc(u), u));
  s = s.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>");
  s = s.replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, "$1<em>$2</em>");
  s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
  s = s.replace(/\u0001/g, "<br />\n").replace(/\n/g, " ");
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
  return s;
}
function unesc(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function link(href, text) {
  if (/^\s*javascript:/i.test(href)) return text;
  const external = /^https?:\/\//i.test(href) && !href.startsWith(SITE);
  return `<a href="${esc(localPath(href))}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
}

export function markdown(src) {
  const lines = src.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const out = [];
  let i = 0;
  const isBlank = (l) => !l || !l.trim();
  const isHr = (l) => /^ {0,3}([-*_])( *\1){2,} *$/.test(l);
  const isHeading = (l) => /^ {0,3}#{1,6}(\s|$)/.test(l);
  const isUl = (l) => /^ {0,3}[-*+]\s+/.test(l);
  const isOl = (l) => /^ {0,3}\d{1,9}[.)]\s+/.test(l);
  const isQuote = (l) => /^ {0,3}>/.test(l);
  const isFence = (l) => /^ {0,3}(```|~~~)/.test(l);
  const startsBlock = (l) => isHr(l) || isHeading(l) || isUl(l) || isOl(l) || isQuote(l) || isFence(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }
    if (isFence(line)) {
      const fence = line.trim().slice(0, 3);
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (isHr(line)) { out.push("<hr />"); i++; continue; }
    if (isHeading(line)) {
      const m = line.trim().match(/^(#{1,6})\s*(.*?)\s*#*\s*$/);
      const level = Math.min(6, Math.max(2, m[1].length)); // o H1 da página é o título
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
      i++; continue;
    }
    if (isQuote(line)) {
      const buf = [];
      while (i < lines.length && !isBlank(lines[i]) && (isQuote(lines[i]) || !startsBlock(lines[i]))) {
        buf.push(lines[i].replace(/^ {0,3}> ?/, ""));
        i++;
      }
      out.push(`<blockquote>\n${markdown(buf.join("\n"))}\n</blockquote>`);
      continue;
    }
    if (isUl(line) || isOl(line)) {
      const ordered = isOl(line);
      const test = ordered ? isOl : isUl;
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        if (test(l)) { items.push(l.replace(/^ {0,3}(?:[-*+]|\d{1,9}[.)])\s+/, "")); i++; continue; }
        if (isBlank(l)) {
          const next = lines[i + 1];
          if (next !== undefined && test(next)) { i++; continue; }
          break;
        }
        if (/^\s{2,}/.test(l) || !startsBlock(l)) { items[items.length - 1] += "\n" + l.trim(); i++; continue; }
        break;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>\n${items.map((t) => `<li>${inline(t)}</li>`).join("\n")}\n</${tag}>`);
      continue;
    }
    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) buf.push(lines[i++]);
    const para = buf.join("\n");
    const onlyImg = /^!\[[^\]]*\]\([^)]*\)$/.test(para.trim());
    out.push(onlyImg ? `<figure>${inline(para.trim())}</figure>` : `<p>${inline(para)}</p>`);
  }
  return out.join("\n");
}

function firstParagraphText(md) {
  const html = markdown(md);
  const m = html.match(/<p>([\s\S]*?)<\/p>/);
  return m ? plain(unesc(m[1].replace(/<[^>]+>/g, ""))) : "";
}

/* ---------------- moldura do site (copiada de atuacao.html) ---------------- */
function loadChrome() {
  const html = readFileSync(TEMPLATE_PAGE, "utf8");
  const grab = (re, name) => {
    const m = html.match(re);
    if (!m) throw new Error(`Não encontrei ${name} em atuacao.html`);
    return m[0];
  };
  const absolutize = (s) => s
    .replace(/\s+aria-current="page"/g, "")
    .replace(/\b(href|src)="(?!https?:|\/\/|\/|#|mailto:|tel:|data:)([^"]*)"/g, '$1="/$2"')
    .replace(/\b(href)="\/index\.html"/g, '$1="/"');
  const header = absolutize(grab(/<header class="site-header">[\s\S]*?<\/header>/, "o cabeçalho"));
  const footer = absolutize(grab(/<footer class="site-footer">[\s\S]*?<\/footer>/, "o rodapé"));
  const sticky = absolutize(grab(/<a class="wa-sticky"[\s\S]*?<\/a>/, "o WhatsApp fixo"));
  const afterFooter = html.slice(html.indexOf("</footer>"));
  const scripts = (afterFooter.match(/<script\b[^>]*src="[^"]*"[^>]*><\/script>/g) || []).map(absolutize).join("\n  ");
  const headLinks = (html.match(/<link rel="preconnect"[^>]*>|<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/g) || []).join("\n  ");
  return { header, footer, sticky, scripts, headLinks };
}

function page({ title, description, canonical, robots, ogType = "website", image, jsonld, body }) {
  const c = CHROME;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${esc(description)}" />
  <title>${esc(title)}</title>
  ${c.headLinks}
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta name="robots" content="${robots}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Flávio Barros" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />${image ? `\n  <meta property="og:image" content="${esc(image)}" />` : ""}${jsonld ? `\n  <script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2).replace(/</g, "\\u003c")}\n  </script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">Ir para o conteúdo</a>
  ${c.header}

  <main id="main">
${body}
  </main>

  ${c.footer}

  ${c.sticky}
  ${c.scripts}
</body>
</html>
`;
}

/* ---------------- leitura dos posts ---------------- */
function readPosts() {
  if (!existsSync(POSTS_DIR)) return [];
  const files = readdirSync(POSTS_DIR).filter((f) => f.toLowerCase().endsWith(".md") && !f.startsWith("_") && !f.startsWith(".")).sort();
  const posts = [];
  const seen = new Map();
  const catBySlug = new Map(CATEGORIES.map((c) => [slugify(c), c]));
  // Nome antigo continua aceito.
  catBySlug.set(slugify("Crédito e juros"), "Patrimônio, juros e tributos");
  for (const file of files) {
    const fm = parseFrontMatter(readFileSync(join(POSTS_DIR, file), "utf8"));
    if (!fm) { problem(file, "o arquivo precisa começar com o bloco entre linhas --- (veja o _modelo.md)."); continue; }
    const d = fm.data;
    if (/^(true|sim|yes)$/i.test(d.rascunho || "")) { console.log(`Rascunho ignorado: ${file}`); continue; }
    if (fm.body.includes(PLACEHOLDER)) {
      const msg = `Texto não publicado: ainda contém ${PLACEHOLDER}. Substitua esse bloco pela sua leitura para publicar.`;
      console.log(`::warning file=mercado/posts/${file}::${msg}`);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${file}: ${msg}\n`);
      continue;
    }
    const titulo = plain(d.titulo || "");
    if (!titulo) { problem(file, "falta o campo titulo."); continue; }
    const data = (d.data || "").trim();
    if (!validDate(data)) { problem(file, `data inválida ("${data}"). Use o formato AAAA-MM-DD, por exemplo 2026-10-05.`); continue; }
    const categoria = catBySlug.get(slugify(d.categoria || ""));
    if (!categoria) { problem(file, `categoria inválida ("${d.categoria || ""}"). Use uma destas: ${CATEGORIES.join("; ")}.`); continue; }
    const slug = slugify(d.slug || titulo);
    if (!slug || RESERVED_SLUGS.has(slug)) { problem(file, `o endereço "${slug}" não pode ser usado. Defina outro slug.`); continue; }
    if (seen.has(slug)) { problem(file, `já existe outro texto com o endereço "${slug}" (${seen.get(slug)}). Defina um slug diferente.`); continue; }
    seen.set(slug, file);
    const body = fm.body.trim();
    const resumo = plain(d.resumo || "") || truncate(firstParagraphText(body), 155);
    posts.push({
      file, titulo, slug, data, categoria, resumo,
      catSlug: slugify(categoria),
      imagem: d.imagem ? d.imagem.trim() : "",
      fonteNome: plain(d.fonte_nome || ""),
      fonteUrl: (d.fonte_url || "").trim(),
      html: markdown(body),
      url: `${SITE}/mercado/${slug}.html`,
    });
  }
  posts.sort((a, b) => (a.data === b.data ? a.titulo.localeCompare(b.titulo, "pt-BR") : a.data < b.data ? 1 : -1));
  return posts;
}

/* ---------------- blocos de página ---------------- */
function waLink(text) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function card(p) {
  return `          <article class="mercado-card reveal">
            ${p.imagem ? `<a class="mercado-card__media" href="/mercado/${p.slug}.html" tabindex="-1" aria-hidden="true"><img src="${esc(localPath(p.imagem))}" alt="" loading="lazy" decoding="async" /></a>\n            ` : ""}<div class="mercado-card__body">
              <p class="mercado-card__meta"><a href="/mercado/categoria/${p.catSlug}.html">${esc(p.categoria)}</a><span aria-hidden="true">·</span><time datetime="${p.data}">${formatDate(p.data)}</time></p>
              <h2 class="mercado-card__title"><a href="/mercado/${p.slug}.html">${esc(p.titulo)}</a></h2>
              <p class="mercado-card__text">${esc(p.resumo)}</p>
              <a class="mercado-card__more" href="/mercado/${p.slug}.html" aria-label="Ler o texto: ${esc(p.titulo)}">Ler o texto</a>
            </div>
          </article>`;
}

function filters(cats, active) {
  if (!cats.length) return "";
  const items = [`<a href="/mercado/"${active ? "" : ' aria-current="page"'}>Todos</a>`]
    .concat(cats.map((c) => `<a href="/mercado/categoria/${slugify(c)}.html"${active === c ? ' aria-current="page"' : ""}>${esc(c)}</a>`));
  return `          <nav class="mercado-filters reveal" aria-label="Categorias">
            ${items.join("\n            ")}
          </nav>`;
}

function listingBody({ eyebrow, h1, lead, cats, active, posts, back }) {
  const list = posts.length
    ? `        <div class="mercado-list">
${posts.map(card).join("\n")}
        </div>`
    : `        <div class="mercado-empty reveal">
          <p class="eyebrow">Em breve</p>
          <h2>Os primeiros textos estão a caminho.</h2>
          <p>Aqui vou reunir leituras curtas sobre preços, crédito, bairros e oportunidades em Ribeirão Preto e região. Enquanto isso, se quiser conversar sobre um imóvel ou sobre o momento do mercado, estou à disposição.</p>
          <p class="mercado-empty__cta"><a class="btn btn--primary" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener noreferrer">Conversar no WhatsApp</a></p>
        </div>`;
  return `    <section class="page-hero mercado-hero">
      <div class="container">
        <div class="page-hero__inner reveal">
          <p class="eyebrow">${eyebrow}</p>
          <h1>${h1}</h1>
          <p class="lead">${lead}</p>
        </div>
${filters(cats, active)}
      </div>
    </section>

    <section class="section mercado-section">
      <div class="container">
${list}${back ? `
        <p class="mercado-back"><a href="/mercado/">← Todos os textos de Leitura de mercado</a></p>` : ""}
      </div>
    </section>`;
}

function postBody(p) {
  const waText = `Olá, Flávio. Li o seu texto "${p.titulo}" no site e gostaria de conversar.`;
  let fonte = "";
  if (p.fonteNome || p.fonteUrl) {
    const label = esc(p.fonteNome || p.fonteUrl.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""));
    fonte = `\n          <p class="mercado-source">Fonte: ${p.fonteUrl && /^https?:\/\//i.test(p.fonteUrl) ? `<a href="${esc(p.fonteUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label}</p>`;
  }
  return `    <article class="mercado-post">
      <header class="page-hero mercado-hero">
        <div class="container">
          <div class="page-hero__inner reveal">
            <p class="eyebrow"><a class="mercado-post__crumb" href="/mercado/">Leitura de mercado</a> <span aria-hidden="true">·</span> <a class="mercado-post__crumb" href="/mercado/categoria/${p.catSlug}.html">${esc(p.categoria)}</a></p>
            <h1>${esc(p.titulo)}</h1>
            <p class="lead">${esc(p.resumo)}</p>
            <p class="mercado-byline">Por <span class="mercado-byline__author">${AUTHOR}</span> <span aria-hidden="true">·</span> <time datetime="${p.data}">${formatDate(p.data)}</time></p>
          </div>
        </div>
      </header>
${p.imagem ? `
      <div class="container mercado-post__figure-wrap">
        <figure class="mercado-post__figure"><img src="${esc(localPath(p.imagem))}" alt="${esc(p.titulo)}" decoding="async" /></figure>
      </div>
` : ""}
      <div class="section mercado-post__section">
        <div class="container">
          <div class="mercado-prose">
${p.html}
          </div>${fonte}
        </div>
      </div>
    </article>

    <section class="section section--alt mercado-cta">
      <div class="container">
        <div class="mercado-cta__inner reveal">
          <p class="eyebrow">Conversa</p>
          <h2>Quer entender como isso afeta a sua decisão?</h2>
          <p>Cada patrimônio tem um contexto. Se este texto tocou em algo que você está avaliando, podemos conversar com calma.</p>
          <p class="mercado-cta__actions">
            <a class="btn btn--primary" href="${esc(waLink(waText))}" target="_blank" rel="noopener noreferrer">Conversar no WhatsApp</a>
            <a class="btn btn--ghost" href="/mercado/">Ver outros textos</a>
          </p>
        </div>
        <p class="mercado-back"><a href="/mercado/">← Voltar para Leitura de mercado</a></p>
      </div>
    </section>`;
}

function postJsonLd(p) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.titulo,
    description: p.resumo,
    datePublished: p.data,
    dateModified: p.data,
    inLanguage: "pt-BR",
    articleSection: p.categoria,
    author: { "@type": "Person", name: AUTHOR, url: `${SITE}/sobre.html` },
    publisher: { "@type": "Person", name: AUTHOR, url: `${SITE}/` },
    mainEntityOfPage: { "@type": "WebPage", "@id": p.url },
    url: p.url,
  };
  if (p.imagem) ld.image = [absUrl(p.imagem)];
  return ld;
}

/* ---------------- sitemap ---------------- */
function updateSitemap(entries) {
  let xml = readFileSync(SITEMAP, "utf8");
  xml = xml.replace(/[ \t]*<url>\s*<loc>https:\/\/flaviodebarros\.com\.br\/mercado\/[\s\S]*?<\/url>[ \t]*\r?\n?/g, "");
  const block = entries.map((e) => `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>
`).join("");
  xml = xml.replace(/<\/urlset>/, `${block}</urlset>`);
  writeFileSync(SITEMAP, xml);
}

/* ---------------- execução ---------------- */
const CHROME = loadChrome();
const posts = readPosts();

// limpeza de tudo que foi gerado antes
for (const f of readdirSync(MERCADO)) if (f.endsWith(".html")) rmSync(join(MERCADO, f));
if (existsSync(CAT_DIR)) rmSync(CAT_DIR, { recursive: true, force: true });

const byCat = new Map();
for (const p of posts) {
  if (!byCat.has(p.categoria)) byCat.set(p.categoria, []);
  byCat.get(p.categoria).push(p);
}
const activeCats = CATEGORIES.filter((c) => byCat.has(c));

const LIST_TITLE = "Mercado imobiliário em Ribeirão Preto: leitura de Flávio Barros";
const LIST_DESC = "Leituras curtas de Flávio Barros sobre o mercado imobiliário em Ribeirão Preto e região: preços, crédito, bairros, condomínios, terrenos e investimento.";
writeFileSync(join(MERCADO, "index.html"), page({
  title: `${LIST_TITLE}`,
  description: LIST_DESC,
  canonical: `${SITE}/mercado/`,
  robots: posts.length ? "index,follow" : "noindex,follow",
  body: listingBody({
    eyebrow: "Leitura de mercado",
    h1: esc(LIST_TITLE),
    lead: "Análises curtas e objetivas sobre o que muda no mercado de Ribeirão Preto e região, para decidir com mais clareza.",
    cats: activeCats,
    active: null,
    posts,
  }),
}));

for (const p of posts) {
  writeFileSync(join(MERCADO, `${p.slug}.html`), page({
    title: `${p.titulo} | Flávio Barros`,
    description: truncate(p.resumo, 300),
    canonical: p.url,
    robots: "index,follow",
    ogType: "article",
    image: p.imagem ? absUrl(p.imagem) : "",
    jsonld: postJsonLd(p),
    body: postBody(p),
  }));
}

const indexableCats = [];
if (activeCats.length) mkdirSync(CAT_DIR, { recursive: true });
for (const c of activeCats) {
  const list = byCat.get(c);
  const indexable = list.length >= INDEX_THRESHOLD;
  if (indexable) indexableCats.push(c);
  writeFileSync(join(CAT_DIR, `${slugify(c)}.html`), page({
    title: `${c} | Leitura de mercado | Flávio Barros`,
    description: c === CATEGORIES[0]
      ? `Textos de Flávio Barros sobre ${CATEGORY_TOPICS[c]}.`
      : `Textos de Flávio Barros sobre ${CATEGORY_TOPICS[c]}, com foco em Ribeirão Preto e região.`,
    canonical: `${SITE}/mercado/categoria/${slugify(c)}.html`,
    robots: indexable ? "index,follow" : "noindex,follow",
    body: listingBody({
      eyebrow: "Leitura de mercado",
      h1: esc(c),
      lead: `Leituras sobre ${esc(CATEGORY_TOPICS[c])}, com o olhar de quem acompanha o mercado de perto.`,
      cats: activeCats,
      active: c,
      posts: list,
      back: true,
    }),
  }));
}

const entries = [];
if (posts.length) {
  entries.push({ loc: `${SITE}/mercado/`, lastmod: posts[0].data, changefreq: "weekly", priority: "0.7" });
  for (const c of indexableCats) {
    entries.push({ loc: `${SITE}/mercado/categoria/${slugify(c)}.html`, lastmod: byCat.get(c)[0].data, changefreq: "weekly", priority: "0.5" });
  }
  for (const p of posts) entries.push({ loc: p.url, lastmod: p.data, changefreq: "monthly", priority: "0.6" });
}
updateSitemap(entries);

console.log(`Leitura de mercado: ${posts.length} texto(s), ${activeCats.length} categoria(s), ${indexableCats.length} indexável(is).`);
if (problems.length) {
  console.error(`\n${problems.length} arquivo(s) com problema (não publicados):\n- ${problems.join("\n- ")}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Textos não publicados\n\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `problems=${problems.length}\n`);
}
