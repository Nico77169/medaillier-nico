// Robot mensuel : ajoute au catalogue les nouveaux jetons Monnaie de Paris trouvés sur Numista.
// Priorité : Disney, puis Beauval, puis toutes les autres nouveautés de l'année (si le budget le permet).
// La clé API vient du secret GitHub NUMISTA_API_KEY (jamais écrite dans le code).
import fs from "node:fs";

const KEY = process.env.NUMISTA_API_KEY;
if (!KEY) { console.log("Pas de clé NUMISTA_API_KEY : rien à faire."); process.exit(0); }
const MAX = Number(process.env.MAX_REQUESTS || 900);   // plafond de sécurité (quota Numista : 2000/mois)
let used = 0;

const cat = JSON.parse(fs.readFileSync("catalogue.json", "utf8"));
const seenFile = "scripts/seen.json";
const seen = new Set(fs.existsSync(seenFile) ? JSON.parse(fs.readFileSync(seenFile, "utf8")) : []);
const known = new Set(cat.tokens.filter(t => t.n).map(t => t.n));
const norm = s => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
// « clé de titre » : sert à reconnaître une même face frappée plusieurs années (Numista crée une fiche par revers)
const STOP = /\b(DISNEYLAND|DISNEY|RESORT|PARIS|ZOOPARC|ZOO|PARC|DE|DU|DES|LA|LE|LES|L|D|ET|VAL|LOIRE|BEAUVAL|ANNEE|TYPE|\d+)\b/g;
const tkey = s => norm(s).replace(/[^A-Z0-9 ]+/g, " ").replace(STOP, " ").replace(/\s+/g, " ").trim();
const knownKeys = new Set(cat.tokens.flatMap(t => [t.nt, t.name]).filter(Boolean).map(tkey).filter(k => k.length > 2));

async function api(path) {
  if (used >= MAX) throw new Error("BUDGET");
  used++;
  const r = await fetch("https://api.numista.com/v3" + path, { headers: { "Numista-API-Key": KEY } });
  if (r.status === 429) throw new Error("BUDGET");
  if (!r.ok) throw new Error("HTTP " + r.status + " " + path);
  return r.json();
}
async function searchAll(params) {
  const out = []; let page = 1;
  for (;;) {
    const d = await api(`/types?issuer=france&category=exonumia&count=50&page=${page}&lang=fr&${params}`);
    out.push(...(d.types || []));
    if (out.length >= d.count || !(d.types || []).length) break;
    page++;
  }
  return out;
}
const isSouvenir = t => (t.object_type && (t.object_type.id === 31 || /souvenir/i.test(t.object_type.name || "")));
const clean = s => String(s || "").replace(/^(Jeton touristique|Monnaie de Paris Tourist Token|Médaille souvenir)\s*-\s*/i, "").replace(/^Monnaie de Paris\s*-\s*/i, "").trim();
function photo(side) {
  if (!side || !side.picture_license_name || !side.thumbnail) return null;
  return { src: side.thumbnail.replace("-180.jpg", "-original.jpg"), by: side.picture_copyright || "Numista", lic: side.picture_license_name };
}

const year = new Date().getFullYear();
// Disney et Beauval : année en cours + année d'avant (une pièce de décembre peut arriver sur Numista en janvier ou plus tard)
const prio = [year - 1, year];
// Autres nouveautés : année en cours (+ année d'avant de janvier à mars)
const years = new Date().getMonth() <= 2 ? [year - 1, year] : [year];
const added = [];
async function consider(list, catId) {
  for (const t of list) {
    if (known.has(t.id) || seen.has(t.id) || !isSouvenir(t)) continue;
    if (knownKeys.has(tkey(t.title))) { seen.add(t.id); continue; }            // même face déjà au catalogue
    if (!catId && !(t.min_year >= years[0])) continue;                          // hors Disney/Beauval : seulement les vraies nouveautés
    const d = await api(`/types/${t.id}?lang=fr`);
    seen.add(t.id);
    const rev = norm((d.reverse && d.reverse.lettering) || "");
    if (!(rev.includes("MONNAIE") && rev.includes("PARIS"))) continue;          // pas estampillé Monnaie de Paris
    const title = norm(d.title);
    const c = catId || (title.includes("DISNEY") ? "disney" : title.includes("BEAUVAL") ? "beauval" : "nouveautes");
    const np = {}; const f = photo(d.obverse), b = photo(d.reverse); if (f) np.f = f; if (b && c !== "disney") np.b = b;
    const tok = { id: "n" + d.id, cat: c, ref: "", name: clean(d.title), nt: d.title,
      years: d.min_year && d.max_year && d.min_year !== d.max_year ? `${d.min_year}-${d.max_year}` : String(d.min_year || d.max_year || ""),
      n: d.id };
    if (Object.keys(np).length) tok.np = np;
    cat.tokens.push(tok); known.add(d.id); knownKeys.add(tkey(d.title)); added.push(`${c}: ${tok.name}`);
  }
}

try {
  for (const y of prio) {
    await consider(await searchAll(`q=disneyland&year=${y}`), "disney");
    await consider(await searchAll(`q=beauval&year=${y}`), "beauval");
  }
  // Les autres thèmes viennent maintenant du catalogue CJT de Nico (export de son compte) :
  // le robot ne cherche plus que Disney et Beauval, pour éviter les doublons.
  if (process.env.ALL_THEMES === "1") for (const y of years) await consider(await searchAll(`year=${y}`), null);
} catch (e) {
  if (e.message !== "BUDGET") { console.error(e); }
  else console.log("Plafond de requêtes atteint, la suite sera faite le mois prochain.");
}

fs.writeFileSync(seenFile, JSON.stringify([...seen]));
// trace du passage : garde le dépôt « actif » (GitHub coupe les robots d'un dépôt public sans activité pendant 60 jours)
fs.writeFileSync("scripts/last-run.txt", new Date().toISOString() + `\nrequêtes: ${used}, ajouts: ${added.length}\n`);
if (added.length) {
  cat.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync("catalogue.json", JSON.stringify(cat));
}
console.log(`Requêtes utilisées : ${used}. Nouveautés ajoutées : ${added.length}`);
added.forEach(a => console.log(" + " + a));
