/**
 * Utilidades compartilhadas pelos geradores do site (build-mercado.mjs, build-acervo.mjs):
 * slug, escape de HTML e um conversor de Markdown simples, sem dependências.
 */
export const SITE = "https://flaviodebarros.com.br";

export function slugify(s) {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function localPath(p) {
  // Caminho do site -> absoluto a partir da raiz (/images/...). URLs externas ficam iguais.
  p = String(p).trim();
  if (/^(https?:)?\/\//i.test(p) || /^(mailto|tel|data):/i.test(p) || p.startsWith("#")) return p;
  return "/" + p.replace(/^(\.\.\/|\.\/)+/, "").replace(/^\/+/, "");
}

export function unesc(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

export function link(href, text) {
  if (/^\s*javascript:/i.test(href)) return text;
  const external = /^https?:\/\//i.test(href) && !href.startsWith(SITE);
  return `<a href="${esc(localPath(href))}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
}

export function inline(text) {
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
