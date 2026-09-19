#!/usr/bin/env node
/**
 * Sync curated selection from Lanportus public catalog.
 * Internal thresholds stay in this script only (never shown in public UI).
 *
 * HOUSE / APARTMENT / TWO_STORY_HOUSE: sale >= 3000000
 * LAND: sale >= 600000
 * ROOM / HALL / BUILDING / OUTHOUSE (comercial à venda): sale >= 300000
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_URL = "https://lanportus.com.br/catalog-data.js";
const OUT = join(ROOT, "data", "selecao.json");

const RESIDENTIAL = new Set(["HOUSE", "APARTMENT", "TWO_STORY_HOUSE"]);
const COMMERCIAL = new Set(["ROOM", "HALL", "BUILDING", "OUTHOUSE"]);
const RES_MIN = 3_000_000;
const LAND_MIN = 600_000;
const COMM_MIN = 300_000;

function parseCatalog(jsText) {
  const start = jsText.indexOf("window.LANPORTUS_CATALOG");
  if (start < 0) throw new Error("LANPORTUS_CATALOG not found");
  const eq = jsText.indexOf("=", start);
  let i = eq + 1;
  while (/\s/.test(jsText[i])) i++;
  if (jsText[i] !== "[") throw new Error("Expected array after LANPORTUS_CATALOG");
  let depth = 0;
  let inStr = false;
  let esc = false;
  let quote = "";
  for (let j = i; j < jsText.length; j++) {
    const c = jsText[j];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
      continue;
    }
    if (c === "[") depth++;
    if (c === "]") {
      depth--;
      if (depth === 0) return JSON.parse(jsText.slice(i, j + 1));
    }
  }
  throw new Error("Unterminated catalog array");
}

function passesInternalFilter(p) {
  const sale = Number(p.sale) || 0;
  if (p.type === "LAND") return sale >= LAND_MIN;
  if (RESIDENTIAL.has(p.type)) return sale >= RES_MIN;
  if (COMMERCIAL.has(p.type)) return sale >= COMM_MIN;
  return false;
}

function slim(p) {
  return {
    ref: String(p.ref),
    title: p.title || "",
    type: p.type,
    neighborhood: p.neighborhood || "",
    condominio: p.condominio || null,
    city: p.city || "",
    sale: Number(p.sale) || 0,
    area: Number(p.area) || 0,
    beds: Number(p.beds) || 0,
    baths: Number(p.baths) || 0,
    garages: Number(p.garages) || 0,
    suites: Number(p.suites) || 0,
    featured: Boolean(p.featured),
    tags: Array.isArray(p.tags) ? p.tags : [],
    image: p.image || "",
    slug: p.slug || "",
    source: "lanportus",
    detailUrl: `imovel.html?ref=${encodeURIComponent(String(p.ref))}`,
  };
}

async function main() {
  const res = await fetch(CATALOG_URL, {
    headers: { "User-Agent": "flavio-barros-site-sync/1.0" },
  });
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  const text = await res.text();
  const catalog = parseCatalog(text);
  const items = catalog.filter(passesInternalFilter).map(slim);
  items.sort((a, b) => b.sale - a.sale || a.ref.localeCompare(b.ref));

  const byType = {};
  for (const p of items) byType[p.type] = (byType[p.type] || 0) + 1;

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://lanportus.com.br/catalog-data.js",
    attribution: "Seleção Lanportus · curadoria Flávio Barros",
    count: items.length,
    byType,
    items,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${items.length} items → data/selecao.json`);
  console.log("byType:", byType);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
