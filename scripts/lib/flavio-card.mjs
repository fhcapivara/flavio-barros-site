// Card padronizado do Flávio (foto 720x900, 4:5). Mesmo HTML em todas as páginas.
// O mesmo bloco é usado no HTML estático (sobre, contato etc.); mantenha as classes iguais.
export const PHOTO_BASE = "/images/flavio/flavio-barros-corretor-imoveis-ribeirao-preto-";
export const PHOTO_W = 720;
export const PHOTO_H = 900;
const ALT_BASE = "Flávio Barros, corretor de imóveis em Ribeirão Preto, ";
const escA = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function photoUrl(slug, ext = "jpg") { return `${PHOTO_BASE}${slug}.${ext}`; }

export function flavioPhoto(slug, altSuffix) {
  return `<picture class="mercado-signature__photo"><source srcset="${photoUrl(slug, "webp")}" type="image/webp" /><img src="${photoUrl(slug)}" width="${PHOTO_W}" height="${PHOTO_H}" alt="${escA(ALT_BASE + altSuffix)}" loading="lazy" decoding="async" /></picture>`;
}

export function flavioSignature({ slug, altSuffix, note, waHref, label = "Sobre o autor" }) {
  return `
          <aside class="mercado-signature" aria-label="${escA(label)}">
            ${flavioPhoto(slug, altSuffix)}
            <div class="mercado-signature__body">
              <p class="mercado-signature__name">Flávio Barros</p>
              <p class="mercado-signature__role">Corretor de imóveis em Ribeirão Preto e região</p>
              <p class="mercado-signature__creci">Corretor de imóveis · CRECI 323468</p>
              <p class="mercado-signature__note">${note}</p>
              <p class="mercado-signature__actions">
                <a class="btn btn--primary" href="${escA(waHref)}" target="_blank" rel="noopener noreferrer">Conversar no WhatsApp</a>
                <a class="mercado-signature__link" href="/sobre.html">Conheça minha trajetória</a>
              </p>
            </div>
          </aside>`;
}

export function consultantSection(opts) {
  return `
    <section class="section consultant-section" aria-label="Seu corretor">
      <div class="container">${flavioSignature({ label: "Seu corretor", ...opts })}
      </div>
    </section>`;
}
