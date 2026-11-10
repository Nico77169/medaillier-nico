// Place sur la carte les pièces récentes (2025-2027) du catalogue — une seule fois par pièce.
// Résultat : geo.json  { id: [lat, lon, précision, libellé] }
//   précision : "l" = le lieu lui-même, "o" = office de tourisme le plus proche, "v" = centre de la ville
// Sources gratuites : OpenStreetMap (Nominatim / Photon / Overpass) et la Base Adresse Nationale (adresse.data.gouv.fr)
import fs from "node:fs";

const YEARS = [2025, 2026, 2027];
const UA = "MedaillierNico/1.0 (https://github.com/Nico77169/medaillier-nico)";
const cat = JSON.parse(fs.readFileSync("catalogue.json", "utf8"));
const GEO = fs.existsSync("geo.json") ? JSON.parse(fs.readFileSync("geo.json", "utf8")) : {};
const LOG = [];
const log = (...a) => { const s = a.join(" "); LOG.push(s); console.log(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// lieux de vente très fréquents, placés à la main
const SITES = {
  "hôtel de la monnaie": [48.85672, 2.33912, "l", "Monnaie de Paris (11 quai de Conti)"],
  "paris saint-germain": [48.84144, 2.25303, "l", "Parc des Princes (boutique PSG)"],
  "sanctuaires de lourdes": [43.09756, -0.05832, "l", "Sanctuaires de Lourdes"],
};
const FIXED = { disney: [48.8722, 2.7758, "l", "Disneyland Paris"], beauval: [47.2486, 1.3517, "l", "ZooParc de Beauval"] };

function yearsOf(t) {
  const s = String(t.years || "") + " " + (t.v || []).map(v => v[0]).join(" ");
  return new Set((s.match(/(?<!\d)20\d\d(?!\d)/g) || []).map(Number));
}
async function getJSON(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr" } });
      if (r.ok) return await r.json();
      log("  HTTP", r.status, url.slice(0, 90));
      if (r.status === 403 || (r.status === 429 && i >= 2)) return { __blocked: true };
    } catch (e) { log("  réseau", e.message); }
    await sleep(4000 * (i + 1)); // serveur occupé (503…) : on attend de plus en plus longtemps
  }
  return null;
}
const km = (a, b, c, d) => { const R = 6371, r = x => x * Math.PI / 180, dl = r(c - a), dn = r(d - b);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const deptOk = (dept, code) => !dept || (code && (code === "FR-" + dept || code.startsWith("FR-" + dept)));
const deptOfPost = p => !p ? null : p.startsWith("97") ? p.slice(0, 3) : p.startsWith("20") ? "20" : p.slice(0, 2);
const sameDept = (dept, post) => { const d = deptOfPost(post); if (!dept || !d) return !dept; if (d === "20") return /^2[AB]$/.test(dept); return d === dept; };

// --- Recherche d'un lieu par son nom -------------------------------------------------------
let NOMI_BLOCKED = false;
// homonymes à écarter : restaurants, bars, commerces, bureaux, arrêts de bus…
const BAD = /^(shop|office|craft|highway|railway|public_transport)=|=(restaurant|cafe|bar|pub|fast_food|bakery|hairdresser|pharmacy|bus_stop|parking|fuel|bank)$/;
async function findPlace(q, dept) {
  if (!q || q.length < 4) return null;
  const fr = dept ? "&countrycodes=fr" : "";
  if (!NOMI_BLOCKED) {
    await sleep(1100); // règle Nominatim : 1 requête par seconde maximum
    const j = await getJSON(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5${fr}&q=${encodeURIComponent(q)}`);
    if (j && j.__blocked) { NOMI_BLOCKED = true; log("Nominatim refuse → bascule sur Photon"); }
    else if (Array.isArray(j)) {
      for (const r of j) {
        const a = r.address || {};
        if (BAD.test(r.category + "=" + r.type)) continue;
        if (deptOk(dept, a["ISO3166-2-lvl6"]) || (dept && sameDept(dept, a.postcode)))
          return { lat: +r.lat, lon: +r.lon, type: r.addresstype || r.type, name: r.name };
      }
    }
  }
  await sleep(400);
  const j = await getJSON(`https://photon.komoot.io/api/?limit=5&lang=fr&q=${encodeURIComponent(q)}`);
  for (const f of (j && j.features) || []) {
    const p = f.properties || {};
    if (dept && p.countrycode !== "FR") continue;
    if (dept && !sameDept(dept, p.postcode)) continue;
    if (BAD.test(p.osm_key + "=" + p.osm_value)) continue;
    return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], type: p.type || p.osm_value, name: p.name };
  }
  return null;
}
// --- Commune (Base Adresse Nationale) ---------------------------------------------------------
async function findTown(q, dept) {
  if (!q || !dept) return null;
  await sleep(150);
  const j = await getJSON(`https://api-adresse.data.gouv.fr/search/?type=municipality&limit=5&q=${encodeURIComponent(q)}`);
  for (const f of (j && j.features) || []) {
    const p = f.properties;
    if (String(p.context || "").split(",")[0].trim() === dept && p.score > 0.5)
      return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], name: p.city || p.name };
  }
  return null;
}
// --- Offices de tourisme de France (une seule requête Overpass) ------------------------------
async function loadOffices() {
  const q = `[out:json][timeout:240];area["ISO3166-1"="FR"][admin_level=2]->.a;nwr["tourism"="information"]["information"="office"](area.a);out center tags;`;
  for (const ep of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter"]) {
    await sleep(5000);
    try {
      const r = await fetch(ep, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
      if (!r.ok) { log("Overpass", r.status, ep); continue; }
      const j = await r.json();
      const list = j.elements.map(e => ({ lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, name: e.tags?.name || "Office de tourisme" })).filter(o => o.lat);
      log("Offices de tourisme trouvés :", list.length); return list;
    } catch (e) { log("Overpass erreur", e.message); }
  }
  return [];
}
const nearest = (list, lat, lon, max) => { let b = null, bd = max; for (const o of list) { const d = km(lat, lon, o.lat, o.lon); if (d < bd) { bd = d; b = o; } } return b; };

// --- Noms à essayer --------------------------------------------------------------------------
const GENERIC = /^(mairie|ville de|association|union|amicale|club|soci[ée]t[ée]|comit[ée]|communaut[ée]|souvenirs?|la boite|boutique|magasin|sarl|sas|commune)\b/i;
const OFFICE = /office (de|du|des)? ?touris|tourisme/i;
function townGuesses(t) {
  const out = [], seg = String(t.name).split(/\s+-\s+/);
  out.push(seg[0]);
  const m = String(t.site || "").match(/\b(?:de|du|des|d')\s*(?:la |le |l')?([A-ZÉÈ][\wÀ-ÿ' -]+)$/);
  if (m) out.push(m[1]);
  if (seg[1]) out.push(seg[1]);
  return [...new Set(out.map(s => s.trim()).filter(s => s.length > 2))];
}

// REDO=1 : on refait tout (après amélioration du robot)
if (process.env.REDO === "1") for (const k of Object.keys(GEO)) delete GEO[k];
const todo = cat.tokens.filter(t => !GEO[t.id] && [...yearsOf(t)].some(y => YEARS.includes(y)));
log("Pièces récentes à placer :", todo.length, "(déjà placées :", Object.keys(GEO).length + ")");
let OFFICES = null;
let n = 0, stats = { l: 0, o: 0, v: 0, rien: 0 };
for (const t of todo) {
  n++;
  if (FIXED[t.cat]) { GEO[t.id] = FIXED[t.cat]; stats.l++; continue; }
  const dept = t.dept || null, site = (t.site || "").trim();
  if (SITES[site.toLowerCase()]) { GEO[t.id] = SITES[site.toLowerCase()]; stats.l++; continue; }
  let hit = null, prec = "l", label = "";
  // 1) le lieu de vente indiqué
  if (site && !GENERIC.test(site)) { hit = await findPlace(site, dept); label = site; if (hit && OFFICE.test(site)) prec = "o"; }
  // 2) le nom de la pièce (monument, parc, musée…)
  if (!hit) {
    const clean = x => x.replace(/\b(19|20)\d\d\b|\d+\s*(ans|e|ème)\b/gi, "").replace(/\s+/g, " ").trim();
    const seg = String(t.name).split(/\s+-\s+/).map(clean).filter(x => x.length > 3);
    const qs = [...new Set([seg.slice(0, 2).join(" "), seg[0], seg[1] && seg[1].length >= 8 ? seg[1] : null, seg[0] && seg[0].replace(/\bParis\b/i, "").trim()].filter(Boolean))];
    for (const q of qs) { hit = await findPlace(q, dept); if (hit) { label = q; break; } }
  }
  // 3) sinon : la commune → office de tourisme le plus proche
  if (!hit || ["city", "town", "village", "municipality", "administrative", "county", "state"].includes(hit.type)) {
    let town = hit && { lat: hit.lat, lon: hit.lon, name: hit.name };
    if (!town) for (const q of townGuesses(t)) { town = await findTown(q, dept); if (town) break; }
    if (town) {
      if (!OFFICES) OFFICES = await loadOffices();
      let o = nearest(OFFICES, town.lat, town.lon, 15);
      if (!o && !OFFICES.length) { const f = await findPlace("Office de tourisme " + town.name, dept); if (f && km(f.lat, f.lon, town.lat, town.lon) < 15) o = { ...f, name: f.name || "Office de tourisme" }; }
      if (o) { hit = o; prec = "o"; label = o.name + " (" + town.name + ")"; }
      else { hit = town; prec = "v"; label = town.name; }
    }
  }
  if (hit) { GEO[t.id] = [+hit.lat.toFixed(5), +hit.lon.toFixed(5), prec, label]; stats[prec]++; }
  else { stats.rien++; log("  ✗ introuvable :", t.ref, "|", t.name, "|", site, "|", dept); }
  if (n % 25 === 0) { log(`… ${n}/${todo.length}`, JSON.stringify(stats)); fs.writeFileSync("geo.json", JSON.stringify(GEO)); }
}
fs.writeFileSync("geo.json", JSON.stringify(GEO));
log("Terminé :", JSON.stringify(stats));
fs.writeFileSync("scripts/geo-log.txt", LOG.join("\n") + "\n");
