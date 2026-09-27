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
 *           mercado/estudos/index.html e mercado/estudos/<slug>.html
 *             (a partir de mercado/estudos/*.md; "_" no início ou
 *             "rascunho: true" são ignorados)
 *           sitemap.xml (apenas as entradas /mercado/ são substituídas)
 *
 * Todos os arquivos .html em mercado/, mercado/categoria/ e mercado/estudos/ são GERADOS e
 * apagados a cada execução (limpeza de páginas antigas). Não edite à mão.
 *
 * Cabeçalho, navegação, rodapé, WhatsApp fixo e scripts são copiados de
 * atuacao.html a cada build, com caminhos convertidos para absolutos (/...).
 *
 * Sem dependências externas. Node 18+.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SITE = "https://flaviodebarros.com.br";
const MERCADO = join(ROOT, "mercado");
const POSTS_DIR = join(MERCADO, "posts");
const CAT_DIR = join(MERCADO, "categoria");
const ESTUDOS_DIR = join(MERCADO, "estudos");
// Script dos estudos, compartilhamento e avaliação. A versão muda quando o arquivo muda (cache).
const ESTUDOS_JS = join(ROOT, "js", "estudos.js");
const ESTUDOS_JS_V = existsSync(ESTUDOS_JS) ? createHash("sha1").update(readFileSync(ESTUDOS_JS)).digest("hex").slice(0, 8) : "0";
const SITEMAP = join(ROOT, "sitemap.xml");
const TEMPLATE_PAGE = join(ROOT, "atuacao.html");
const WHATSAPP = "5516991166681";
const AUTHOR = "Flávio Barros";
const INDEX_THRESHOLD = 5;
const AUTHOR_ALT = "Flávio Barros, consultor imobiliário em Ribeirão Preto";
const AUTHOR_URL = "/sobre.html";
// Retrato do autor. Nomes novos a cada troca de foto (cache do navegador).
const PORTRAIT = { src: "/images/mercado/flavio-leitura-2026.webp", width: 473, height: 800 };
const SIGNATURE = { src: "/images/mercado/flavio-assinatura-2026.webp", width: 440, height: 550 };
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
const RESERVED_SLUGS = new Set(["index", "categoria", "posts", "estudos"]);
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro"];

const problems = [];
function problem(file, msg, dir = "posts") {
  problems.push(`${file}: ${msg}`);
  console.error(`::warning file=mercado/${dir}/${file}::${msg}`);
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

// Imagem padrão de compartilhamento (Open Graph / Twitter).
const OG_DEFAULT = { src: "/images/og/flavio-barros-og-1200x630.jpg", width: 1200, height: 630, alt: "Flávio Barros, consultor imobiliário em Ribeirão Preto" };
// Lê largura e altura de JPG, PNG ou WebP do próprio site (sem dependências).
function imageSize(p) {
  try {
    if (/^(https?:)?\/\//i.test(p)) return null;
    const b = readFileSync(join(ROOT, localPath(p).slice(1)));
    if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
      const kind = b.toString("ascii", 12, 16);
      if (kind === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
      if (kind === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
      if (kind === "VP8L") { const v = b.readUInt32LE(21); return { width: 1 + (v & 0x3fff), height: 1 + ((v >> 14) & 0x3fff) }; }
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch (e) { /* sem dimensões */ }
  return null;
}
function ogImage(imagem, alt) {
  if (!imagem) return { ...OG_DEFAULT, url: SITE + OG_DEFAULT.src };
  return { url: absUrl(imagem), alt: alt || OG_DEFAULT.alt, ...(imageSize(imagem) || {}) };
}
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

function page({ title, description, canonical, robots, ogType = "website", image, jsonld, body, nav = "/mercado/" }) {
  const c = CHROME;
  const og = image && image.url ? image : ogImage("");
  // Marca no menu a seção atual (Leitura de mercado ou Estudos).
  const header = c.header.replace(new RegExp(`(<div class="nav__links">[\\s\\S]*?<a href="${nav.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}")`), '$1 aria-current="page"');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${esc(description)}" />
  <title>${esc(title)}</title>
  ${c.headLinks}
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#F7F5F2" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta name="robots" content="${robots}" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Flávio Barros" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(og.url)}" />${og.width ? `\n  <meta property="og:image:width" content="${og.width}" />\n  <meta property="og:image:height" content="${og.height}" />` : ""}
  <meta property="og:image:alt" content="${esc(og.alt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(og.url)}" />
  <meta name="twitter:image:alt" content="${esc(og.alt)}" />${jsonld ? `\n  <script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2).replace(/</g, "\\u003c")}\n  </script>` : ""}
</head>
<body>
  <a class="skip-link" href="#main">Ir para o conteúdo</a>
  ${header}

  <main id="main">
${body}
  </main>

  ${c.footer}

  ${c.sticky}
  ${c.scripts}
  <script src="/js/estudos.js?v=${ESTUDOS_JS_V}" defer></script>
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

/* ---------------- leitura dos estudos ---------------- */
function formatMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}
function readEstudos() {
  if (!existsSync(ESTUDOS_DIR)) return [];
  const files = readdirSync(ESTUDOS_DIR).filter((f) => f.toLowerCase().endsWith(".md") && !f.startsWith("_") && !f.startsWith(".")).sort();
  const list = [];
  const seenSlug = new Map();
  const seenId = new Map();
  for (const file of files) {
    const fm = parseFrontMatter(readFileSync(join(ESTUDOS_DIR, file), "utf8"));
    if (!fm) { problem(file, "o arquivo precisa começar com o bloco entre linhas --- (veja o _modelo.md).", "estudos"); continue; }
    const d = fm.data;
    if (/^(true|sim|yes)$/i.test(d.rascunho || "")) { console.log(`Estudo em rascunho ignorado: ${file}`); continue; }
    const titulo = plain(d.titulo || "");
    if (!titulo) { problem(file, "falta o campo titulo.", "estudos"); continue; }
    const id = (d.id || "").trim() || slugify(d.slug || titulo);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { problem(file, `id inválido ("${id}"). Use letras minúsculas, números e hífens.`, "estudos"); continue; }
    if (seenId.has(id)) { problem(file, `o id "${id}" já é usado por ${seenId.get(id)}.`, "estudos"); continue; }
    const data = (d.data || "").trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data)) { problem(file, `data inválida ("${data}"). Use ano e mês, por exemplo 2026-09.`, "estudos"); continue; }
    const resumo = plain(d.resumo || "");
    if (!resumo) { problem(file, "falta o campo resumo.", "estudos"); continue; }
    const slug = slugify(d.slug || titulo);
    if (!slug || slug === "index") { problem(file, `o endereço "${slug}" não pode ser usado. Defina outro slug.`, "estudos"); continue; }
    if (seenSlug.has(slug)) { problem(file, `já existe outro estudo com o endereço "${slug}" (${seenSlug.get(slug)}).`, "estudos"); continue; }
    seenSlug.set(slug, file);
    seenId.set(id, file);
    const oqr = plain(d.o_que_responde || "");
    // resumo: parágrafos de abertura separados por " | ".
    const abertura = resumo.split("|").map((x) => x.trim()).filter(Boolean);
    const resumoTexto = abertura.join(" ");
    list.push({
      file, titulo, id, slug, data, abertura,
      resumo: resumoTexto,
      descricao: plain(d.descricao || "") || truncate(resumoTexto, 300),
      tituloLista: plain(d.titulo_lista || "") || "O que você encontra no estudo:",
      tituloSeo: plain(d.titulo_seo || "") || `${titulo} | Estudos de mercado | ${AUTHOR}`,
      resumoCurto: plain(d.resumo_curto || "") || truncate(resumoTexto, 320),
      tipo: plain(d.tipo || "") || "Estudo de mercado",
      // atualizado (opcional, AAAA-MM-DD): data da última revisão da página. Vai para o sitemap.
      atualizado: /^\d{4}-\d{2}-\d{2}$/.test((d.atualizado || "").trim()) ? d.atualizado.trim() : `${data}-01`,
      // Nome do material na mensagem de WhatsApp. Padrão: o título até os dois-pontos.
      material: plain(d.material || "") || titulo.split(":")[0].trim(),
      mes: formatMonth(data),
      oQueResponde: oqr.includes("|") ? oqr.split("|").map((x) => x.trim()).filter(Boolean) : oqr,
      regiao: plain(d.regiao || ""),
      lancamento: plain(d.lancamento || ""),
      paginas: plain(d.paginas || ""),
      imagem: d.imagem ? d.imagem.trim() : "",
      html: fm.body.trim() ? markdown(fm.body.trim()) : "",
      url: `${SITE}/mercado/estudos/${slug}.html`,
    });
  }
  list.sort((a, b) => (a.data === b.data ? a.titulo.localeCompare(b.titulo, "pt-BR") : a.data < b.data ? 1 : -1));
  return list;
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
  const items = [`<a href="/mercado/"${active ? "" : ' aria-current="page"'}>Todos</a>`]
    .concat(cats.map((c) => `<a href="/mercado/categoria/${slugify(c)}.html"${active === c ? ' aria-current="page"' : ""}>${esc(c)}</a>`))
    .concat([`<a class="mercado-filters__estudos" href="/mercado/estudos/"${active === "estudos" ? ' aria-current="page"' : ""}>Estudos de mercado</a>`]);
  return `          <nav class="mercado-filters reveal" aria-label="Seções de Leitura de mercado">
            ${items.join("\n            ")}
          </nav>`;
}

function listingBody({ eyebrow, h1, lead, cats, active, posts, back, portrait, estudos }) {
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
  const intro = `<div class="page-hero__inner reveal">
          <p class="eyebrow">${eyebrow}</p>
          <h1>${h1}</h1>
          <p class="lead">${lead}</p>
        </div>`;
  const heroTop = portrait
    ? `        <div class="mercado-hero__grid">
        ${intro}
        <figure class="mercado-hero__portrait reveal">
          <img src="${PORTRAIT.src}" width="${PORTRAIT.width}" height="${PORTRAIT.height}" alt="${esc(AUTHOR_ALT)}" loading="eager" fetchpriority="high" decoding="async" />
          <figcaption>${AUTHOR} <span aria-hidden="true">·</span> CRECI 323468</figcaption>
        </figure>
        </div>`
    : `        ${intro}`;
  return `    <section class="page-hero mercado-hero${portrait ? " mercado-hero--portrait" : ""}">
      <div class="container">
${heroTop}
${filters(cats, active)}
      </div>
    </section>

    <section class="section mercado-section">
      <div class="container">
${list}${back ? `
        <p class="mercado-back"><a href="/mercado/">← Todos os textos de Leitura de mercado</a></p>` : ""}
      </div>
    </section>${estudos ? "\n\n" + estudosBlock(estudos) : ""}`;
}

const ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20l1.2-3.9A8 8 0 1 1 8 18.9z"/><path d="M9.2 8.6c.2-.4.5-.4.8-.4h.5l1 2.1-.6.8c.5 1 1.3 1.8 2.3 2.3l.8-.6 2.1 1v.5c0 .3 0 .6-.4.8-.9.6-2.4.4-4.2-1.1-1.8-1.5-2.9-3.4-2.3-5.4z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><path d="M17.2 6.8v.01"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8.2 10.5v6M8.2 7.6v.01M11.8 16.5v-6M11.8 13.2c0-1.6 1-2.7 2.3-2.7s2 .9 2 2.5v3.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
};

function shareAndVote(p) {
  const shareText = `Achei esta leitura do Flávio Barros interessante: ${p.titulo} ${p.url}`;
  return `
          <div class="mercado-share" data-share-url="${esc(p.url)}" data-share-title="${esc(p.titulo)}">
            <p class="mercado-share__label">Compartilhar esta leitura</p>
            <div class="mercado-share__buttons">
              <a class="mercado-share__btn" href="https://wa.me/?text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener">${ICONS.whatsapp}<span>WhatsApp</span></a>
              <button class="mercado-share__btn" type="button" data-share="instagram" hidden>${ICONS.instagram}<span>Instagram</span></button>
              <a class="mercado-share__btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(p.url)}" target="_blank" rel="noopener">${ICONS.linkedin}<span>LinkedIn</span></a>
              <button class="mercado-share__btn" type="button" data-share="copy" hidden>${ICONS.link}<span>Copiar link</span></button>
            </div>
            <p class="mercado-share__status" role="status" aria-live="polite"></p>
          </div>
          <div class="mercado-vote" data-artigo="${esc(p.slug)}" data-titulo="${esc(p.titulo)}" hidden>
            <p class="mercado-vote__question">Esta leitura foi útil para você?</p>
            <div class="mercado-vote__buttons">
              <button class="mercado-vote__btn" type="button" data-voto="sim">Sim</button>
              <button class="mercado-vote__btn" type="button" data-voto="nao">Não</button>
            </div>
            <p class="mercado-vote__thanks" role="status" aria-live="polite" hidden>Obrigado pela resposta.</p>
          </div>`;
}

function signature(waText) {
  return `
          <aside class="mercado-signature" aria-label="Sobre o autor">
            <img class="mercado-signature__photo" src="${SIGNATURE.src}" width="${SIGNATURE.width}" height="${SIGNATURE.height}" alt="${esc(AUTHOR_ALT)}" loading="lazy" decoding="async" />
            <div class="mercado-signature__body">
              <p class="mercado-signature__name">${AUTHOR}</p>
              <p class="mercado-signature__role">Consultor imobiliário em Ribeirão Preto e região</p>
              <p class="mercado-signature__creci">CRECI 323468</p>
              <p class="mercado-signature__note">Acompanho quem decide sobre patrimônio, do diagnóstico ao próximo passo.</p>
              <p class="mercado-signature__actions">
                <a class="btn btn--primary" href="${esc(waLink(waText))}" target="_blank" rel="noopener">Conversar no WhatsApp</a>
                <a class="mercado-signature__link" href="${AUTHOR_URL}">Conheça minha trajetória</a>
              </p>
            </div>
          </aside>`;
}

/* ---------------- estudos: blocos ---------------- */
function requestButton(e, label = "Receber pelo WhatsApp") {
  return `<a class="btn btn--primary estudos-solicitar" href="/mercado/estudos/${e.slug}.html#solicitar" data-estudo-id="${esc(e.id)}" data-estudo-titulo="${esc(e.titulo)}" data-estudo-material="${esc(e.material)}">${label}</a>`;
}

function estudoCard(e, h = "h2") {
  return `          <article class="estudos-card reveal">
            ${e.imagem ? `<a class="estudos-card__cover" href="/mercado/estudos/${e.slug}.html" tabindex="-1" aria-hidden="true"><img src="${esc(localPath(e.imagem))}" alt="" loading="lazy" decoding="async" /></a>\n            ` : ""}<div class="estudos-card__body">
              <p class="estudos-card__meta">${esc(e.tipo)}<span aria-hidden="true">·</span>${esc(e.mes)}</p>
              <${h} class="estudos-card__title"><a href="/mercado/estudos/${e.slug}.html">${esc(e.titulo)}</a></${h}>
              <p class="estudos-card__text">${esc(e.resumoCurto)}</p>
              <p class="estudos-card__actions">
                ${requestButton(e)}
                <a class="estudos-card__more" href="/mercado/estudos/${e.slug}.html">Ver detalhes</a>
              </p>
            </div>
          </article>`;
}

const ESTUDOS_EMPTY = "Os primeiros estudos chegam em breve.";

function estudosModal() {
  return `
    <dialog class="estudos-modal" id="estudos-modal" aria-labelledby="estudos-modal-title">
      <div class="estudos-modal__panel">
        <button class="estudos-modal__close" type="button" data-estudos-close aria-label="Fechar"><span aria-hidden="true">×</span></button>
        <p class="estudos-modal__estudo" data-estudos-titulo></p>
        <h2 class="estudos-modal__title" id="estudos-modal-title">Como posso te chamar?</h2>
        <form class="estudos-form" novalidate>
          <label class="estudos-field">
            <span class="estudos-field__label">Seu nome</span>
            <input class="estudos-field__input" type="text" name="nome" autocomplete="name" placeholder="Seu nome" maxlength="120" required />
          </label>
          <div class="estudos-form__hp" aria-hidden="true">
            <label>Empresa <input type="text" name="empresa" tabindex="-1" autocomplete="off" /></label>
          </div>
          <p class="estudos-form__error" role="alert" hidden></p>
          <button class="btn btn--primary estudos-form__submit" type="submit">Receber pelo WhatsApp</button>
          <p class="estudos-modal__note">O estudo é enviado por mim, pessoalmente, na nossa conversa.</p>
        </form>
      </div>
    </dialog>`;
}

function estudosBlock(estudos) {
  const latest = estudos.slice(0, 3);
  return `    <section class="section section--alt mercado-estudos" aria-labelledby="mercado-estudos-title">
      <div class="container">
        <div class="mercado-estudos__header reveal">
          <p class="eyebrow">Estudos sob solicitação</p>
          <h2 id="mercado-estudos-title">Estudos de mercado em Ribeirão Preto</h2>
          <p class="mercado-estudos__lead">${latest.length ? "Análises dos lançamentos e das regiões que acompanho de perto, enviadas pelo WhatsApp." : ESTUDOS_EMPTY}</p>
        </div>${latest.length ? `
        <div class="estudos-list">
${latest.map((e) => estudoCard(e, "h3")).join("\n")}
        </div>
        <p class="mercado-estudos__all"><a href="/mercado/estudos/">Ver todos os estudos</a></p>` : ""}
      </div>
    </section>${latest.length ? estudosModal() : ""}`;
}

function estudosIndexBody(estudos, cats) {
  const list = estudos.length
    ? `        <div class="estudos-list">
${estudos.map((e) => estudoCard(e)).join("\n")}
        </div>`
    : `        <p class="estudos-empty reveal">${ESTUDOS_EMPTY}</p>`;
  return `    <section class="page-hero mercado-hero">
      <div class="container">
        <div class="page-hero__inner reveal">
          <p class="eyebrow"><a class="mercado-post__crumb" href="/mercado/">Leitura de mercado</a> <span aria-hidden="true">·</span> Estudos</p>
          <h1>Estudos de mercado em Ribeirão Preto</h1>
          <p class="lead">Análises dos lançamentos e das regiões que acompanho de perto. Peça o estudo e receba pelo WhatsApp.</p>
        </div>
${filters(cats, "estudos")}
      </div>
    </section>

    <section class="section mercado-section">
      <div class="container">
${list}
        <p class="mercado-back"><a href="/mercado/">← Todos os textos de Leitura de mercado</a></p>
      </div>
    </section>${estudos.length ? estudosModal() : ""}`;
}

function estudoBody(e) {
  const oqr = Array.isArray(e.oQueResponde)
    ? `<ul class="estudos-page__answers">\n${e.oQueResponde.map((x) => `              <li>${esc(x)}</li>`).join("\n")}\n            </ul>`
    : e.oQueResponde ? `<p>${esc(e.oQueResponde)}</p>` : "";
  const facts = [
    e.lancamento && ["Lançamento", e.lancamento],
    e.regiao && ["Região", e.regiao],
    ["Data", e.mes],
    e.paginas && ["Extensão", `${e.paginas} páginas`],
  ].filter(Boolean);
  return `    <article class="estudos-page">
      <header class="page-hero mercado-hero">
        <div class="container">
          <div class="page-hero__inner reveal">
            <p class="eyebrow"><a class="mercado-post__crumb" href="/mercado/">Leitura de mercado</a> <span aria-hidden="true">·</span> <a class="mercado-post__crumb" href="/mercado/estudos/">Estudos</a></p>
            <h1>${esc(e.titulo)}</h1>
${e.abertura.map((x) => `            <p class="lead">${esc(x)}</p>`).join("\n")}
            <p class="mercado-byline">${esc(e.tipo)} <span aria-hidden="true">·</span> Por <a class="mercado-byline__author" href="${AUTHOR_URL}">${AUTHOR}</a> <span aria-hidden="true">·</span> <time datetime="${e.data}">${esc(e.mes)}</time></p>
          </div>
        </div>
      </header>

      <div class="section mercado-post__section">
        <div class="container">
          <div class="estudos-page__grid">
            <div class="estudos-page__main">${e.imagem ? `
              <figure class="estudos-page__cover"><img src="${esc(localPath(e.imagem))}" alt="Capa do estudo ${esc(e.titulo)}" decoding="async" /></figure>` : ""}
              <section class="estudos-page__block" aria-labelledby="oqr">
                <h2 id="oqr">${esc(e.tituloLista)}</h2>
            ${oqr}
              </section>${e.html ? `
              <div class="mercado-prose estudos-page__prose">
${e.html}
              </div>` : ""}
            </div>
            <aside class="estudos-panel" id="solicitar" aria-label="Solicitar o estudo">
              <p class="estudos-panel__eyebrow">Estudo sob solicitação</p>
              <p class="estudos-panel__title">${esc(e.titulo)}</p>
              <dl class="estudos-panel__facts">
${facts.map(([k, v]) => `                <div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
              </dl>
              ${requestButton(e, "Receber o estudo pelo WhatsApp")}
              <p class="estudos-panel__note">O estudo é enviado por mim, pessoalmente, na nossa conversa.</p>
            </aside>
          </div>
${signature(`Olá, Flávio. Vi o estudo "${e.titulo}" no seu site e gostaria de conversar.`)}
          <p class="mercado-back"><a href="/mercado/estudos/">← Todos os estudos</a></p>
        </div>
      </div>
    </article>${estudosModal()}`;
}

function estudoJsonLd(e) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Report",
    headline: e.titulo,
    name: e.tituloSeo,
    description: e.descricao,
    datePublished: `${e.data}-01`,
    dateModified: e.atualizado,
    inLanguage: "pt-BR",
    author: { "@type": "Person", name: AUTHOR, url: `${SITE}${AUTHOR_URL}`, image: `${SITE}${SIGNATURE.src}`, jobTitle: "Consultor imobiliário" },
    publisher: { "@type": "Person", name: AUTHOR, url: `${SITE}/` },
    mainEntityOfPage: { "@type": "WebPage", "@id": e.url },
    url: e.url,
    isPartOf: { "@type": "CollectionPage", name: "Estudos de mercado em Ribeirão Preto", url: `${SITE}/mercado/estudos/` },
    spatialCoverage: { "@type": "Place", name: e.regiao || "Ribeirão Preto, SP" },
  };
  if (e.imagem) ld.image = [absUrl(e.imagem)];
  return ld;
}

function postBody(p) {
  const waText = `Olá, Flávio. Li o artigo "${p.titulo}" no seu site e gostaria de conversar.`;
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
            <p class="mercado-byline">Por <a class="mercado-byline__author" href="${AUTHOR_URL}">${AUTHOR}</a> <span aria-hidden="true">·</span> <time datetime="${p.data}">${formatDate(p.data)}</time></p>
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
          </div>${fonte}${shareAndVote(p)}${signature(waText)}
          <p class="mercado-back"><a href="/mercado/">← Voltar para Leitura de mercado</a></p>
        </div>
      </div>
    </article>`;
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
    author: { "@type": "Person", name: AUTHOR, url: `${SITE}${AUTHOR_URL}`, image: `${SITE}${SIGNATURE.src}`, jobTitle: "Consultor imobiliário" },
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
const estudos = readEstudos();

// limpeza de tudo que foi gerado antes
for (const f of readdirSync(MERCADO)) if (f.endsWith(".html")) rmSync(join(MERCADO, f));
if (existsSync(CAT_DIR)) rmSync(CAT_DIR, { recursive: true, force: true });
if (existsSync(ESTUDOS_DIR)) for (const f of readdirSync(ESTUDOS_DIR)) if (f.endsWith(".html")) rmSync(join(ESTUDOS_DIR, f));

const byCat = new Map();
for (const p of posts) {
  if (!byCat.has(p.categoria)) byCat.set(p.categoria, []);
  byCat.get(p.categoria).push(p);
}
const activeCats = CATEGORIES.filter((c) => byCat.has(c));

const LIST_TITLE = "Mercado imobiliário em Ribeirão Preto: leitura de Flávio Barros";
const LIST_DESC = "Leituras de Flávio Barros sobre o mercado imobiliário em Ribeirão Preto e região: juros, patrimônio, bairros, condomínios, terrenos e estudos de lançamentos.";
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
    portrait: true,
    estudos,
  }),
}));

mkdirSync(ESTUDOS_DIR, { recursive: true });
writeFileSync(join(ESTUDOS_DIR, "index.html"), page({
  title: "Estudos de mercado em Ribeirão Preto | Flávio Barros",
  description: "Estudos de Flávio Barros sobre lançamentos e regiões de Ribeirão Preto, enviados pelo WhatsApp, para quem quer decidir com dados, e não com impressão.",
  canonical: `${SITE}/mercado/estudos/`,
  robots: estudos.length ? "index,follow" : "noindex,follow",
  body: estudosIndexBody(estudos, activeCats),
  nav: "/mercado/estudos/",
}));
for (const e of estudos) {
  writeFileSync(join(ESTUDOS_DIR, `${e.slug}.html`), page({
    title: e.tituloSeo,
    description: e.descricao,
    canonical: e.url,
    robots: "index,follow",
    ogType: "article",
    image: ogImage(e.imagem, `Capa do estudo ${e.titulo}`),
    jsonld: estudoJsonLd(e),
    body: estudoBody(e),
    nav: "/mercado/estudos/",
  }));
}

for (const p of posts) {
  writeFileSync(join(MERCADO, `${p.slug}.html`), page({
    title: `${p.titulo} | Flávio Barros`,
    description: truncate(p.resumo, 300),
    canonical: p.url,
    robots: "index,follow",
    ogType: "article",
    image: ogImage(p.imagem, p.titulo),
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
if (estudos.length) {
  entries.push({ loc: `${SITE}/mercado/estudos/`, lastmod: estudos.map((e) => e.atualizado).sort().pop(), changefreq: "monthly", priority: "0.6" });
  for (const e of estudos) entries.push({ loc: e.url, lastmod: e.atualizado, changefreq: "monthly", priority: "0.6" });
}
updateSitemap(entries);

console.log(`Leitura de mercado: ${posts.length} texto(s), ${activeCats.length} categoria(s), ${indexableCats.length} indexável(is), ${estudos.length} estudo(s).`);
if (problems.length) {
  console.error(`\n${problems.length} arquivo(s) com problema (não publicados):\n- ${problems.join("\n- ")}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Textos não publicados\n\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `problems=${problems.length}\n`);
}
