/* Médaillier de Nico — appli installable (PWA)
   Données : catalogue.json (public) + collection de Nico dans Supabase (privée, protégée par compte). */
"use strict";
let CATS=[], CATALOG=[], PHOTOS={}, CATALOG_DATE="", LEGACY={}, CJT_OWN={}, CJT_DATE="", RESET_OWN="", RESET_BACK="";
const IMPORT_CJT=false; // import CJT fait une fois (6 nov.) : coupé pour qu'il ne puisse jamais se refaire
// Variantes cochées en vert dans le tableau Disney de Nico : appliquées une seule fois, au premier lancement
const PRESET = {"d0299":{"2004|04 CN Diff. Bas":1},"d0303":{"2004|04 CN":1},"d0297":{"2007|07 MDP":1},"d0577":{"2008|08 EVM France":1},"d0681":{"2008|08 EVM":1},"d0706":{"2009|09 EVM":1,"2013|13 MDP-2":1,"2020|20 MDP-3 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d0811":{"2009|09 EVM":1},"d0945":{"2009|09 EVM":1,"2010|10 EVM":1},"d0837":{"2009|09 EVM":1},"d1047":{"2010|10 EVM":1},"d1011":{"2010|10 EVM":1,"2013|13 MDP-2":1,"2015|15 MDP-2 NG":1,"2017|17 MDP-2 NG":1,"2018|18 MDP-2 NG":1,"2020|20 MDP-3 NG":1,"2021|21 MDP-3 NG":1,"2022|22 MDP-3 NG":1},"d1010":{"2010|10 EVM":1,"2012|12 EVM":1,"2017|17 MDP-2 NG":1,"2018|18 MDP-2 NG":1,"2019|19 MDP-2 NG":1,"2021|21 MDP-3 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d1100":{"2011|11 EVM":1},"d1373":{"2012|12 MDP-2":1},"d1279":{"2012|12 EVM":1,"2012|12 MDP-2":1},"d1208":{"2012|12 EVM":1,"2020|20 MDP-3 NG":1},"d1201":{"2012|12 EVM":1,"2015|15 MDP-2 NG":1,"2017|17 MDP-2 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d1012":{"2013|13 MDP":1},"d1702":{"2014|14 MDP-2 NG":1},"d1719":{"2014|14 MDP-2 CAN":1},"d1877":{"2015|15 MDP-2 NG":1,"2016|16 MDP-2 NG":1,"2020|20 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d2467":{"2017|17 MDP/EVM":1},"d2392":{"2017|17 MDP/EVM":1},"d1718":{"2017|17 MDP-2 NG":1},"d2817":{"2018|18 MDP/EVM":1},"d2746":{"2018|18 MDP/EVM":1,"2020|20 MDP-3 NG":1,"2021|21 MDP-3 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d2501":{"2018|18 MDP-2 NG":1,"2020|20 MDP-3 NG":1},"d3088":{"2020|20 MDP/EVM":1},"d3035":{"2020|20 MDP/EVM":1},"d3635":{"2022|22 MDP/EVM":1},"d3432":{"2022|22 MDP/EVM":1},"d3704":{"2023|23 MDP/EVM":1},"d3885":{"2023|23 MDP-3 NG":1},"d3491":{"2023|23 MDP-3 NG":1},"d3943":{"2024|24 MDP/EVM":1},"d4182":{"2024|24 MDP-3 NG":1},"d3942":{"2024|24 MDP-3 NG":1,"2025|25 MDP-3 NG":1},"d4198":{"2025|25 MDP/EVM":1},"d4239":{"2025|25 MDP-3 NG":1},"d4256":{"2025|25 MDP/EVM":1},"d4489":{"2025|25 MDP/EVM":1},"d4202":{"2025|25 MDP/EVM":1},"d4496":{"2026|26 MDP/EVM":1},"d4047":{"2026|26 MDP/EVM":1},"d4490":{"2026|26 MDP/EVM":1}};
function applyPreset(items){ Object.entries(PRESET).forEach(([id,vq])=>{ const cur=items[id]||{}; items[id]={...cur,vq:{...vq,...(cur.vq||{})}}; }); }

/* ---------- état ---------- */
const S = { items:{}, custom:{}, filter:null, cat:null, q:"", shown:60, prefs:{} };
const PAGE=60; let VIEWKEY="";
const $ = s=>document.querySelector(s);
const esc = s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm = s=>String(s??"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const eur = n=>(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:2});
const catOf = id=>CATS.find(c=>c.id===id)||{name:"Autre"};
const ls = { get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}} };
function allTokens(){ return CATALOG.concat(Object.values(S.custom)); }
let NEWY=0; // année des nouveautés (la plus récente du catalogue)
function hasCat(c){ return CATS.some(x=>x.id===c); }
function catT(t){ const mv=S.items[t.id]&&S.items[t.id].mv; if(mv&&hasCat(mv)) return mv; if(hasCat(t.cat)) return t.cat;
  if(t.dept&&hasCat("d"+t.dept)) return "d"+t.dept; return "autres"; } // anciennes catégories -> département ou « Sans département » // thème choisi par Nico s'il a déplacé la pièce
function inCat(t,c){ const k=catT(t); if(c==="nouveautes") return k!=="disney"&&k!=="beauval"&&parseInt(t.years,10)===NEWY; /* pièces sorties pour la première fois cette année */ return k===c; }
function isVirtual(c){ return !!(CATS.find(x=>x.id===c)||{}).virtual; }
function st(id){ return S.items[id]||{}; }
// lignes toujours rangées par année puis par revers (une année ajoutée se met à sa place)
const byYear=(a,b)=>(+a.y||9999)-(+b.y||9999)||String(a.r).localeCompare(String(b.r),"fr",{numeric:true});
function units(t){ return unitsRaw(t).sort(byYear); }
/* vx : lignes du catalogue corrigées par Nico (clé d'origine -> "année|revers", ou "-" = masquée). La clé ne change pas : les coches restent. */
function fixLine(u,o){ const vx=u.vx||{}, n=vx[o.k]; if(!n) return o; const [a,...b]=n.split("|"); return {...o,y:+a||a,r:b.join("|"),ed:true,y0:o.y,r0:o.r}; }
function unitsRaw(t){ const u=st(t.id), vx=u.vx||{};
  if(t.v) return t.v.concat((u.xv||[]).filter(([y,r])=>!t.v.some(v=>v[0]==y&&v[1]===r)).map(x=>[x[0],x[1],null,1])).map(([y,r,c,a])=>{const k=y+"|"+r; return fixLine(u,{k,y,r,c:c||null,q:(u.vq||{})[k]||0,p:!!(u.pv||{})[k],added:!!a});}).filter(x=>x.added||vx[x.k]!=="-");
  return [fixLine(u,{k:"_",y:yearOf(t),r:t.rev||"",q:u.q||0,c:null,p:!!(u.pv||{})._})]
    .concat((u.xv||[]).map(([y,r])=>{const k=y+"|"+r; return {k,y,r,c:null,q:(u.vq||{})[k]||0,p:!!(u.pv||{})[k],added:true};})); }
function eff(t){ const u=st(t.id); const us=units(t); return {
  us, qty:us.reduce((a,x)=>a+x.q,0), paid:num(u.paid), val: u.val!=null&&u.val!==""?num(u.val):(t.value??null),
  rar: u.rar||t.rar||"", shop: u.shop!=null&&u.shop!==""?u.shop:(t.shop==null?"":(t.shop?"oui":"non")), f:u.f, b:u.b }; }
function num(v){ const n=parseFloat(String(v??"").replace(",",".")); return isNaN(n)?null:n; }

function passFilter(t){
  const us=units(t);
  if(S.filter==="own") return us.some(x=>x.q>0);
  if(S.filter==="missing") return us.some(x=>x.q===0);
  if(S.filter==="dup") return us.some(x=>x.q>1);
  if(S.filter==="hugo") return Object.keys(st(t.id).hv||{}).length>0;
  if(S.filter==="pend") return units(t).some(x=>x.p&&x.q<=0);
  return true;
}
/* ---------- recherche tolérante ----------
   - cherche aussi dans les revers et les années de chaque ligne
   - ignore accents, majuscules, tirets, apostrophes (« saint malo » = « Saint-Malo », « hermine » = « l'Hermine »)
   - accepte une petite faute de frappe (« haloween », « halloweene »), le pluriel, les mots coupés (« hallo »)
   - si rien ne correspond à tous les mots, montre les pièces qui en contiennent le plus (« résultats approchants ») */
const STOPW=new Set(["de","du","des","la","le","les","l","d","et","a","au","aux","en","the","of","st","ste"]);
const words=s=>norm(s).replace(/['’`´]/g," ").replace(/[^a-z0-9]+/g," ").trim().split(" ").filter(w=>w&&!STOPW.has(w));
function near(a,b){ // distance d'édition ≤ 1 (ou ≤ 2 pour les mots longs)
  const max=a.length>=8?2:1; if(Math.abs(a.length-b.length)>max) return false;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){ const cur=[i]; let best=i;
    for(let j=1;j<=b.length;j++){ cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)); if(cur[j]<best) best=cur[j]; }
    if(best>max) return false; prev=cur; }
  return prev[b.length]<=max;
}
function hayOf(t){ const e=eff(t); return words([t.ref,t.name,t.site,t.years,t.dept,t.note,t.metal,catOf(catT(t)).name,e.us.map(x=>x.y+" "+x.r).join(" ")].join(" ")); }
function wordHit(w,hay,flat){
  if(flat.includes(w)) return true;                      // morceau de mot (« hallo », « fr77-0295 »)
  if(w.length<4||/\d/.test(w)) return false;              // pas d'à-peu-près sur les chiffres et codes
  return hay.some(h=>near(w,h)||(h.length>4&&w.startsWith(h)&&w.length-h.length<=2)); // faute de frappe, pluriel
}
const CODE_RE=/^(?:jtc)?([a-z]{2})\s*-?\s*([0-9ab]{2})\s*-?\s*(\d{1,4})$/;
function score(t,q){ const nq=norm(q).trim();
  const cm=CODE_RE.exec(nq); if(cm){ const code=(cm[1]+cm[2]+"-"+cm[3].padStart(4,"0")).toUpperCase(); return (t.ref||"").toUpperCase().includes(code)?2:0; } // un code = recherche exacte
  const qs=words(q); if(!qs.length) return 1; const hay=hayOf(t), flat=hay.join(" ");
  const hits=qs.filter(w=>wordHit(w,hay,flat)).length; if(hits<qs.length) return hits/qs.length;
  return qs.every(w=>flat.includes(w))?2:1; } // 2 = tous les mots tels quels, 1 = avec une petite faute
function matches(t,q){ return !q || score(t,q)>=1; }
function stats(list){
  let total=0,own=0,qty=0,dup=0,spent=0,value=0,pend=0;
  list.forEach(t=>{const e=eff(t); e.us.forEach(x=>{ total++; if(x.q>0){own++; qty+=x.q; dup+=x.q-1; value+=(x.c??e.val??0)*x.q;} else if(x.p) pend++; }); spent+=(e.paid||0)*e.qty;});
  return {total,own,missing:total-own,qty,dup,spent,value,pend};
}

/* ---------- photos perso : stockage local (IndexedDB) + en ligne (Supabase Storage) ---------- */
const BLANK="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const URLS={}, LOADING={};
const idb=(()=>{ let p=null; const open=()=>p||(p=new Promise((res,rej)=>{ const r=indexedDB.open("medaillier",1); r.onupgradeneeded=()=>r.result.createObjectStore("photos"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }));
  const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{ const t=db.transaction("photos",mode); const st=t.objectStore("photos"); const q=fn(st); t.oncomplete=()=>res(q&&q.result); t.onerror=()=>rej(t.error); }));
  return { get:k=>tx("readonly",s=>s.get(k)), put:(k,v)=>tx("readwrite",s=>s.put(v,k)) }; })();
function ownSrc(ref){ if(!ref) return ""; if(URLS[ref]) return URLS[ref]; loadPhoto(ref); return BLANK; }
const PHFAIL={}; // photos qu'on n'a pas encore réussi à charger (raison), pour réessayer et pour le diagnostic
async function loadPhoto(ref){
  if(LOADING[ref]) return; LOADING[ref]=true;
  try{
    let blob=await idb.get(ref).catch(()=>null), url=null;
    if(!blob && ref.startsWith("sb:")){
      if(!UID){ PHFAIL[ref]="attente connexion"; return; }             // pas encore connecté : on réessaiera après la connexion
      const {data,error}=await supa.storage.from("photos").download(ref.slice(3));
      if(!error&&data){ blob=data; idb.put(ref,blob).catch(()=>{}); }
      else { const r=await supa.storage.from("photos").createSignedUrl(ref.slice(3),3600).catch(()=>({})); // plan B : lien direct
        if(r&&r.data&&r.data.signedUrl) url=r.data.signedUrl; else PHFAIL[ref]="serveur : "+((error&&error.message)||"introuvable"); }
    }
    if(blob) url=URL.createObjectURL(blob);
    if(url){ URLS[ref]=url; delete PHFAIL[ref]; document.querySelectorAll(`img[data-ph="${CSS.escape(ref)}"]`).forEach(i=>i.src=url); }
    else if(!PHFAIL[ref]) PHFAIL[ref]="absente du téléphone";
  }finally{ LOADING[ref]=false; }
}
// réessaie toutes les photos affichées qui ne sont pas encore chargées
const PHT={};
function retryPhotos(force){ document.querySelectorAll("img[data-ph]").forEach(i=>{ const r=i.dataset.ph;
  if(URLS[r]){ if(i.src!==URLS[r]) i.src=URLS[r]; return; }
  if(!force&&PHFAIL[r]&&PHFAIL[r]!=="attente connexion"&&Date.now()-(PHT[r]||0)<20000) return; // pas plus d'un essai toutes les 20 s
  PHT[r]=Date.now(); loadPhoto(r); }); }
// demande au téléphone de ne pas effacer les photos de l'appli pour faire de la place
try{ navigator.storage&&navigator.storage.persist&&navigator.storage.persist(); }catch(e){}
// photos pas encore envoyées : gardées aussi en mémoire (si le téléphone perd sa copie locale, on envoie quand même)
const MEM={}, REMOVED=(()=>{ try{ return JSON.parse(localStorage.getItem("nico_removed"))||{}; }catch(e){ return {}; } })();
function phLog(msg){ const l=ls.get("nico_phlog")||[]; l.unshift(new Date().toLocaleString("fr-FR")+" · "+msg); ls.set("nico_phlog",l.slice(0,15)); }
async function storeBlob(blob){
  const key="idb:"+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
  MEM[key]=blob; URLS[key]=URL.createObjectURL(blob);
  setTimeout(()=>psLearnSoon(),1500); // la recherche par photo l'apprend tout de suite, en arrière-plan
  try{ await idb.put(key,blob); }catch(e){ phLog("copie téléphone impossible : "+(e&&e.message||e)); }
  return key;
}

/* ---------- synchronisation ---------- */
const CFG=window.APP_CONFIG;
const supa=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
let UID=null, syncing=false, flushTimer=null, retryTimer=null;
const EDIT={}; // heure de la dernière modif locale de chaque pièce (évite qu'une synchro en cours écrase un clic récent)
const Q=()=>ls.get("nico_queue")||{};
function queue(id){ EDIT[id]=Date.now(); const q=Q(); q[id]=1; ls.set("nico_queue",q); clearTimeout(flushTimer); flushTimer=setTimeout(flush,500); }
function persistLocal(){ ls.set("nico_items",S.items); ls.set("nico_custom",S.custom); }
function saveItem(id){ persistLocal(); queue(id); }
function saveCustom(id){ persistLocal(); queue(id); }
function saveFilter(){ ls.set("nico_filter",S.filter); }
/* Journal des modifs : on n'envoie au serveur QUE ce qui a été touché (champ par champ, année par année),
   appliqué par-dessus la version du serveur. Un téléphone pas à jour ne peut donc plus écraser d'autres coches. */
const DIRTY=ls.get("nico_dirty")||{}, DV={};
const MAPS=["vq","hv","pv","hide","vx"];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function markDirty(id,before,after){
  before=before||{}; after=after||{}; const d=DIRTY[id]||(DIRTY[id]={});
  new Set([...Object.keys(before),...Object.keys(after)]).forEach(k=>{
    const a=before[k], b=after[k];
    if(MAPS.includes(k)){ const m=d["~"+k]||(d["~"+k]={});
      new Set([...Object.keys(a||{}),...Object.keys(b||{})]).forEach(x=>{ const y=(b||{})[x]; if(!same((a||{})[x],y)) m[x]=y===undefined?null:y; });
      if(!Object.keys(m).length) delete d["~"+k]; }
    else if(!same(a,b)) d["="+k]=b===undefined?null:b;
  });
  DV[id]=(DV[id]||0)+1; ls.set("nico_dirty",DIRTY);
}
function emptyItem(c){ return !c.q && !c.vq && !c.xv && !c.hv && !c.f && !c.b && !c.mv && !c.pv && !c.hide && !c.ns && !c.loc && !c.vx; }
function applyDirty(base,d){
  const r=JSON.parse(JSON.stringify(base||{}));
  Object.entries(d||{}).forEach(([k,v])=>{
    if(k[0]==="="){ const f=k.slice(1); if(v===null||v===""||v===0&&f!=="q") delete r[f]; else r[f]=v; }
    else if(k[0]==="~"){ const f=k.slice(1), m=(r[f]&&typeof r[f]==="object")?r[f]:{};
      Object.entries(v).forEach(([x,y])=>{ if(y===null||y===0||y===false||y==="") delete m[x]; else m[x]=y; });
      if(Object.keys(m).length) r[f]=m; else delete r[f]; }
    else if(k==="_custom"){ if(v===null) delete r._custom; else r._custom=v; }
  });
  if(!r.q) delete r.q;
  return r;
}
function patch(id,obj){
  const before=S.items[id]?JSON.parse(JSON.stringify(S.items[id])):null;
  const cur={...(S.items[id]||{}),...obj};
  Object.keys(cur).forEach(k=>{ if(cur[k]===""||cur[k]==null) delete cur[k]; });
  if(cur.vq){ Object.keys(cur.vq).forEach(k=>{ if(!cur.vq[k]) delete cur.vq[k]; }); if(!Object.keys(cur.vq).length) delete cur.vq; }
  if(cur.hv && !Object.keys(cur.hv).length) delete cur.hv;
  if(cur.pv && !Object.keys(cur.pv).length) delete cur.pv;
  if(cur.hide && !Object.keys(cur.hide).length) delete cur.hide;
  if(cur.vx && !Object.keys(cur.vx).length) delete cur.vx;
  if(emptyItem(cur)) delete S.items[id]; else S.items[id]=cur;
  markDirty(id,before,S.items[id]);
  if(S.custom[id]) saveCustom(id); else saveItem(id);
}
function setSync(state,txt){ const el=$("#status"); el.innerHTML=`<span class="sync ${state}"><i></i>${esc(txt)}</span>${UID?'<button class="logout" id="logoutBtn">Se déconnecter</button>':""}`; }
async function uploadPending(id){
  const it=S.items[id]; if(!it) return;
  for(const side of ["f","b"]){
    const ref=it[side]; if(!ref||!ref.startsWith("idb:")) continue;
    let blob=MEM[ref]||await idb.get(ref).catch(()=>null);
    if(!blob){ phLog("photo introuvable sur le téléphone ("+id+") : gardée en attente"); PHFAIL[ref]="absente du téléphone"; continue; } // on ne l'efface plus jamais
    const path=`${UID}/${id}_${side}_${Date.now()}.png`;
    const {error}=await supa.storage.from("photos").upload(path,blob,{contentType:blob.type||"image/png",upsert:true});
    if(error){ phLog("envoi refusé ("+id+") : "+(error.message||error)); throw error; }
    const nref="sb:"+path; delete MEM[ref]; await idb.put(nref,blob).catch(()=>{}); URLS[nref]=URLS[ref]; it[side]=nref; psRename(ref,nref);
    if(DIRTY[id]&&DIRTY[id]["="+side]===ref){ DIRTY[id]["="+side]=nref; ls.set("nico_dirty",DIRTY); }
  }
}
async function flush(){
  if(!UID||syncing) return; const q=Q(); const ids=Object.keys(q); if(!ids.length){ setSync("ok","Tout est sauvegardé en ligne"); return; }
  if(!navigator.onLine){ setSync("wait","Hors ligne : enregistré sur le téléphone, envoi au retour du réseau"); return; }
  syncing=true; setSync("wait","Sauvegarde en cours…"); let failed=false;
  try{
    for(const id of ids){
      if(id==="_prefs"){ const {error}=await supa.from("collection").upsert({user_id:UID,token_id:"_prefs",data:{...S.prefs,seeded:true},updated_at:new Date().toISOString()}); if(error) throw error; }
      else {
        const v0=DV[id]||0;
        await uploadPending(id); persistLocal();
        let data;
        if(DIRTY[id]){
          const {data:row,error:e1}=await supa.from("collection").select("data").eq("token_id",id).maybeSingle(); if(e1) throw e1;
          data=applyDirty(row&&row.data, DIRTY[id]); if(S.custom[id]) data._custom=S.custom[id];
        } else { data={...(S.items[id]||{})}; if(S.custom[id]) data._custom=S.custom[id]; }
        const hasCustom=!!data._custom, item={...data}; delete item._custom;
        if(emptyItem(item)&&!hasCustom){ const {error}=await supa.from("collection").delete().eq("token_id",id); if(error) throw error; }
        else { const {error}=await supa.from("collection").upsert({user_id:UID,token_id:id,data,updated_at:new Date().toISOString()}); if(error) throw error; }
        if((DV[id]||0)!==v0) continue; // modifié pendant l'envoi : on le garde dans la file, il repart au tour suivant
        delete DIRTY[id]; ls.set("nico_dirty",DIRTY);
        if(emptyItem(item)) delete S.items[id]; else S.items[id]=item;
        if(hasCustom) S.custom[id]=data._custom; persistLocal();
      }
      const cur=Q(); delete cur[id]; ls.set("nico_queue",cur);
    }
    setSync("ok","Tout est sauvegardé en ligne");
  }catch(e){ console.warn(e); failed=true; setSync("off","Envoi impossible pour l'instant, nouvel essai automatique"); clearTimeout(retryTimer); retryTimer=setTimeout(flush,30000); }
  finally{ syncing=false; if(!failed&&Object.keys(Q()).length) setTimeout(flush,800); }
}
// le serveur renvoie au maximum 1000 lignes par demande : on lit la collection page par page
async function fetchAll(){
  const all=[], N=1000;
  for(let from=0;;from+=N){
    const {data,error}=await supa.from("collection").select("token_id,data").order("token_id").range(from,from+N-1);
    if(error) return {data:null,error};
    all.push(...(data||[])); if(!data||data.length<N) return {data:all,error:null};
  }
}
let PULLING=false;
async function pull(){
  if(!UID) return;
  if(syncing){ setTimeout(pull,1500); return; }
  if(PULLING) return; PULLING=true;
  try{ await pullOnce(); }finally{ PULLING=false; }
}
async function pullOnce(){
  const t0=Date.now();
  let data=null, error=null;
  try{ ({data,error}=await fetchAll()); }catch(e){ error=e; }
  if(error){ setSync("off","Serveur injoignable : tu travailles sur la copie du téléphone");
    bootDone(navigator.onLine?"Le serveur ne répond pas : tu vois la copie du téléphone, nouvel essai automatique.":"Pas de réseau : tu vois la copie du téléphone. Tes coches partiront au retour du réseau.");
    // une connexion faible fait souvent échouer une seule tentative : on réessaie 2 fois avant d'afficher le bandeau
    PULLFAIL++; if(PULLFAIL<3){ setTimeout(pull,15000); return; }
    if(navigator.onLine){ ALERT.server="Le serveur de sauvegarde ne répond pas (peut-être en pause). Tes coches restent sur le téléphone."; showAlert(); }
    return; }
  PULLFAIL=0;
  if(ALERT.server){ ALERT.server=""; showAlert(); }
  const items={}, custom={}; let prefs=null;
  const raw={};
  data.forEach(r=>{ raw[r.token_id]=r.data; if(r.token_id==="_prefs"){ prefs=r.data; return; } const d={...r.data}; if(d._custom){ custom[r.token_id]=d._custom; delete d._custom; } if(Object.keys(d).length) items[r.token_id]=d; });
  const q=Q(); Object.keys(EDIT).forEach(id=>{ if(EDIT[id]>=t0-2000) q[id]=1; });
  Object.keys(q).forEach(id=>{ if(id==="_prefs") return;
    if(DIRTY[id]){ const m=applyDirty(raw[id],DIRTY[id]); const c=m._custom; delete m._custom;
      if(emptyItem(m)) delete items[id]; else items[id]=m; if(c) custom[id]=c; else if(!S.custom[id]) delete custom[id]; else custom[id]=S.custom[id]; return; }
    if(S.items[id]) items[id]=S.items[id]; else delete items[id]; if(S.custom[id]) custom[id]=S.custom[id]; else delete custom[id]; });
  Object.entries(S.items).forEach(([id,u])=>{ if(q[id]||!u) return; ["f","b"].forEach(k=>{ const srv=items[id]||{};
    if(u[k]&&!srv[k]&&!(REMOVED[id+k]>Date.now()-864e5)){ items[id]={...srv,[k]:u[k]}; const c=Q(); c[id]=1; ls.set("nico_queue",c); phLog("photo gardée (le serveur ne l'avait pas) : "+id); } }); });
  if(!(prefs&&prefs.seeded) && !q._prefs && !(ls.get("nico_prefs")||{}).seeded && !Object.keys(raw).length){
    // premier lancement : on reprend ce qui avait été coché localement + les variantes vertes du tableau de Nico
    Object.assign(items,S.items); Object.assign(custom,S.custom); applyPreset(items);
    S.items=items; S.custom=custom; persistLocal();
    Object.keys(items).concat(Object.keys(custom)).forEach(id=>{ const c=Q(); c[id]=1; ls.set("nico_queue",c); });
    queue("_prefs");
  } else { S.items=items; S.custom=custom; persistLocal(); }
  S.prefs={...(ls.get("nico_prefs")||{}),...(prefs||{}),...S.prefs,seeded:true}; upgrade();
  render();
  if(BOOT&&Object.keys(Q()).length){ bootMsg("Envoi de tes dernières coches…"); await flush(); } else flush();
  bootDone();
}

/* ---------- bandeau d'alerte (bilan du robot Supabase + serveur injoignable) ---------- */
const ALERT={robot:"",server:""}; let PULLFAIL=0;
function showAlert(){ const el=$("#alert"); const m=ALERT.server||ALERT.robot; el.hidden=!m; el.textContent=m?"⚠️ "+m+" Préviens Alex.":""; }
async function checkRobot(){
  try{
    const r=await fetch("status.json",{cache:"no-cache"}); if(!r.ok) return; const s=await r.json();
    const days=Math.floor((Date.now()-Date.parse(s.date))/864e5);
    if(s.server&&s.server!=="ok") ALERT.robot="Le serveur de sauvegarde est en pause ou ne répond plus. Tes coches restent sur le téléphone.";
    else if(s.token==="expired") ALERT.robot="Le robot de sauvegarde a un souci : sa clé Supabase ne marche plus.";
    else if(days>=3) ALERT.robot=`Le robot de sauvegarde n'est pas passé depuis ${days} jours.`;
    else ALERT.robot="";
    showAlert();
  }catch(e){}
}

/* ---------- mises à niveau uniques (après synchro) ---------- */
function upgrade(){
  let changed=false; const mark=id=>{ const c=Q(); c[id]=1; ls.set("nico_queue",c); };
  // 1) anciennes fiches remplacées par le catalogue CJT : si Nico y avait coché quelque chose, on garde la fiche en « pièce ajoutée »
  Object.keys(S.items).forEach(id=>{ if(LEGACY[id]&&!byId(id)){ const L=LEGACY[id]; S.custom[id]={id,cat:L.cat,name:L.name,ref:L.ref,years:L.years,note:"Ancienne fiche de l'appli"}; mark(id); changed=true; } });
  // 1 bis) remise à zéro demandée (une seule fois par numéro) : toutes les quantités à 0.
  //        Photos, Hugo, pièces ajoutées et déplacements sont gardés ; une copie des quantités est gardée dans les préférences (pour pouvoir annuler).
  if(RESET_OWN && S.prefs.reset!==RESET_OWN){
    const backup={};
    Object.entries(S.items).forEach(([id,u])=>{ if(u.q||u.vq){ backup[id]={q:u.q||0,vq:u.vq||null};
      const cur={...u}; delete cur.q; delete cur.vq; S.items[id]=cur;
      if(!cur.xv&&!cur.hv&&!cur.f&&!cur.b&&!cur.mv&&!cur.pv) delete S.items[id];
      mark(id); } });
    S.prefs["backup_"+RESET_OWN]=backup; S.prefs.reset=RESET_OWN; S.prefs.cjt1=true; ls.set("nico_prefs",S.prefs); mark("_prefs"); changed=true;
  }
  // 1 ter) une seule fois : toutes les photos de dos prises par Nico sont retirées (demande du 07/11/2026)
  if(RESET_BACK && S.prefs.rb!==RESET_BACK){
    Object.entries(S.items).forEach(([id,u])=>{ if(u.b){ const cur={...u}; delete cur.b; if(!Object.keys(cur).length) delete S.items[id]; else S.items[id]=cur; mark(id); } });
    S.prefs.rb=RESET_BACK; ls.set("nico_prefs",S.prefs); mark("_prefs"); changed=true;
  }
  // 2) une seule fois : on coche ce que Nico a marqué « Possédé » sur son compte CJT (sans rien décocher)
  if(IMPORT_CJT && !S.prefs.cjt1){
    Object.entries(CJT_OWN).forEach(([id,vq])=>{ const t=byId(id); if(!t) return; const cur=S.items[id]||{};
      if(t.v){ const nv={...vq,...(cur.vq||{})}; S.items[id]={...cur,vq:nv}; } else if(!cur.q){ S.items[id]={...cur,q:vq._||1}; }
      mark(id); });
    S.prefs.cjt1=true; ls.set("nico_prefs",S.prefs); mark("_prefs"); changed=true;
  }
  if(changed){ persistLocal(); setTimeout(flush,300); }
}

/* ---------- rendu ---------- */
/* ---------- mosaïque par année ---------- */
const ICON_GRID='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2.6"/><circle cx="12" cy="6" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="12" cy="12" r="2.6"/><circle cx="18" cy="12" r="2.6"/><circle cx="6" cy="18" r="2.6"/><circle cx="12" cy="18" r="2.6"/><circle cx="18" cy="18" r="2.6"/></svg>';
const ICON_LIST='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
function yearOf(t){ const y=parseInt(String(t.years||""),10); return isNaN(y)?"":String(y); }
function letterOf(t){ const c=String(t.name||"").normalize("NFD").replace(/[̀-ͯ]/g,"").trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c)?c:"#"; }
/* Règle auto : <10 pièces = pas de mosaïque ; >=80 % sur une même année = par lettre ; sinon par année */
function mosaicMode(pool){
  if(!pool.length) return null;
  const cnt={}; pool.forEach(t=>{ const y=yearOf(t)||"?"; cnt[y]=(cnt[y]||0)+1; });
  return Math.max(...Object.values(cnt))/pool.length>=0.8 ? "letter" : "year";
}
/* boutons par année (Disney, Beauval) : toutes les pièces frappées cette année-là, refrappes comprises */
function isYrCat(){ return S.cat==="disney"||S.cat==="beauval"; }
function yrsOf(t){ return [...new Set(eff(t).us.map(x=>String(x.y)).filter(Boolean))]; }
function yrChips(){
  if(!isYrCat()) return "";
  const pool=allTokens().filter(t=>inCat(t,S.cat)), ys=[...new Set(pool.flatMap(yrsOf))].filter(y=>/^\d{4}$/.test(y)).sort((a,b)=>b-a);
  if(ys.length<2) return "";
  const n=y=>pool.filter(t=>yrsOf(t).includes(y)).length;
  return `<div class="yrchips" role="tablist" aria-label="Année">`+[["","Toutes",pool.length],...ys.map(y=>[y,y,n(y)])].map(([y,l,c])=>`<button class="yrchip${(S.yr||"")===y?" on":""}" data-yr="${y}" role="tab" aria-selected="${(S.yr||"")===y}"><b>${l}</b><small>${c}</small></button>`).join("")+`</div>`;
}
function mosaicHTML(list,mode){
  if(!list.length) return yrChips()+`<div class="empty">Aucune médaille ne correspond${S.filter?" avec ce filtre":""}.</div>`;
  const byL=mode==="letter", none=byL?"#":"Sans année", groups=new Map();
  list.forEach(t=>{ const k=byL?letterOf(t):(S.yr||yearOf(t)||none); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(t); });
  const keys=[...groups.keys()].sort((a,b)=>(a===none)-(b===none)||(byL?a.localeCompare(b):b.localeCompare(a))); // années : les plus récentes en haut
  const idx=byL?`<nav class="mabc">${keys.map(k=>`<button data-ml="ml-${k==="#"?"0":k}">${esc(k)}</button>`).join("")}</nav>`:"";
  // une ligne par année : étiquette à gauche (année + compte), pièces à droite
  return yrChips()+`<p class="mhint">Touche une pièce pour ouvrir sa fiche, ou ${byL?"une lettre":"une année"} pour la voir dans la liste.</p>`+idx+keys.map(k=>{
    const ts=groups.get(k), own=ts.filter(t=>eff(t).qty>0).length;
    return `<section class="mrow"${byL?` id="ml-${k==="#"?"0":k}"`:""}><button class="mlab${own===ts.length?" full":""}" data-j${byL?"l":"y"}="${esc(k)}" aria-label="${esc(k)} : ${own} sur ${ts.length} possédée${own>1?"s":""}"><b>${esc(k==="Sans année"?"?":k)}</b><small>${own}/${ts.length}</small></button><div class="mgrid four">${ts.map(mtileHTML).join("")}</div></section>`; }).join("");
}
function mtileHTML(t){
  const e=eff(t), np=PHOTOS[t.id]||{}, own=e.qty>0, pend=!own&&units(t).some(x=>x.p);
  let img="";
  if(e.f) img=`<img src="${esc(ownSrc(e.f))}" data-ph="${esc(e.f)}" alt="" loading="lazy">`;
  else if(np.f&&!(st(t.id).hide||{}).f) img=`<img src="${esc(String(np.f.src).replace("-original.jpg","-180.jpg"))}" alt="" loading="lazy">`;
  const short=esc(String(t.name).replace(/^(Disneyland( Resort)? Paris|ZooParc de Beauval)\s*[-–:]?\s*/i,"").slice(0,28));
  return `<button class="mtile${own?" own":""}${pend?" pend":""}" data-jt="${t.id}" aria-label="${esc(t.name)}${own?" (possédée)":pend?" (en attente)":" (manquante)"}">${img||`<span class="mph">${short}</span>`}${own?'<span class="mok">✓</span>':pend?'<span class="mok mpend">⏳</span>':""}</button>`;
}
let KEEPY=false, moreObs=null, LASTTAP={};
function watchMore(){ if(moreObs) moreObs.disconnect(); const b=$("#moreBtn"); if(!b||!("IntersectionObserver" in window)) return;
  moreObs=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ moreObs.disconnect(); showMore(); } },{rootMargin:"600px"}); moreObs.observe(b); }
function showMore(){ S.shown+=PAGE; KEEPY=true; render(); }
// ré-affichage après un clic : on garde le nombre de pièces affichées et la position
function rerender(){ KEEPY=true; render(); }
function jumpTo(pred){
  S.mosaic=false; render();
  const i=(S.list||[]).findIndex(pred); if(i<0) return;
  if(i>=S.shown){ S.shown=i+PAGE; render(); }
  const sel=`article.card[data-id="${CSS.escape(S.list[i].id)}"]`;
  requestAnimationFrame(()=>{ const el=document.querySelector(sel); if(!el) return;
    const top=el.getBoundingClientRect().top+scrollY-($(".top").offsetHeight+12); scrollTo({top,behavior:"instant"});
    el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1600); });
}
function saveView(){ ls.set("nico_view",{cat:S.cat,mosaic:!!S.mosaic,add:!!S.addOpen,piece:PIECE||null,q:S.q||"",hq:S.homeQ||"",t:Date.now()}); }
function render(){ renderMain(); if(PIECE&&$("#sheet .piece")) renderPiece(); saveView(); setTimeout(retryPhotos,50); }
function renderMain(){
  $("#backBtn").hidden=!S.cat&&!S.near;
  const pool0=S.cat?allTokens().filter(t=>inCat(t,S.cat)):[], mmode=S.cat?mosaicMode(pool0):null;
  if(!mmode) S.mosaic=false;
  const mb=$("#mosaicBtn"); mb.hidden=!mmode; const mos=!!(mmode&&S.mosaic);
  mb.setAttribute("aria-pressed",String(mos)); mb.setAttribute("aria-label",mos?"Revenir à la liste":(mmode==="letter"?"Voir en mosaïque par lettre":"Voir en mosaïque par année"));
  mb.innerHTML=mos?ICON_LIST:ICON_GRID;
  $("#title").textContent=S.cat?(isVirtual(S.cat)?catOf(S.cat).name.replace("de l'année",NEWY):catOf(S.cat).name):"Médaillier de Nico";
  const cc=S.cat?catOf(S.cat):null;
  $("#crumb").textContent=S.cat?(cc.dep&&/^\d|^2[AB]/.test(cc.num||"")&&cc.id!=="dom"?"Département "+cc.num:(cc.dep?"Catégorie":"Thème")):"Jetons Monnaie de Paris";
  $("#q").placeholder=S.cat?(catOf(S.cat).dep?"Chercher dans ce département…":"Chercher dans ce thème…"):"Code, nom, lieu ou département…";
  document.querySelectorAll(".chip[data-f]").forEach(b=>b.setAttribute("aria-pressed",String(S.filter===b.dataset.f)));
  $("#clearF").hidden=!S.filter;
  const v=$("#view");
  if(S.near){ $("#title").textContent="Autour de moi"; $("#crumb").textContent="Pièces vendues près d'ici"; mb.hidden=true; v.innerHTML=nearHTML(); renderFoot(allTokens().filter(t=>geoOf(t.id)&&(S.nearY!=="rec"||recentUnits(t).length)),"Pièces sur la carte"); return; }
  if(!S.cat && !S.q){ v.innerHTML=homeHTML(); renderFoot(allTokens(),"Toute la collection"); return; }
  const pool=allTokens().filter(t=>(!S.cat||inCat(t,S.cat))&&(!S.yr||!isYrCat()||yrsOf(t).includes(S.yr)));
  const srt=mmode==="letter"?((a,b)=>a.name.localeCompare(b.name,"fr")):((a,b)=>String(b.years).localeCompare(String(a.years))||a.name.localeCompare(b.name)); // plus récentes d'abord
  let list, APPROX=false;
  if(!S.q) list=pool.filter(passFilter).sort(srt);
  else { const sc=new Map(); pool.forEach(t=>{ if(passFilter(t)) sc.set(t,score(t,S.q)); });
    list=[...sc].filter(([,v])=>v>=1).sort((a,b)=>b[1]-a[1]||srt(a[0],b[0])).map(([t])=>t);
    if(!list.length&&words(S.q).length>1){ APPROX=true; // aucun résultat exact : les plus proches d'abord
      list=[...sc].filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]||srt(a[0],b[0])).map(([t])=>t).slice(0,120); } }
  S.approx=APPROX;
  if(mos&&!S.addOpen){ v.innerHTML=mosaicHTML(list,mmode); renderFoot(pool,"Total "+catOf(S.cat).name); return; }
  if(!S.cat&&S.q){ const dm=matchDeps(S.q).map(c=>c.id); if(dm.length){ const first=t=>dm.includes(catT(t))||(t.dept&&dm.includes("d"+t.dept))?0:1; list.sort((a,b)=>first(a)-first(b)); } } // pièces du département tapé en premier
  const vk=[S.cat,S.q,S.filter,S.yr].join("§"); if(vk!==VIEWKEY){ VIEWKEY=vk; S.shown=PAGE; }
  S.list=list; const part=list.slice(0,S.shown), rest=list.length-part.length;
  let h="";
  if(!S.cat){ const dm=matchDeps(S.q); if(dm.length) h+=`<p class="sect-title">Département${dm.length>1?"s":""}</p><div class="deps">${depTiles(dm,groupByCat())}</div>`;
    h+=`<p class="sect-title">${S.approx?"Rien d'exact — pièces les plus proches":`${list.length} pièce${list.length>1?"s":""} trouvée${list.length>1?"s":""}`}</p>`; }
  h+=yrChips();
  h+= list.length?`<div class="list">${part.map(cardHTML).join("")}</div>${rest>0?`<button class="addbtn more" id="moreBtn">Afficher la suite (${rest} pièce${rest>1?"s":""})</button>`:""}`:`<div class="empty">Aucune médaille ne correspond${S.filter?" avec ce filtre":""}.</div>`;
  if(S.cat&&!isVirtual(S.cat)) h+=S.addOpen?`<div id="addPanel">${addFormHTML()}</div>`:`<button class="addbtn" id="addBtn">+ Ajouter une médaille absente du catalogue</button><div id="addPanel"></div>`;
  const y0=scrollY; v.innerHTML=h; if(KEEPY){ scrollTo(0,y0); KEEPY=false; }
  bindAdd();
  watchMore();
  renderFoot(S.cat?pool:list, S.cat?"Total "+catOf(S.cat).name:"Total des résultats");
}
function catMeta(all){ const l=S.filter?all.filter(passFilter):all, s=stats(all), pct=s.total?Math.round(s.own/s.total*100):0;
  return {l,s,pct,f:S.filter?`<span class="meta">${l.length} jeton${l.length>1?"s":""} ${({own:"possédé",missing:"avec un manque",dup:"avec doublon",hugo:"avec Hugo",pend:"en attente"})[S.filter]}${l.length>1&&S.filter==="own"?"s":""}</span>`:""}; }
function groupByCat(){ const g={}; allTokens().forEach(t=>{ const k=catT(t); (g[k]=g[k]||[]).push(t); }); return g; }
// ronds des départements (accueil et recherche) : blason en transparence sous le numéro, anneau = progression
function depTiles(cats,groups){ return cats.map(c=>{ const all=groups[c.id]||[]; if(!all.length) return ""; const m=catMeta(all); if(S.filter&&!m.l.length) return "";
  return `<button class="dep" data-cat="${c.id}" style="--c1:${c.c1};--c2:${c.c2};--p:${m.pct}" aria-label="${esc(c.num)} ${esc(c.name)} : ${m.s.own} sur ${m.s.total} possédées"><span class="dnum"><b>${esc(c.num)}</b></span><span class="dname">${esc(c.name)}</span></button>`; }).join(""); }
// « 77 », « 7 », « 2a », « seine »… -> départements dont le numéro ou le nom correspond
function matchDeps(q){ const n=norm(q).trim(); if(!n) return [];
  const num=/^\d{1,3}$|^2[ab]$/.test(n);
  return CATS.filter(c=>c.dep&&c.num&&(num?(n.length>=2?String(c.num).toLowerCase()===n:(c.num==="0"+n||String(c.num).startsWith(n))):n.length>=3&&norm(c.name).includes(n))); }
// un filtre actif cache des départements : on le dit clairement, avec un bouton pour tout revoir
function hiddenNote(groups){ if(!S.filter) return "";
  const all=CATS.filter(c=>c.dep&&(groups[c.id]||[]).length), shown=all.filter(c=>groups[c.id].some(passFilter)).length, hid=all.length-shown;
  if(!hid) return "";
  const lab=({own:"Possédées",missing:"Manquantes",dup:"Doublons",hugo:"Hugo",pend:"En attente"})[S.filter]||S.filter;
  return `<div class="fnote">Filtre « ${esc(lab)} » actif : ${hid} département${hid>1?"s":""} masqué${hid>1?"s":""}. <button class="linkbtn" id="clearF2">Voir tous les départements</button></div>`; }
/* ---------- autour de moi (pièces récentes géolocalisées par le robot : geo.json) ---------- */
let GEO={}, NEAR=null; const NEAR_Y=["2025","2026","2027"];
const BANDS=[[1.5,"🚶 À pied","moins de 1,5 km"],[8,"🚗 Moins de 10 min en voiture","moins de 8 km"],[30,"🚗 Un peu plus loin","8 à 30 km"],[80,"🛣️ Sortie à la journée","30 à 80 km"]];
const RADII=[[2,"2 km","à pied"],[10,"10 km","vite fait"],[30,"30 km","en voiture"],[80,"80 km","la journée"]];
async function loadGeo(){
  const get=async f=>{ try{ const r=await fetch(f,{cache:"no-cache"}); return r.ok?await r.json():{}; }catch(e){ return {}; } };
  const [a,b]=await Promise.all([get("geo.json"),get("geo-old.json")]); GEO={...b,...a}; }
function kmTo(a,b,c,d){ const R=6371,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b),h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
function fmtKm(k){ return k<1?Math.max(50,Math.round(k*1000/50)*50)+" m":(k<10?k.toFixed(1).replace(".",","):Math.round(k))+" km"; }
function locate(){ if(!navigator.geolocation){ NEAR={err:"Ton téléphone ne donne pas sa position à l'appli."}; render(); return; }
  NEAR={wait:true}; render();
  navigator.geolocation.getCurrentPosition(p=>{ NEAR={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,t:Date.now()}; if(S.near) render(); },
    e=>{ NEAR={err:e.code===1?"refus":"Position introuvable pour l'instant (pas de signal GPS ?)."}; if(S.near) render(); },
    {enableHighAccuracy:true,timeout:20000,maximumAge:60000}); }
// variantes récentes d'une pièce (2025-2027) et celles qui manquent
function recentUnits(t){ return units(t).filter(x=>NEAR_Y.includes(String(x.y))); }
function nearHTML(){
  if(!Object.keys(GEO).length) return `<div class="empty">La carte des pièces n'est pas encore prête. Réessaie dans un moment.</div>`;
  if(!NEAR||NEAR.wait) return `<div class="empty">📍 Recherche de ta position…<br><small>Si le téléphone te demande l'autorisation de localisation, accepte.</small></div>`;
  if(NEAR.err) return `<div class="empty">${NEAR.err==="refus"?`L'appli n'a pas le droit de connaître ta position.<br><small>Sur le téléphone : touche le petit cadenas (ou ⓘ) à gauche de l'adresse du site → <b>Autorisations</b> → <b>Position</b> → <b>Autoriser</b>. Puis reviens ici.</small>`:esc(NEAR.err)}<br><button class="addbtn" id="nearRetry">Réessayer</button></div>`;
  const places=new Map(), R=S.nearR||10, rec=S.nearY==="rec"; let gone=0;
  allTokens().forEach(t=>{ const g=geoOf(t.id); if(!g) return; const ru=rec?recentUnits(t):units(t); if(!ru.length) return;
    const miss=ru.some(x=>!(x.q>0)); if(!S.nearAll&&!miss) return;
    if(st(t.id).ns){ if(kmTo(NEAR.lat,NEAR.lon,g[0],g[1])<=R) gone++; return; }
    const k=g[0]+","+g[1]; if(!places.has(k)) places.set(k,{lat:g[0],lon:g[1],prec:g[2],label:g[3]||"",ts:[],d:kmTo(NEAR.lat,NEAR.lon,g[0],g[1])});
    places.get(k).ts.push(t); });
  const all=[...places.values()].sort((a,b)=>a.d-b.d), inR=all.filter(p=>p.d<=R);
  const chips=`<div class="nchips" role="tablist" aria-label="Distance">${RADII.map(([r,l,sub])=>`<button class="nchip${r===R?" on":""}" data-nr="${r}" role="tab" aria-selected="${r===R}"><b>${l}</b><small>${sub}</small></button>`).join("")}</div>`;
  const tog=chips+`<div class="nbar"><span>${rec?"Pièces 2025-2027":"Toutes les années"}</span><button class="linkbtn" id="nearY">${rec?"Voir toutes les années":"Seulement 2025-2027"}</button></div>`
    +`<div class="nbar"><span>${S.nearAll?"Celles que tu as aussi":"Seulement celles qui te manquent"}</span><button class="linkbtn" id="nearAll">${S.nearAll?"Seulement les manquantes":"Voir aussi celles que tu as"}</button></div>`
    +`<p class="mhint">Distances à vol d'oiseau${NEAR.acc>300?` · position imprécise (± ${fmtKm(NEAR.acc/1000)})`:""}.${gone?` ${gone} pièce${gone>1?"s":""} signalée${gone>1?"s":""} plus en vente masquée${gone>1?"s":""}.`:""} <button class="linkbtn" id="nearRetry">Actualiser ma position</button></p>`;
  const place=p=>{ const note=p.prec==="o"?"≈ office de tourisme le plus proche":p.prec==="v"?"≈ centre de la ville":"";
    return `<section class="nplace"><div class="nhead"><div class="ninfo"><b>${esc(p.label||"Lieu de vente")}</b><small>${fmtKm(p.d)}${note?` · ${note}`:""} · ${p.ts.length} pièce${p.ts.length>1?"s":""}</small></div><a class="ngo" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}" target="_blank" rel="noopener">Y aller ↗</a></div><div class="mgrid four">${p.ts.map(mtileHTML).join("")}</div></section>`; };
  let h=tog, prev=0, shown=0; const LIM=S.nearMore?400:40;
  BANDS.forEach(([max,lab,sub])=>{ if(prev>=R||shown>=LIM) return; const top=Math.min(max,R); const ps=inR.filter(p=>p.d>prev&&p.d<=top||(prev===0&&p.d===0)); prev=max; if(!ps.length) return;
    const take=ps.slice(0,LIM-shown); shown+=take.length;
    h+=`<p class="sect-title">${lab} <small class="nsub">${max>R?"jusqu'à "+R+" km":sub}</small></p>`+take.map(place).join(""); });
  if(inR.length>shown) h+=`<button class="addbtn" id="nearMore">Voir les ${inR.length-shown} autres lieux</button>`;
  if(!inR.length){ h+=`<div class="empty">Aucune pièce à moins de ${R} km${rec?" pour 2025-2027":""}.${R<80?" Essaie une distance plus grande.":""}</div>`;
    const far=all.slice(0,5); if(far.length) h+=`<p class="sect-title">Les plus proches quand même</p>`+far.map(place).join(""); }
  return h; }
function homeHTML(){
  const groups=groupByCat();
  const big=CATS.filter(c=>!c.dep).map(c=>{ const all=groups[c.id]||[]; const m=catMeta(all);
    return `<button class="cat${c.star?" star":""}" data-cat="${c.id}" style="--c1:${c.c1};--c2:${c.c2}">
      ${c.star?'<span class="badge-star">Objectif</span>':""}
      <span class="medal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg></span>
      <b>${esc(c.name)}</b>
      <span class="meta">${m.s.own} / ${m.s.total} ${all.some(t=>t.v)?"variantes possédées":"possédées"}</span>${m.f}
      <span class="bar"><i style="width:${m.pct}%"></i></span></button>`; }).join("");
  const deps=depTiles(CATS.filter(c=>c.dep),groups);
  return `<p class="sect-title">Thèmes</p><div class="cats">${big}</div>
    <button class="nearbtn" id="nearBtn"><span>📍</span><b>Autour de moi</b><small>Pièces vendues près d'ici, de 2 à 80 km</small></button>
    <p class="sect-title">Départements</p>${hiddenNote(groups)}<div class="deps">${deps||'<div class="empty">Aucun département avec ce filtre.</div>'}</div>
    <button class="addbtn" id="helpBtn">💡 Astuces : déplacer une pièce mal rangée…</button>
    <p class="status">Catalogue mis à jour le ${esc(CATALOG_DATE)} · ${CATALOG.length} médailles${Object.keys(S.custom).length?` + ${Object.keys(S.custom).length} ajoutées par toi`:""} · Liste : catalogue CJT de Nico${CJT_DATE?` (${esc(CJT_DATE)})`:""} · Photos : Numista (licences Creative Commons) · Disney : liste de Nico</p>`;
}
function faceHTML(t,side,src,ph){
  const lbl=side==="f"?"Face":"Dos";
  return `<button class="face" ${src?`data-zoom="${t.id}"`:`data-photo="${t.id}"`} data-side="${side}" aria-label="${src?"Voir en grand":"Ajouter"} la photo ${lbl} de ${esc(t.name)}"><span class="lbl">${lbl}</span>${
    src?`<img src="${esc(src)}"${ph?` data-ph="${esc(ph)}"`:""} alt="${lbl} – ${esc(t.name)}" loading="lazy">`:`<span class="ph"><span class="blank"></span>Ta photo (facultatif)</span>`}</button>`;
}
function variantsHTML(t,e){
  const own=e.us.filter(x=>x.q>0).length, n=e.us.length;
  const rows=e.us.map(x=>{ const key=t.id+"~"+x.k;
    const pend=x.q<=0&&x.p;
    return `<div class="vrow${x.q>0?" on":""}${pend?" pend":""}"><button class="vtog" data-vt="${esc(key)}"${x.added?' data-xa="1"':""} aria-pressed="${x.q>0}"><span class="dot">${x.q>0?"✓":pend?"⏳":""}</span>${pend?'<span class="vpend">En attente</span>':""}${x.y||x.r?`${x.y?`<span class="vy">${x.y}</span>`:""}${x.r?`<span class="vr">${esc(x.r)}</span>`:""}`:`<span class="vr">Sans année</span>`}</button>
      <div class="stepper sm"><button data-vd="${esc(key)}" aria-label="Retirer une">−</button><span>${x.q}</span><button data-vi="${esc(key)}" aria-label="Ajouter une">+</button></div>${hugoBtn(t,x.k)}</div>`; }).join("");
  const addY=`<button class="addyr" data-ay="${t.id}">+ Ajouter une année ou un revers</button>`;
  if(n===1) return `<div class="vars single"><div class="vlist">${rows}${addY}</div></div>`; // une seule ligne : pas de menu à ouvrir
  return `<details class="vars"${OPEN.has(t.id)?" open":""} data-vid="${t.id}"><summary><b>${own} / ${n}</b> variante${n>1?"s":""} possédée${n>1?"s":""} <span class="chev">▾</span></summary><div class="vlist">${rows}${addY}</div></details>`; }
const OPEN=new Set();
// Case « Hugo » : simple info cochée par ligne (variante ou pièce), sans effet sur les totaux de Nico
function hugoBtn(t,k){ const on=!!((st(t.id).hv||{})[k]); return `<button class="hugo${on?" on":""}" data-hu="${esc(t.id+"~"+k)}" role="switch" aria-checked="${on}" aria-label="Hugo"><span class="htxt">Hugo</span><span class="hknob"></span></button>`; }
function cjtUrl(t){ const m=/[A-Z]{2}[0-9AB]{2}-(\d{4})/.exec(t.ref||""); return m?"https://www.collection-jetons-touristiques.com/jeton/"+parseInt(m[1],10):""; }
/* lieu de vente d'une pièce récente (geo.json : lat, lon, précision, nom, adresse) */
const WOPEN=new Set(); let INSHEET=false;
// lieu de vente : celui indiqué par Nico (loc) passe avant celui trouvé par le robot
function geoOf(id){ const l=st(id).loc; return l?[l[0],l[1],"u",l[2],l[3]]:GEO[id]; }
function whereHTML(t){
  const g=geoOf(t.id);
  if(!g) return INSHEET?`<div class="where"><div class="wbody wnone"><b>📍 Où l'acheter</b><div class="wnote">Lieu de vente inconnu pour cette pièce.</div><button class="wgo" type="button" data-wedit="${t.id}">➕ Indiquer où elle est vendue</button></div></div>`:"";
  const [lat,lon,prec,label,addr]=g, open=INSHEET||WOPEN.has(t.id), ns=st(t.id).ns;
  const note=prec==="u"?"Lieu indiqué par toi":prec==="o"?"Office de tourisme le plus proche — en général, il vend les pièces de la ville":prec==="v"?"Position approximative : centre de la ville":"";
  const dist=NEAR&&NEAR.lat?` · à ${fmtKm(kmTo(NEAR.lat,NEAR.lon,lat,lon))}`:"";
  const name=label||"Lieu de vente", dl=0.0035;
  const gone=ns?`<div class="wgone">⚠️ Signalée <b>plus en vente ici</b> le ${new Date(ns).toLocaleDateString("fr-FR")}. <button class="linkbtn" type="button" data-nsundo="${t.id}">Annuler le signalement</button></div>`:"";
  return `${gone}<div class="where${open?" open":""}${ns?" gone":""}">${ns?`<div class="tape" aria-hidden="true"><span>PLUS EN VENTE ICI · PLUS EN VENTE ICI · PLUS EN VENTE ICI</span></div>`:""}<button class="wtog" type="button" data-where="${t.id}"><span>📍</span><b>Où l'acheter</b><small>${ns?"⚠️ plus en vente · ":""}${esc(name)}${dist}</small><i>${open?"▴":"▾"}</i></button>${open?`
    <div class="wbody"><div class="wname">${esc(name)}</div>${addr?`<div class="waddr">${esc(addr)}</div>`:""}${note?`<div class="wnote">${note}</div>`:""}
    <iframe class="wmap" loading="lazy" title="Plan" src="https://www.openstreetmap.org/export/embed.html?bbox=${lon-dl*1.6},${lat-dl},${lon+dl*1.6},${lat+dl}&layer=mapnik&marker=${lat},${lon}"></iframe>
    <div class="wbtns"><a class="wgo main" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" rel="noopener">🧭 Y aller avec Google Maps</a><button class="wgo" type="button" data-wcopy="${t.id}">Copier l'adresse</button></div>
    <div class="wbtns">${ns?"":`<button class="wbad" type="button" data-ns="${t.id}">🚫 Plus en vente ici</button>`}<button class="wbad" type="button" data-wedit="${t.id}">✏️ Pas le bon endroit / vendue ailleurs</button>${prec==="u"&&GEO[t.id]?`<button class="wbad" type="button" data-wreset="${t.id}">↩︎ Remettre le lieu proposé</button>`:""}</div>
    <div class="wnote">Rien ne garantit qu'elle soit encore en vente. Mauvais endroit ou trouvée ailleurs ? Corrige le lieu : l'appli s'en souviendra.</div></div>`:""}</div>`;
}
function showEditPlace(id){
  const t=byId(id); if(!t) return; const sh=$("#sheet"), old=geoOf(id);
  const mates=old?allTokens().filter(x=>x.id!==id&&(g=>g&&g[0]===old[0]&&g[1]===old[1])(geoOf(x.id))):[];
  const back=()=>{ if(PIECE===id) renderPiece(); else { closeSheet(); rerender(); } };
  const save=(lat,lon,label,addr)=>{ sh.innerHTML=`<div class="in"><h2>Enregistrer ce lieu ?</h2><p><b>${esc(label)}</b>${addr?`<br>${esc(addr)}`:""}</p><p>Pour la pièce <b>${esc(t.name)}</b>.</p>
      ${mates.length?`<label class="check"><input type="checkbox" id="plAll"> Appliquer aussi aux ${mates.length} autre${mates.length>1?"s":""} pièce${mates.length>1?"s":""} placée${mates.length>1?"s":""} au même endroit (${esc(old[3]||"")})</label>`:""}
      <div class="row"><button class="btn" type="button" id="plOk">Oui, enregistrer</button><button class="btn ghost" type="button" id="plNo">Annuler</button></div></div>`;
    $("#plNo").onclick=back;
    $("#plOk").onclick=()=>{ const loc=[+(+lat).toFixed(5),+(+lon).toFixed(5),label,addr||""]; const ids=[id].concat($("#plAll")&&$("#plAll").checked?mates.map(x=>x.id):[]);
      ids.forEach(x=>patch(x,{loc,ns:""})); rerender(); back(); toast(ids.length>1?`Lieu mis à jour pour ${ids.length} pièces`:"Lieu de vente mis à jour"); }; };
  const addrOf=a=>{ a=a||{}; const street=[a.housenumber||a.house_number,a.street||a.road||a.pedestrian||a.square].filter(Boolean).join(" "), town=a.city||a.town||a.village||a.municipality||"";
    return [street,[a.postcode,town].filter(Boolean).join(" ")].filter(Boolean).join(", "); };
  sh.innerHTML=`<div class="in"><h2>Où est-elle vendue ?</h2><p class="note">${esc(t.name)}</p>
    <button class="btn" type="button" id="plHere">📍 Je suis sur place : utiliser ma position</button>
    <p class="note" style="margin-top:14px">Ou cherche le lieu (nom, ville ou adresse) :</p>
    <form id="plForm" class="row"><label class="field" style="flex:1"><input id="plQ" type="search" placeholder="ex. Office de tourisme de Cabourg" autocomplete="off" aria-label="Lieu à chercher"></label><button class="btn" type="submit">Chercher</button></form>
    <div id="plRes" class="plres"></div>
    <div class="row"><button class="btn ghost" type="button" id="plCancel">Annuler</button></div></div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; $("#plCancel").onclick=back;
  $("#plHere").onclick=()=>{ const b=$("#plHere"); b.disabled=true; b.textContent="Recherche de ta position…";
    navigator.geolocation.getCurrentPosition(async p=>{ const lat=p.coords.latitude, lon=p.coords.longitude; let label="", addr="";
      try{ const j=await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lon}`)).json(); label=j.name||""; addr=addrOf(j.address); }catch(e){}
      const nm=prompt2(label); save(lat,lon,nm||label||"Lieu de vente",addr); },
      ()=>{ b.disabled=false; b.textContent="📍 Je suis sur place : utiliser ma position"; toast("Position introuvable : autorise la localisation ou cherche le lieu"); },{enableHighAccuracy:true,timeout:20000}); };
  const prompt2=v=>v; // le nom proposé par la carte est gardé (modifiable plus tard en recommençant)
  $("#plForm").onsubmit=async ev=>{ ev.preventDefault(); const q=$("#plQ").value.trim(); if(q.length<3) return; const box=$("#plRes"); box.innerHTML='<p class="note">Recherche…</p>';
    const bias=NEAR&&NEAR.lat?`&lat=${NEAR.lat}&lon=${NEAR.lon}`:(old?`&lat=${old[0]}&lon=${old[1]}`:"");
    let res=[]; try{ const j=await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=fr${bias}`)).json();
      res=(j.features||[]).map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],label:f.properties.name||q,addr:addrOf(f.properties)})); }catch(e){}
    if(!res.length) try{ const j=await (await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`)).json();
      res=j.map(r=>({lat:+r.lat,lon:+r.lon,label:r.name||q,addr:addrOf(r.address)})); }catch(e){}
    box.innerHTML=res.length?res.map((r,i)=>`<button class="plhit" type="button" data-i="${i}"><b>${esc(r.label)}</b><small>${esc(r.addr||"")}</small></button>`).join(""):'<p class="note">Rien trouvé. Essaie avec la ville, ou « Je suis sur place ».</p>';
    box.querySelectorAll(".plhit").forEach(b=>b.onclick=()=>{ const r=res[+b.dataset.i]; save(r.lat,r.lon,r.label,r.addr); }); };
}
function showNotSold(id){
  const t=byId(id), g=geoOf(id); if(!t||!g) return; const sh=$("#sheet");
  const step1=()=>{ sh.innerHTML=`<div class="in"><h2>Plus en vente ici ?</h2><p>Es-tu sûr de vouloir indiquer que la pièce <b>${esc(t.name)}</b> n'est plus vendue à <b>${esc(g[3]||"cet endroit")}</b> ?</p>
    <div class="row"><button class="btn ghost" type="button" id="nsNo">Annuler</button><button class="btn" type="button" id="nsYes">Oui, elle n'est plus vendue</button></div></div>`;
    $("#nsNo").onclick=back; $("#nsYes").onclick=step2; };
  const step2=()=>{ sh.innerHTML=`<div class="in"><h2>Dernière vérification</h2><p>Tu confirmes ? La pièce n'apparaîtra plus dans « Autour de moi ». Tu pourras annuler plus tard depuis sa fiche.</p>
    <div class="row"><button class="btn ghost" type="button" id="nsNo">Non, je me suis trompé</button><button class="btn danger" type="button" id="nsOk">Je confirme</button></div></div>`;
    $("#nsNo").onclick=back; $("#nsOk").onclick=()=>{ patch(id,{ns:Date.now()}); rerender(); back(); toast("Signalé : plus en vente ici"); }; };
  const back=()=>{ if(PIECE===id) renderPiece(); else { closeSheet(); rerender(); } };
  sh.hidden=false; $("#sheetBg").hidden=false; step1();
}
function cjtLink(t){ const u=cjtUrl(t); return u?`<a class="nlink" href="${u}" target="_blank" rel="noopener">Fiche CJT ↗</a>`:""; }
function numUrl(t){ if(t.n) return "https://fr.numista.com/"+t.n;
  const m=/FR[0-9AB]{2}-\d{4}/.exec(t.ref||""); return "https://fr.numista.com/catalogue/index.php?ct=exonumia&r="+encodeURIComponent(m?m[0]:t.name); }
function picHTML(t,k,p){
  const lbl=k==="f"?"Face":"Dos";
  if(p&&p.own) return faceHTML(t,k,p.src,p.ph);
  if(!p) return faceHTML(t,k,null);   // pas de photo de ce côté : case pour mettre sa propre photo
  if(p) return `<button class="face npic" data-zoom="${t.id}" data-side="${k}" aria-label="Voir en grand la photo ${lbl} de ${esc(t.name)}"><span class="lbl">${lbl}</span><img src="${esc(p.src)}" alt="${lbl} – ${esc(t.name)}" loading="lazy"></button>`;
  return `<a class="face nmini" href="${numUrl(t)}" target="_blank" rel="noopener"><span class="lbl">${lbl}</span><span class="ph"><span class="blank"></span>Voir sur Numista ↗</span></a>`;
}
function backMini(t,p){
  return `<button class="backmini${p?" has":""}" ${p?`data-zoom="${t.id}"`:`data-photo="${t.id}"`} data-side="b" aria-label="${p?"Voir en grand":"Ajouter"} la photo du dos">${p?`<img src="${esc(p.src)}"${p.ph?` data-ph="${esc(p.ph)}"`:""} alt="Dos – ${esc(t.name)}">`:"<span>+<br>Dos</span>"}<small>Dos</small></button>`;
}
// petit rond « + » : prend la taille d'une pièce seulement quand une photo est mise
function plusMini(t,side,cls=""){ const l=side==="f"?"Face":"Dos";
  return `<button class="backmini${cls}" data-photo="${t.id}" data-side="${side}" aria-label="Ajouter la photo ${side==="f"?"de la face":"du dos"}"><span>+<br>${l}</span></button>`; }
// face uniquement (le dos n'est plus proposé) : petit rond « + Face » sans photo, grande photo quand elle est mise
function photoBlock(t,e,sf){
  const nl=`<a class="nlink" href="${numUrl(t)}" target="_blank" rel="noopener">${t.n?"Voir les photos sur Numista":"Chercher les photos sur Numista"} ↗</a>`;
  if(!sf) return `<div class="phrow">${plusMini(t,"f"," inrow")}<span class="lnk">${nl}${cjtLink(t)}</span></div>`;
  const repl=!e.f?`<div class="addrow"><button class="addph" data-photo="${t.id}" data-side="f">+ Ma photo</button></div>`:"";
  return `<div class="faces one">${picHTML(t,"f",sf)}</div>`+creditHTML([sf])+repl;
}
function creditHTML(ps){
  const c=[...new Set(ps.filter(p=>p&&p.by).map(p=>p.by==="Numista"?p.lic:`© ${p.by} – ${p.lic}`))];
  return c.length?`<div class="credit">Photo${c.length>1?"s":""} ${c.map(esc).join(" · ")} · Source : Numista</div>`:"";
}
function cardHTML(t){
  const e=eff(t); const own=e.qty>0; const faceOnly=!!t.v;
  const np=PHOTOS[t.id]||{};
  const hid=st(t.id).hide||{};
  const side=k=>{ if(e[k]) return {src:ownSrc(e[k]),own:true,ph:e[k]}; if(np[k]&&!hid[k]) return {src:np[k].src,by:np[k].by,lic:np[k].lic}; return null; };
  const sf=side("f"), sb=faceOnly?(e.b?{src:ownSrc(e.b),own:true,ph:e.b}:null):side("b");
  const hasPh=!!(sf||sb);
  const coin=l=>`<span class="ncoin"><span class="blank"></span><small>${l}</small></span>`;
  const dup=e.us.reduce((a,x)=>a+Math.max(0,x.q-1),0);
  const mini=catT(t)!=="disney"&&catT(t)!=="beauval"; // fiches du catalogue CJT sans photo : vignette compacte
  return `<article class="card${own?" own":""}" data-id="${t.id}" data-year="${yearOf(t)}" data-letter="${letterOf(t)}">
    ${photoBlock(t,e,sf)}
    <div>
      <div class="ref" data-mv="${t.id}">${esc(t.ref||"Sans référence JTC")}${st(t.id).mv?' <span class="moved">· déplacée</span>':""}</div>
      <h3 class="name">${esc(t.name)}</h3>
      <div class="info"><span>${esc(yearsLabel(t,e))}</span>${t.dept?`<span>Dép. ${esc(t.dept)}</span>`:""}${t.metal?`<span>${esc(t.metal)}</span>`:""}${t.mint?`<span>Tirage ${esc(t.mint)}</span>`:""}${!S.cat||isVirtual(S.cat)?`<span>${esc(catOf(catT(t)).name)}</span>`:""}</div>
      ${t.note?`<div class="note">${esc(t.note)}</div>`:""}
      <div class="links">${sf?`<a class="nlink" href="${numUrl(t)}" target="_blank" rel="noopener">Photos sur Numista ↗</a>${cjtLink(t)}`:""}</div>
      ${whereHTML(t)}
    </div>
    ${dup?`<div class="pills"><span class="pill ok">${dup} doublon${dup>1?"s":""}</span></div>`:""}
    ${true?variantsHTML(t,e):`<div class="own-row">
      <button class="toggle" data-own="${t.id}" aria-pressed="${own}"><span class="dot">${own?"✓":""}</span>${own?"Je l'ai":"Manquante"}</button>
      <div class="stepper" aria-label="Quantité"><button data-dec="${t.id}" aria-label="Retirer une">−</button><span>${e.qty}</span><button data-inc="${t.id}" aria-label="Ajouter une">+</button></div>
      ${hugoBtn(t,"_")}
    </div>`}
    ${S.custom[t.id]?`<button class="rm" data-rm="${t.id}">Supprimer cette médaille ajoutée</button>`:""}
  </article>`;
}
// années affichées : celles du catalogue + celles ajoutées par Nico
function yearsLabel(t,e){ const ys=[...new Set(e.us.map(x=>+x.y).filter(Boolean))].sort((a,b)=>a-b); if(!ys.length) return t.years||""; return ys.length===1?String(ys[0]):ys[0]+"-"+ys[ys.length-1]; }
function renderFoot(list,label){
  const s=stats(list); const gain=s.value-s.spent;
  $("#foot").setAttribute("aria-label",label);
  $("#foot").innerHTML=`<div class="kpi"><span>Obtenues</span><b>${s.own}<small style="font-size:.7em;color:var(--muted)">/${s.total}</small></b></div>
   <div class="kpi"><span>Manque</span><b>${s.missing}</b></div>
   <span class="gap" aria-hidden="true"></span>
   <div class="kpi kpend"><span>Attente</span><b>${s.pend}</b></div>
   <div class="kpi"><span>Doubles</span><b>${s.dup}</b></div>
   <div class="kpi"><span>Total</span><b>${s.qty}</b></div>`;
}
/* ---------- photo en grand ---------- */
let ZOOMY=null;
function showZoom(id,side){ ZOOMY=scrollY;
  const t=byId(id); if(!t) return; const e=eff(t); const np=PHOTOS[t.id]||{};
  let src="", ph="", credit="", own=false;
  if(e[side]){ ph=e[side]; src=ownSrc(ph); own=true; }
  else if(np[side]&&!(st(t.id).hide||{})[side]){ src=np[side].src; credit=np[side].by==="Numista"?np[side].lic:`© ${np[side].by} – ${np[side].lic} · Source : Numista`; }
  if(!src) return;
  let z=$("#zoom"); if(!z){ z=document.createElement("div"); z.id="zoom"; z.className="zoom"; document.body.appendChild(z);
    z.addEventListener("click",ev=>{ if(ev.target===z||ev.target.classList.contains("zimg")) closeZoom(); }); }
  z.innerHTML=`<div class="zin"><img class="zimg" src="${esc(src)}"${ph?` data-ph="${esc(ph)}"`:""} alt="${side==="f"?"Face":"Dos"} – ${esc(t.name)}">
    <div class="zcap"><b>${esc(t.name)}</b> · ${side==="f"?"Face":"Dos"}${credit?`<small>${esc(credit)}</small>`:""}</div>
    <div class="row zbtns"><button class="btn ghost" data-photo="${t.id}" data-side="${side}">${own?"Changer la photo":"Mettre ma photo"}</button><button class="btn" id="zoomClose">Fermer</button></div>
    <div class="row zbtns" id="zDelWrap"><button class="linkbtn danger" type="button" id="zDel">Retirer cette photo</button></div></div>`;
  $("#zDel").onclick=()=>{ $("#zDelWrap").innerHTML=`<span class="zsure">Sûr ? La photo ${side==="f"?"de la face":"du dos"} sera retirée.</span><button class="btn" type="button" id="zYes">Oui, retirer</button><button class="btn ghost" type="button" id="zNo">Non</button>`;
    $("#zNo").onclick=closeZoom;
    $("#zYes").onclick=()=>{ if(own){ REMOVED[id+side]=Date.now(); ls.set("nico_removed",REMOVED); patch(id,{[side]:""}); } else patch(id,{hide:{...(st(id).hide||{}),[side]:1}}); // photo du catalogue : simplement cachée
      closeZoom(); render(); toast("Photo retirée"); }; };
  z.hidden=false; document.body.style.overflow="hidden";
}
function closeZoom(){ const z=$("#zoom"); if(z){ z.hidden=true; z.innerHTML=""; } document.body.style.overflow=""; ZOOMY=null; }
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeZoom(); });
function toast(msg){ const d=document.createElement("div"); d.className="toast"; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),2200); }
function numUrlSafe(t){ return numUrl(t); }

/* ---------- interactions ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.cat){ if(!S.cat){ S.homeQ=S.q; HOMEY=scrollY; } OPEN.clear(); S.mosaic=true; S.addOpen=false; S.cat=b.dataset.cat; S.yr=""; S.q=""; $("#q").value=""; scrollTo(0,0); render(); return; }
  if(b.dataset.psopen){ closeSheet(); openPiece(b.dataset.psopen); return; }
  if(b.dataset.where){ const id=b.dataset.where; if(PIECE===id) return; WOPEN.has(id)?WOPEN.delete(id):WOPEN.add(id); rerender(); return; }
  if(b.dataset.wcopy){ const g=geoOf(b.dataset.wcopy)||[], txt=[g[3],g[4]].filter(Boolean).join(", ")||`${g[0]}, ${g[1]}`;
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast("Adresse copiée"),()=>toast(txt)); return; }
  if(b.id==="mosaicBtn"){ S.mosaic=!S.mosaic; render(); scrollTo(0,0); return; }
  if(b.dataset.jy){ const y=b.dataset.jy; jumpTo(t=>(S.yr&&isYrCat()?S.yr:(yearOf(t)||"Sans année"))===y); return; }
  if(b.dataset.ml){ const g=document.getElementById(b.dataset.ml); if(g) scrollTo({top:g.getBoundingClientRect().top+scrollY-($(".top").offsetHeight+10),behavior:"smooth"}); return; }
  if(b.dataset.jl){ jumpTo(t=>letterOf(t)===b.dataset.jl); return; }
  if(b.dataset.jt){ openPiece(b.dataset.jt); return; }
  if(b.id==="pieceClose"){ closePiece(); return; }
  if(b.id==="pieceList"){ const id=PIECE; closePiece(); jumpTo(t=>t.id===id); return; }
  if(b.id==="moreBtn"){ showMore(); return; }
  if(b.id==="helpBtn"){ showHelp(); return; }
  if(b.id==="nearBtn"){ S.homeQ=S.q; HOMEY=scrollY; S.near=true; S.q=""; $("#q").value=""; scrollTo(0,0); locate(); return; }
  if(b.id==="nearRetry"){ locate(); return; }
  if(b.id==="nearAll"){ S.nearAll=!S.nearAll; rerender(); return; }
  if(b.dataset.nr){ S.nearR=+b.dataset.nr; S.nearMore=false; ls.set("nico_nearR",S.nearR); render(); return; }
  if(b.id==="nearY"){ S.nearY=S.nearY==="rec"?"all":"rec"; S.nearMore=false; render(); return; }
  if(b.id==="nearMore"){ S.nearMore=true; rerender(); return; }
  if(b.dataset.ns){ showNotSold(b.dataset.ns); return; }
  if(b.dataset.wedit){ showEditPlace(b.dataset.wedit); return; }
  if(b.dataset.wreset){ const id=b.dataset.wreset; patch(id,{loc:""}); toast("Lieu proposé remis"); rerender(); if(PIECE===id) renderPiece(); return; }
  if(b.dataset.nsundo){ const id=b.dataset.nsundo; patch(id,{ns:""}); toast("Signalement annulé"); rerender(); if(PIECE===id) renderPiece(); return; }
  if(b.id==="backBtn"&&S.near&&!S.cat){ exitNear(); return; }
  if(b.id==="backBtn"){ OPEN.clear(); S.mosaic=false; S.addOpen=false; S.cat=null; S.q=S.homeQ||""; $("#q").value=S.q; render(); backHome(); return; }
  if(b.dataset.f){ S.filter=S.filter===b.dataset.f?null:b.dataset.f; saveFilter(); render(); return; }
  if(b.id==="clearF"||b.id==="clearF2"){ S.filter=null; saveFilter(); render(); return; }
  // double appui sur une ligne = « En attente » (orange) ; le 1er appui est annulé
  if(b.dataset.vt&&NOCLICK){ NOCLICK=false; return; }
  if(b.dataset.vt){ const key=b.dataset.vt, i=key.indexOf("~"), id=key.slice(0,i), k=key.slice(i+1), now=Date.now();
    if(LASTTAP.key===key && now-LASTTAP.t<400){ const u=st(id); const restore=k==="_"?{q:LASTTAP.q}:{vq:{...(u.vq||{}),[k]:LASTTAP.q}};
      const pv={...(u.pv||{})}; if(LASTTAP.p) delete pv[k]; else pv[k]=1; // inverse l'état « En attente » d'avant le 1er appui
      if(pv[k]) { if(k==="_") restore.q=0; else restore.vq[k]=0; }
      LASTTAP={}; OPEN.add(id); patch(id,{...restore,pv}); rerender(); return; }
    const u=st(id); LASTTAP={key,t:now,q:k==="_"?(u.q||0):((u.vq||{})[k]||0),p:!!(u.pv||{})[k]};
    // simple appui : possédée oui/non (et on retire « En attente » si on la coche)
    if(k==="_"){ const q=u.q||0, pv={...(u.pv||{})}; if(!q) delete pv._; patch(id,{q:q>0?0:1,pv}); rerender(); return; }
    const vq={...(u.vq||{})}, pv={...(u.pv||{})}; const q=vq[k]||0; vq[k]=q>0?0:1; if(vq[k]) delete pv[k];
    OPEN.add(id); patch(id,{vq,pv}); rerender(); return; }
  if(b.dataset.vi||b.dataset.vd){ const key=b.dataset.vi||b.dataset.vd; const i=key.indexOf("~"); const id=key.slice(0,i), k=key.slice(i+1);
    const pv={...(st(id).pv||{})};
    if(k==="_"){ const q=st(id).q||0, nq=b.dataset.vi? q+1 : Math.max(0,q-1); if(nq>0) delete pv._; patch(id,{q:nq,pv}); rerender(); return; }
    const vq={...(st(id).vq||{})}; const q=vq[k]||0;
    vq[k]= b.dataset.vi? q+1 : Math.max(0,q-1); if(vq[k]>0) delete pv[k];
    OPEN.add(id); patch(id,{vq,pv}); rerender(); return; }
  if(b.dataset.own){ const id=b.dataset.own; patch(id,{q:eff(byId(id)).qty>0?0:1}); rerender(); return; }
  if(b.dataset.inc){ const id=b.dataset.inc; patch(id,{q:eff(byId(id)).qty+1}); rerender(); return; }
  if(b.dataset.dec){ const id=b.dataset.dec; patch(id,{q:Math.max(0,eff(byId(id)).qty-1)}); rerender(); return; }
  if(b.dataset.hu){ const key=b.dataset.hu, i=key.indexOf("~"), id=key.slice(0,i), k=key.slice(i+1);
    const hv={...(st(id).hv||{})}; if(hv[k]) delete hv[k]; else hv[k]=1; OPEN.add(id); patch(id,{hv}); rerender(); return; }
  if(b.dataset.yr!==undefined){ S.yr=b.dataset.yr; render(); const c=$(".yrchips"); if(c) c.scrollIntoView({block:"nearest"}); return; }
  if(b.dataset.zoom){ showZoom(b.dataset.zoom,b.dataset.side); return; }
  if(b.id==="zoomClose"){ closeZoom(); return; }
  if(b.dataset.photo){ const y=ZOOMY!=null?ZOOMY:scrollY; closeZoom(); NP={target:{id:b.dataset.photo,side:b.dataset.side},y}; showPick(); return; }
  if(b.dataset.rm){ const id=b.dataset.rm; delete S.custom[id]; delete S.items[id]; delete DIRTY[id]; ls.set("nico_dirty",DIRTY); saveCustom(id); render(); toast("Médaille supprimée"); return; }
  if(b.id==="addBtn"){ showAdd(); return; }
  if(b.dataset.ay){ showAddYear(b.dataset.ay); return; }

});
document.addEventListener("toggle",e=>{ const d=e.target; if(d.classList&&d.classList.contains("vars")){ if(d.open) OPEN.add(d.dataset.vid); else OPEN.delete(d.dataset.vid);} },true);
document.addEventListener("change",e=>{
  const el=e.target; if(!el.dataset.k) return;
  const v=el.value.trim(); patch(el.dataset.id,{[el.dataset.k]: el.dataset.k==="rar"?(v?+v:""):v.replace(",",".")});
  renderFoot(S.cat?allTokens().filter(t=>inCat(t,S.cat)):allTokens(), S.cat?"Total "+catOf(S.cat).name:"Toute la collection");
  toast("Enregistré");
});
let qTimer; $("#q").addEventListener("input",e=>{ clearTimeout(qTimer); qTimer=setTimeout(()=>{S.q=e.target.value.trim(); if(S.near&&S.q) S.near=false; render();},150); });
const byId=id=>allTokens().find(t=>t.id===id);
document.addEventListener("click",e=>{ if(e.target.id==="logoutBtn"){ supa.auth.signOut().then(()=>location.reload()); } });
// photo Numista distante introuvable -> lien vers Numista
document.addEventListener("error",e=>{ const i=e.target; if(i.tagName==="IMG"&&i.parentElement&&i.parentElement.classList.contains("mtile")){ const t=byId(i.parentElement.dataset.jt); const sp=document.createElement("span"); sp.className="mph"; sp.textContent=t?String(t.name).slice(0,28):""; i.replaceWith(sp); return; } if(i.tagName==="IMG"&&i.closest(".npic")){ const f=i.closest(".npic"); const a=document.createElement("a"); a.className="face nmini"; a.target="_blank"; a.rel="noopener"; const t=byId(f.closest(".card")?.dataset.id); a.href=t?numUrl(t):"https://fr.numista.com"; a.innerHTML='<span class="ph"><span class="blank"></span>Voir sur Numista ↗</span>'; f.replaceWith(a); } },true);

/* ---------- Déplacer une pièce mal rangée ----------
   Volontairement caché pour éviter les erreurs : appui long (2 s) sur le code de la pièce, puis double confirmation. */
let LP=null, NOCLICK=false, LPV=null;
/* Appui long (2 s) sur une ligne (année/revers) : la corriger, ou la supprimer/masquer. Lignes du catalogue : la correction reste chez Nico. */
document.addEventListener("pointerdown",e=>{ const r=e.target.closest('.vtog[data-vt]'); if(!r) return;
  const key=r.dataset.vt; LPV={x:e.clientX,y:e.clientY,el:r,t:setTimeout(()=>{ r.classList.remove("hold"); LPV=null; NOCLICK=true; setTimeout(()=>{NOCLICK=false;},700);
    if(navigator.vibrate) try{navigator.vibrate(30)}catch(_){} showEditLine(key); },2000)}; r.classList.add("hold"); });
const cancelLPV=()=>{ if(LPV){ clearTimeout(LPV.t); LPV.el.classList.remove("hold"); LPV=null; } };
document.addEventListener("pointerup",cancelLPV); document.addEventListener("pointercancel",cancelLPV);
document.addEventListener("pointermove",e=>{ if(LPV&&Math.hypot(e.clientX-LPV.x,e.clientY-LPV.y)>12) cancelLPV(); });
document.addEventListener("scroll",cancelLPV,{passive:true,capture:true});
document.addEventListener("contextmenu",e=>{ if(e.target.closest('.vtog[data-vt]')) e.preventDefault(); });
function showEditCat(t,ln){
  const id=t.id, k=ln.k, sh=$("#sheet"), y0=ln.ed?ln.y0:ln.y, r0=ln.ed?ln.r0:ln.r;
  sh.innerHTML=`<form class="in" id="elForm"><h2>Corriger cette ligne</h2>
    <p class="note"><b>${esc(t.name)}</b><br>Ligne du catalogue : ${esc(y0||"")} ${esc(r0||"")}${ln.ed?`<br>Corrigée en : <b>${esc(ln.y)} ${esc(ln.r)}</b>`:""}</p>
    <div class="fields">
      <label class="field">Année<input id="el-year" inputmode="numeric" maxlength="4" required value="${esc(ln.y||"")}"></label>
      <label class="field full">Revers<input id="el-rev" value="${esc(ln.r||"")}"></label></div>
    <p class="note">Tes coches, doubles et « En attente » de cette ligne sont gardés.</p>
    <div class="row"><button class="btn" type="submit">Enregistrer</button><button class="btn ghost" type="button" id="elCancel">Annuler</button></div>
    ${ln.ed?`<div class="row"><button type="button" class="linkbtn" id="elReset">↩︎ Remettre comme au catalogue (${esc(y0||"")})</button></div>`:""}
    ${k!=="_"?`<div class="row" id="elDelWrap"><button type="button" class="linkbtn danger" id="elDel">Cette ligne n'existe pas : la retirer</button></div>`:""}</form>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0;
  $("#elCancel").onclick=closeSheet;
  const setVx=v=>{ const vx={...(st(id).vx||{})}; if(v==null) delete vx[k]; else vx[k]=v; OPEN.add(id); patch(id,{vx}); closeSheet(); rerender(); };
  $("#elForm").onsubmit=ev=>{ ev.preventDefault();
    const y=$("#el-year").value.trim(), r=$("#el-rev").value.trim();
    if(!/^\d{4}$/.test(y)){ toast("Mets l'année sur 4 chiffres"); return; }
    if(units(t).some(x=>x.k!==k&&String(x.y)===y&&String(x.r||"")===r)){ toast("Cette ligne existe déjà"); return; }
    if(y===String(y0)&&r===String(r0||"")) setVx(null); else setVx(y+"|"+r);
    toast("Ligne corrigée"); };
  if($("#elReset")) $("#elReset").onclick=()=>{ setVx(null); toast("Ligne remise comme au catalogue"); };
  if($("#elDel")) $("#elDel").onclick=()=>{ $("#elDelWrap").innerHTML=`<p class="note full" style="margin:0">Sûr ? La ligne ${esc(ln.y)} ${esc(ln.r)} ne s'affichera plus pour cette pièce.${ln.q>0?" <b>Attention, elle est cochée.</b>":""}</p><button type="button" class="btn" id="elYes">Oui, la retirer</button><button type="button" class="btn ghost" id="elNo">Non</button>`;
    $("#elYes").onclick=()=>{ setVx("-"); toast("Ligne retirée"); }; $("#elNo").onclick=closeSheet; };
}
function showEditLine(key){
  const i=key.indexOf("~"), id=key.slice(0,i), k=key.slice(i+1), t=byId(id); if(!t) return;
  const ln=units(t).find(x=>x.k===k); if(!ln) return;
  if(!ln.added) return showEditCat(t,ln);
  const [y0,...rr]=k.split("|"), r0=rr.join("|");
  const sh=$("#sheet");
  sh.innerHTML=`<form class="in" id="elForm"><h2>Modifier cette ligne</h2>
    <p class="note"><b>${esc(t.name)}</b><br>Ligne que tu as ajoutée : ${esc(y0)} ${esc(r0)}</p>
    <div class="fields">
      <label class="field">Année<input id="el-year" inputmode="numeric" maxlength="4" required value="${esc(y0)}"></label>
      <label class="field full">Revers<input id="el-rev" value="${esc(r0)}"></label></div>
    <div class="row"><button class="btn" type="submit">Enregistrer</button><button class="btn ghost" type="button" id="elCancel">Annuler</button></div>
    <div class="row" id="elDelWrap"><button type="button" class="linkbtn danger" id="elDel">Supprimer cette ligne</button></div></form>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0;
  $("#elCancel").onclick=closeSheet;
  const rekey=(obj,from,to)=>{ const o={...(obj||{})}; if(from in o){ if(to) o[to]=o[from]; delete o[from]; } return o; };
  const apply=to=>{ const u=st(id); let xv=(u.xv||[]).filter(([y,r])=>(y+"|"+r)!==k);
    if(to){ const [ny,...nr]=to.split("|"); xv=xv.concat([[+ny,nr.join("|")]]); }
    OPEN.add(id); patch(id,{xv:xv.length?xv:"",vq:rekey(u.vq,k,to),hv:rekey(u.hv,k,to),pv:rekey(u.pv,k,to)}); closeSheet(); rerender(); };
  $("#elForm").onsubmit=ev=>{ ev.preventDefault();
    const y=$("#el-year").value.trim(), r=$("#el-rev").value.trim();
    if(!/^\d{4}$/.test(y)){ toast("Mets l'année sur 4 chiffres"); return; }
    const to=y+"|"+r; if(to===k){ closeSheet(); return; }
    if(units(t).some(x=>x.k===to)){ toast("Cette ligne existe déjà"); return; }
    apply(to); toast("Ligne modifiée"); };
  $("#elDel").onclick=()=>{ $("#elDelWrap").innerHTML=`<p class="note full" style="margin:0">Sûr ? La ligne ${esc(y0)} ${esc(r0)} sera supprimée.</p><button type="button" class="btn" id="elYes">Oui, supprimer</button><button type="button" class="btn ghost" id="elNo">Non</button>`;
    $("#elYes").onclick=()=>{ apply(null); toast("Ligne supprimée"); }; $("#elNo").onclick=closeSheet; };
}
document.addEventListener("pointerdown",e=>{ const r=e.target.closest(".ref[data-mv]"); if(!r) return;
  LP={id:r.dataset.mv,x:e.clientX,y:e.clientY,el:r,t:setTimeout(()=>{ r.classList.remove("hold"); LP=null; if(navigator.vibrate) try{navigator.vibrate(30)}catch(_){} showMove(r.dataset.mv); },2000)};
  r.classList.add("hold"); });
const cancelLP=()=>{ if(LP){ clearTimeout(LP.t); LP.el.classList.remove("hold"); LP=null; } };
document.addEventListener("pointerup",cancelLP); document.addEventListener("pointercancel",cancelLP);
document.addEventListener("pointermove",e=>{ if(LP&&Math.hypot(e.clientX-LP.x,e.clientY-LP.y)>12) cancelLP(); });
document.addEventListener("scroll",cancelLP,{passive:true});
document.addEventListener("contextmenu",e=>{ if(e.target.closest(".ref[data-mv]")) e.preventDefault(); });
function showHelp(){
  const sh=$("#sheet");
  sh.innerHTML=`<div class="in"><h2>Astuces</h2>
    <h3 class="htitle">Déplacer une pièce mal rangée</h3>
    <ol class="steps"><li>Ouvre le thème ou le département où se trouve la pièce, puis touche la pièce.</li>
      <li>Sur sa fiche, <b>garde le doigt appuyé 2 secondes sur le code doré</b> (ex. « JTC FR95-0344 »). Il devient orange pendant l'appui.</li>
      <li>Choisis le <b>nouveau thème ou département</b>, puis <b>Déplacer</b> et <b>Oui, déplacer</b>.</li>
      <li>Le code affiche alors « · déplacée ».</li></ol>
    <p class="note">Pour annuler : même appui long, puis <b>Remettre dans « … »</b>.</p>
    <h3 class="htitle">Pièce en attente</h3>
    <p class="note"><b>Double appui</b> sur une ligne (année + revers) : elle passe en <b>orange « En attente »</b> (commandée, en cours d'échange…). Elle ne compte pas encore comme possédée. Un simple appui ensuite la coche en vert ; un nouveau double appui enlève « En attente ». Le filtre <b>En attente</b> en haut les retrouve toutes, et le compteur <b>Attente</b> en bas les compte.</p>
    <h3 class="htitle">Année ou revers manquant</h3>
    <p class="note">Dans la fiche d'une pièce, touche <b>+ Ajouter une année ou un revers</b> sous ses lignes. L'année suivante et le revers sont proposés (ex. 2013 · 13 MDP-2), tu corriges si besoin. Pour <b>corriger ou supprimer</b> une ligne que tu as ajoutée : <b>garde le doigt 2 secondes dessus</b> (elle devient orange), puis Modifier ou Supprimer. Pareil pour une ligne du catalogue qui est fausse (mauvaise année, revers) : garde le doigt 2 secondes dessus pour la <b>corriger</b> ; tes coches restent.</p>
    <h3 class="htitle">Saisie gardée</h3>
    <p class="note">Si tu quittes l'appli en pleine saisie (pour chercher une info), tu retrouves le formulaire et ce que tu avais écrit en revenant.</p>
    <h3 class="htitle">Mosaïque</h3>
    <p class="note">Un thème ou un département s'ouvre en mosaïque. Touche une pièce pour ouvrir sa fiche, ou une année pour aller dans la liste. Le bouton ☰ en haut à droite passe de la mosaïque à la liste et inversement.</p>
    <h3 class="htitle">Recherche</h3>
    <p class="note">Tape un code (ex. FR77-0295), un nom, un lieu ou un numéro de département (ex. 77) : le département s'affiche en premier, puis ses pièces.</p>
    <h3 class="htitle">Diagnostic des photos</h3>
    <p class="note" id="phDiag">Calcul…</p>
    <div class="row"><button class="btn ghost" type="button" id="phRetry">Recharger les photos</button></div>
    <div class="row"><button class="btn" type="button" id="helpClose">Fermer</button></div></div>`;
  const diag=async()=>{ const refs=[]; Object.entries(S.items).forEach(([id,u])=>{ if(u.f) refs.push(u.f); });
    let onPhone=0; for(const r of refs){ if(await idb.get(r).catch(()=>null)) onPhone++; }
    const sent=refs.filter(r=>r.startsWith("sb:")).length, wait=refs.length-sent, fail=refs.filter(r=>PHFAIL[r]);
    const el=$("#phDiag"); if(!el) return;
    el.innerHTML=`${refs.length} photo${refs.length>1?"s":""} à toi · ${onPhone} gardée${onPhone>1?"s":""} sur le téléphone · ${sent} envoyée${sent>1?"s":""} au serveur${wait?` · ${wait} en attente d'envoi`:""}${fail.length?`<br><b>${fail.length} impossible${fail.length>1?"s":""} à afficher</b> (${esc([...new Set(fail.map(r=>PHFAIL[r]))].join(", "))})`:"<br>Aucun problème détecté."}`;
    let pers="?"; try{ pers=navigator.storage&&navigator.storage.persisted?((await navigator.storage.persisted())?"oui":"non"):"?"; }catch(e){}
    const ua=navigator.userAgent, br=/SamsungBrowser\/[\d.]+/.exec(ua)||/Firefox\/[\d.]+/.exec(ua)||/EdgA\/[\d.]+/.exec(ua)||/Chrome\/[\d]+/.exec(ua)||["?"];
    const lg=ls.get("nico_phlog")||[];
    el.innerHTML+=`<br><small>Navigateur : ${esc(br[0])} · mémoire protégée : ${pers} · ${matchMedia("(display-mode: standalone)").matches?"appli installée":"onglet du navigateur"}</small>${lg.length?`<br><small><b>Derniers évènements :</b><br>${lg.slice(0,6).map(esc).join("<br>")}</small>`:""}`; };
  diag(); $("#phRetry").onclick=async()=>{ Object.keys(PHFAIL).forEach(k=>delete PHFAIL[k]); Object.entries(S.items).forEach(([id,u])=>{ if(u.f&&!URLS[u.f]) loadPhoto(u.f); }); setTimeout(diag,2500); toast("Rechargement des photos…"); };
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0; $("#helpClose").onclick=closeSheet;
}
function showAddYear(id,d){
  const t=byId(id); if(!t) return; d=d||{};
  const last=units(t).filter(x=>x.r).slice(-1)[0];
  const maxY=Math.max(0,...units(t).map(x=>+x.y||0)); const y0=d.year||String(maxY?Math.min(maxY+1,new Date().getFullYear()):new Date().getFullYear()); // année suivante proposée
  const sugg=r=>{ if(!last||!last.r) return ""; const m=/^\d\d\s+(.*)$/.exec(last.r); return m?(String(r).slice(2)+" "+m[1]):last.r; };
  const sh=$("#sheet");
  sh.innerHTML=`<form class="in" id="yrForm"><h2>Ajouter une année ou un revers</h2>
    <p class="note"><b>${esc(t.name)}</b><br>Lignes existantes : ${units(t).map(x=>esc([x.y,x.r].filter(Boolean).join(" "))).join(" · ")}</p>
    <div class="fields">
      <label class="field">Année<input id="yr-year" inputmode="numeric" maxlength="4" required value="${esc(y0)}"></label>
      <label class="field full">Revers (comme sur la pièce)<input id="yr-rev" placeholder="${esc(sugg(y0)||"Ex. 13 MDP-2")}" value="${esc(d.rev!=null?d.rev:sugg(y0))}"></label>
      <label class="check full"><input type="checkbox" id="yr-own" ${d.own===false?"":"checked"}> Je l'ai (cochée tout de suite)</label>
    </div>
    <div class="row"><button class="btn" type="submit">Ajouter la ligne</button><button class="btn ghost" type="button" id="yrCancel">Annuler</button></div></form>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0;
  let touched=d.rev!=null;
  const save=()=>DRAFT.set({kind:"yr",id,year:$("#yr-year").value,rev:$("#yr-rev").value,own:$("#yr-own").checked});
  $("#yr-rev").addEventListener("input",()=>{ touched=true; });
  $("#yr-year").addEventListener("input",()=>{ const y=$("#yr-year").value; if(!touched&&/^\d{4}$/.test(y)) $("#yr-rev").value=sugg(y); });
  $("#yrForm").addEventListener("input",save); save();
  $("#yrCancel").onclick=()=>{ DRAFT.clear(); closeSheet(); };
  $("#yrForm").onsubmit=ev=>{ ev.preventDefault();
    const y=$("#yr-year").value.trim(), r=$("#yr-rev").value.trim();
    if(!/^\d{4}$/.test(y)){ toast("Mets l'année sur 4 chiffres"); return; }
    const k=y+"|"+r; if(units(t).some(x=>String(x.y)===y&&x.r===r)){ toast("Cette ligne existe déjà"); return; }
    const u=st(id); const upd={xv:(u.xv||[]).concat([[+y,r]])};
    if($("#yr-own").checked) upd.vq={...(u.vq||{}),[k]:1};
    OPEN.add(id); patch(id,upd); DRAFT.clear(); closeSheet(); rerender(); toast("Ligne ajoutée"); };
}
function showMove(id){
  const t=byId(id); if(!t) return; const cur=catT(t), orig=t.cat;
  const sh=$("#sheet");
  sh.innerHTML=`<div class="in"><h2>Déplacer cette pièce</h2>
    <p class="note"><b>${esc(t.name)}</b><br>Thème actuel : ${esc(catOf(cur).name)}${cur!==orig?` (thème d'origine : ${esc(catOf(orig).name)})`:""}</p>
    <label class="field full">Nouveau thème<select id="mvCat">${CATS.filter(c=>!c.virtual&&c.id!==cur).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
    <div class="row" id="mvStep"><button class="btn" type="button" id="mvGo">Déplacer</button><button class="btn ghost" type="button" id="mvCancel">Annuler</button></div>
    ${cur!==orig?`<button type="button" class="linkbtn" id="mvBack">Remettre dans « ${esc(catOf(orig).name)} »</button>`:""}</div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0;
  $("#mvCancel").onclick=closeSheet;
  const doMove=to=>{ patch(id,{mv:to===orig?"":to}); closeSheet(); rerender(); toast(`Pièce déplacée dans « ${catOf(to).name} »`); };
  if($("#mvBack")) $("#mvBack").onclick=()=>doMove(orig);
  $("#mvGo").onclick=()=>{ const to=$("#mvCat").value;
    $("#mvStep").innerHTML=`<p class="note full" style="margin:0">Sûr ? La pièce ira dans <b>${esc(catOf(to).name)}</b>.</p><button class="btn" type="button" id="mvYes">Oui, déplacer</button><button class="btn ghost" type="button" id="mvNo">Non</button>`;
    $("#mvYes").onclick=()=>doMove(to); $("#mvNo").onclick=closeSheet; };
}

/* ---------- Ajouter ma pièce ---------- */
let NP=null;
const normRef=v=>{ const m=/(FR|[A-Z]{2})\s*-?\s*([0-9AB]{2})\s*-?\s*(\d{1,4})/i.exec(v||""); return m?(m[1].toUpperCase()+m[2].toUpperCase()+"-"+m[3].padStart(4,"0")):""; };
function findByRef(code){ if(!code) return null; return allTokens().find(t=>normRef(t.ref)===code)||null; }
function closeSheet(){ stopCam(); $("#sheet").hidden=true; $("#sheetBg").hidden=true; $("#sheet").innerHTML="";
  if(PIECE) renderPiece(); } // après une photo, un déplacement… on revient sur la fiche de la pièce
$("#sheetBg").addEventListener("click",()=>{ if($("#sheet .piece")) closePiece(); else { if($("#npForm")||$("#yrForm")) DRAFT.clear(); closeSheet(); } });
/* ---------- fiche d'une pièce ouverte depuis la mosaïque ---------- */
let PIECE=null;
function openPiece(id){ PIECE=id; OPEN.add(id); renderPiece(true); saveView(); } // dans la fiche, les variantes sont déjà ouvertes
function renderPiece(first){
  const t=byId(PIECE); if(!t){ PIECE=null; closeSheet(); return; } // pièce supprimée : on ferme
  const sh=$("#sheet"), y=first?0:sh.scrollTop;
  INSHEET=true; let card; try{ card=cardHTML(t); }finally{ INSHEET=false; }
  sh.innerHTML=`<div class="in piece"><div class="phead"><button class="btn ghost" type="button" id="pieceList">Voir dans la liste</button><button class="btn" type="button" id="pieceClose">Fermer</button></div>${card}</div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=y;
}
function closePiece(){ PIECE=null; closeSheet(); saveView(); }
/* cadrage rond */
let CR=null;
function showCrop(){
  const sh=$("#sheet");
  sh.innerHTML=`<div class="in">
    <h2>Cadre ta pièce</h2>
    <p class="note">Fais glisser la photo pour centrer la pièce dans le cercle, et zoome avec la barre (ou en pinçant). Tout ce qui est hors du cercle sera coupé.</p>
    <div class="crop" id="crop"><canvas id="cropCv"></canvas><div class="crop-mask"></div><div class="crop-ring"></div></div>
    <label class="field full">Zoom<input type="range" id="cropZoom" min="1" max="4" step="0.01" value="1"></label>
    <div class="row"><button class="btn" type="button" id="cropOk">Valider le cadrage</button>
      <button class="btn ghost" type="button" id="cropRetake">Reprendre la photo</button><label class="btn ghost" for="newGal">Galerie</label></div>
    <button type="button" class="linkbtn" id="cropCancel">Annuler</button>
  </div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0;
  $("#cropCancel").onclick=closeSheet; $("#cropRetake").onclick=showCamera;
  const img=new Image();
  img.onload=()=>{
    const box=$("#crop"), S=box.clientWidth, dpr=window.devicePixelRatio||1, cv=$("#cropCv");
    cv.width=S*dpr; cv.height=S*dpr; cv.style.width=cv.style.height=S+"px";
    const r=S*0.47, base=(2*r)/Math.min(img.naturalWidth,img.naturalHeight);
    CR={img,S,r,dpr,base,z:1,ox:0,oy:0,cv,ptr:new Map(),pinch:null};
    autoFit();
    drawCrop();
    const zoom=$("#cropZoom"); zoom.value=CR.z;
    zoom.oninput=()=>{ CR.z=+zoom.value; drawCrop(); };
    cv.addEventListener("pointerdown",e=>{ cv.setPointerCapture(e.pointerId); CR.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(CR.ptr.size===2){ const [a,b]=[...CR.ptr.values()]; CR.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:CR.z}; } });
    cv.addEventListener("pointermove",e=>{ const p=CR.ptr.get(e.pointerId); if(!p) return;
      if(CR.ptr.size===1){ CR.ox+=e.clientX-p.x; CR.oy+=e.clientY-p.y; }
      CR.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(CR.ptr.size===2&&CR.pinch){ const [a,b]=[...CR.ptr.values()]; CR.z=Math.min(4,Math.max(1,CR.pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/CR.pinch.d)); zoom.value=CR.z; }
      drawCrop(); });
    const up=e=>{ CR.ptr.delete(e.pointerId); if(CR.ptr.size<2) CR.pinch=null; };
    cv.addEventListener("pointerup",up); cv.addEventListener("pointercancel",up);
    $("#cropOk").onclick=async()=>{ gotBlob(await exportCrop()); };
  };
  img.onerror=()=>{ toast("Photo illisible, reprends-la"); closeSheet(); };
  img.src=NP.url;
}
/* pré-zoom : repère la pièce sur le fond (couleur des bords, blanc) et la cale dans le cercle */
function findCoin(img){
  try{
    const W=img.naturalWidth, H=img.naturalHeight, k=Math.min(1,240/Math.max(W,H)), w=Math.max(1,Math.round(W*k)), h=Math.max(1,Math.round(H*k));
    const cv=document.createElement("canvas"); cv.width=w; cv.height=h; const c=cv.getContext("2d",{willReadFrequently:true});
    c.drawImage(img,0,0,w,h); const d=c.getImageData(0,0,w,h).data;
    // couleur de fond = la plus fréquente sur le tour de l'image (capture d'écran, fond blanc, nappe unie…)
    const hist=new Map(), q=i=>((d[i]>>5)<<6)|((d[i+1]>>5)<<3)|(d[i+2]>>5), brd=[];
    for(let x=0;x<w;x++) brd.push((0*w+x)*4,((h-1)*w+x)*4); for(let y=0;y<h;y++) brd.push((y*w)*4,(y*w+w-1)*4);
    brd.forEach(i=>{ const b=q(i); hist.set(b,(hist.get(b)||0)+1); });
    const top=[...hist.entries()].sort((a,b)=>b[1]-a[1])[0]; if(top[1]/brd.length<0.3) return null;
    const sel=brd.filter(i=>q(i)===top[0]), bg=[0,1,2].map(j=>sel.reduce((a,i)=>a+d[i+j],0)/sel.length);
    // masque : ce qui n'est ni le fond ni du blanc
    const m=new Uint8Array(w*h);
    for(let p=0;p<w*h;p++){ const i=p*4, r=d[i], g=d[i+1], b=d[i+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      m[p]=(Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2])<60 || (mn>228&&mx-mn<22))?0:1; }
    // morceaux d'un seul tenant : on garde le plus gros qui a une forme de pièce (à peu près carré)
    const lab=new Int32Array(w*h), st=[]; let best=null, n=0;
    for(let p0=0;p0<w*h;p0++){ if(!m[p0]||lab[p0]) continue; n++; lab[p0]=n; st.push(p0);
      let a=0,x0=w,x1=0,y0=h,y1=0;
      while(st.length){ const p=st.pop(), x=p%w, y=(p/w)|0; a++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const X=x+dx, Y=y+dy; if(X<0||Y<0||X>=w||Y>=h) continue; const P=Y*w+X; if(m[P]&&!lab[P]){ lab[P]=n; st.push(P); } } }
      const bw=x1-x0+1, bh=y1-y0+1, ar=bw/bh;
      if(ar<0.8||ar>1.25||Math.min(bw,bh)<Math.min(w,h)*0.15||a<0.4*bw*bh) continue;
      if(!best||a>best.a) best={a,x0,x1,y0,y1}; }
    if(!best) return null;
    const bw=best.x1-best.x0+1, bh=best.y1-best.y0+1;
    if(bw>w*0.96&&bh>h*0.96) return {full:true}; // la pièce remplit déjà la photo
    return {cx:(best.x0+best.x1+1)/2/k, cy:(best.y0+best.y1+1)/2/k, d:Math.max(bw,bh)/k};
  }catch(e){ return null; }
}
/* photo prise à la main (doigts, boîte, canapé autour) : on cherche le grand rond de la pièce (transformée de Hough) */
function houghCoin(img){
  const W=img.naturalWidth||img.width, H=img.naturalHeight||img.height, k=Math.min(1,200/Math.max(W,H)), w=Math.round(W*k), h=Math.round(H*k);
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h; const c=cv.getContext('2d',{willReadFrequently:true});
  c.fillStyle='#808080'; c.fillRect(0,0,w,h); c.drawImage(img,0,0,w,h); const d=c.getImageData(0,0,w,h).data;
  const g=new Float32Array(w*h); for(let i=0;i<w*h;i++) g[i]=0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2];
  // flou léger
  const s=new Float32Array(w*h); for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let a=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)a+=g[(y+dy)*w+x+dx];s[y*w+x]=a/9;}
  const mag=new Float32Array(w*h), gx=new Float32Array(w*h), gy=new Float32Array(w*h);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;
    const X=-s[i-w-1]-2*s[i-1]-s[i+w-1]+s[i-w+1]+2*s[i+1]+s[i+w+1], Y=-s[i-w-1]-2*s[i-w]-s[i-w+1]+s[i+w-1]+2*s[i+w]+s[i+w+1];
    gx[i]=X; gy[i]=Y; mag[i]=Math.hypot(X,Y);}
  const sorted=Array.from(mag).sort((a,b)=>b-a), th=sorted[Math.floor(w*h*0.12)]||1;
  const m=Math.min(w,h), r0=Math.round(m*0.15), r1=Math.round(m*0.5), nr=r1-r0+1;
  const acc=new Float32Array(w*h*nr);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x; if(mag[i]<th) continue; const ux=gx[i]/mag[i], uy=gy[i]/mag[i];
    for(let r=r0;r<=r1;r++) for(const sg of [1,-1]){ const cx=Math.round(x+sg*ux*r), cy=Math.round(y+sg*uy*r); if(cx<0||cy<0||cx>=w||cy>=h) continue; acc[(r-r0)*w*h+cy*w+cx]+=1; } }
  let best=null;
  for(let ri=0;ri<nr;ri++){ const r=ri+r0, base=ri*w*h;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){ // somme 3x3 pour tolérer l'ellipse
      let v=0; for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Y=y+dy; if(X>=0&&Y>=0&&X<w&&Y<h) v+=acc[base+Y*w+X];}
      const sc=v/(2*Math.PI*r)*Math.sqrt(r/m);
      if(!best||sc>best.sc) best={sc,x,y,r}; } }
  return best&&{cx:best.x/k,cy:best.y/k,d:2*best.r/k,sc:best.sc};
}
function coinBox(img){ const f=findCoin(img); if(f&&f.full) return null; if(f) return f;
  try{ const W=img.naturalWidth||img.width, H=img.naturalHeight||img.height, h=houghCoin(img); if(h&&h.sc>0.08&&h.d<Math.min(W,H)*0.93) return h; }catch(e){}
  return null; }
function autoFit(){
  const f=coinBox(CR.img); if(!f) return;
  const W=CR.img.naturalWidth, H=CR.img.naturalHeight;
  const z=Math.min(4,Math.max(1,(2*CR.r)/(f.d*CR.base))), sc=CR.base*z;
  CR.z=z; CR.ox=-(f.cx-W/2)*sc; CR.oy=-(f.cy-H/2)*sc;
}
function cropRect(){ const {img,S,base,z,ox,oy}=CR, sc=base*z, w=img.naturalWidth*sc, h=img.naturalHeight*sc; return {x:S/2+ox-w/2,y:S/2+oy-h/2,w,h}; }
function drawCrop(){
  const {cv,dpr,S}=CR, c=cv.getContext("2d"), q=cropRect();
  c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,S,S); c.drawImage(CR.img,q.x,q.y,q.w,q.h);
}
function exportCrop(){
  const O=520, {S,r}=CR, q=cropRect(), k=O/(2*r), x0=S/2-r, y0=S/2-r;
  const cv=document.createElement("canvas"); cv.width=cv.height=O; const c=cv.getContext("2d");
  c.beginPath(); c.arc(O/2,O/2,O/2,0,Math.PI*2); c.closePath(); c.clip();
  c.drawImage(CR.img,(q.x-x0)*k,(q.y-y0)*k,q.w*k,q.h*k);
  return new Promise(res=>cv.toBlob(b=>res(b),"image/png"));
}
function openSheet(){
  const sh=$("#sheet");
  const keepCat=S.cat&&!isVirtual(S.cat)?S.cat:"";
  sh.innerHTML=`<form class="in" id="npForm">
    <h2>Ajouter ma pièce</h2>
    <div class="shot"><img id="npImg" src="${NP.cropUrl||NP.url}" alt="Photo de la nouvelle pièce"><div class="row">
      <button type="button" class="linkbtn" id="npRecrop">Recadrer</button>
      <button type="button" class="linkbtn" id="npRetake">Reprendre la photo</button>
      <label class="linkbtn" for="newGal">Choisir dans la galerie</label></div></div>
    <div class="fields">
      <label class="field full">Code (référence FR)<input id="np-ref" placeholder="Ex. FR77-4682" autocomplete="off" autocapitalize="characters"></label>
      <div class="full" id="npMatch"></div>
      <label class="field full">Nom de la pièce<input id="np-name" required placeholder="Ex. Stitch – Joyeux Noël"></label>
      <label class="field">Thème<select id="np-cat" required><option value="">Choisir…</option>${CATS.filter(c=>!c.virtual).map(c=>`<option value="${c.id}"${c.id===keepCat?" selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label class="field">Année<input id="np-year" inputmode="numeric" maxlength="4" required placeholder="${new Date().getFullYear()}" value="${new Date().getFullYear()}"></label>
      <label class="field full" id="npRevWrap" hidden>Revers / variante<select id="np-rev"></select></label>
      <label class="field full" id="npRevNewWrap" hidden>Nouveau revers<input id="np-revnew" placeholder="Ex. 26 MDP/EVM"></label>
    </div>
    <div class="row"><button class="btn" type="submit" id="npSave">Enregistrer la pièce</button><button class="btn ghost" type="button" id="npCancel">Annuler</button></div>
  </form>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0;
  $("#npRecrop").onclick=()=>{ NP.form=readForm(); if(NP.url) showCrop(); else showCamera(); };
  $("#npRetake").onclick=()=>{ NP.form=readForm(); showCamera(); };
  document.querySelectorAll('#sheet label[for="newCam"],#sheet label[for="newGal"]').forEach(l=>l.addEventListener("click",()=>{ NP.form=readForm(); }));
  if(NP.form) writeForm(NP.form);
  const saveDraft=()=>DRAFT.set({kind:"np",form:readForm(),rev:$("#np-rev").value,revnew:$("#np-revnew").value});
  $("#npForm").addEventListener("input",saveDraft); $("#npForm").addEventListener("change",saveDraft); saveDraft();
  $("#npCancel").onclick=()=>{ DRAFT.clear(); closeSheet(); };
  $("#np-ref").addEventListener("input",refreshMatch);
  $("#np-year").addEventListener("input",refreshRev);
  $("#np-rev").addEventListener("change",()=>{ $("#npRevNewWrap").hidden=$("#np-rev").value!=="__new"; });
  $("#npForm").addEventListener("submit",saveNew);
  refreshMatch();
  if(NP.rev&&[...$("#np-rev").options].some(o=>o.value===NP.rev)){ $("#np-rev").value=NP.rev; $("#npRevNewWrap").hidden=NP.rev!=="__new"; }
  if(NP.revnew) $("#np-revnew").value=NP.revnew;
}
function readForm(){ const g=id=>{const e=$(id); return e?e.value:"";}; return {ref:g("#np-ref"),name:g("#np-name"),cat:g("#np-cat"),year:g("#np-year")}; }
function writeForm(f){ $("#np-ref").value=f.ref||""; $("#np-name").value=f.name||""; if(f.cat) $("#np-cat").value=f.cat; if(f.year) $("#np-year").value=f.year; }
function curMatch(){ return findByRef(normRef($("#np-ref").value)); }
function refreshMatch(){
  const t=curMatch(), box=$("#npMatch");
  if(t){
    box.innerHTML=`<div class="match">Déjà au catalogue : <b>${esc(t.name)}</b> (${esc(catOf(catT(t)).name)}). Elle sera ajoutée à ta collection.</div>`;
    $("#np-name").value=t.name; $("#np-cat").value=catT(t);
  } else if(normRef($("#np-ref").value)){
    box.innerHTML=`<div class="match new">Code inconnu dans l'appli : une nouvelle fiche sera créée.</div>`;
  } else box.innerHTML="";
  refreshRev();
}
function refreshRev(){
  const t=curMatch(), y=parseInt($("#np-year").value,10);
  if(!t||!t.v){ $("#npRevWrap").hidden=true; $("#npRevNewWrap").hidden=true; return; }
  const opts=units(t).filter(x=>x.y===y);
  $("#np-rev").innerHTML=opts.map(x=>`<option value="${esc(x.k)}">${esc(x.r)}${x.q?` (déjà ${x.q})`:""}</option>`).join("")+`<option value="__new">Autre revers (pas dans la liste)</option>`;
  $("#npRevWrap").hidden=false; $("#npRevNewWrap").hidden=$("#np-rev").value!=="__new";
}
async function saveNew(ev){
  ev.preventDefault();
  const btn=$("#npSave"); btn.disabled=true; btn.textContent="Enregistrement…";
  const code=normRef($("#np-ref").value), name=$("#np-name").value.trim(), cat=$("#np-cat").value, year=$("#np-year").value.trim();
  if(!name||!cat||!/^\d{4}$/.test(year)){ toast("Remplis le nom, le thème et l'année"); btn.disabled=false; btn.textContent="Enregistrer la pièce"; return; }
  let ref=null; try{ ref=await storeBlob(NP.blob||await shrink(NP.file,700,.8)); }catch(e){ toast("Photo illisible, reprends-la"); btn.disabled=false; btn.textContent="Enregistrer la pièce"; return; }
  let t=findByRef(code), id;
  if(t){
    id=t.id; const u=st(id); const upd={};
    if(!u.f) upd.f=ref;
    if(t.v){
      let k=$("#np-rev").value;
      if(k==="__new"||!k){ const r=($("#np-revnew").value.trim()||(year.slice(2)+" (non précisé)")); k=year+"|"+r; upd.xv=(u.xv||[]).concat([[+year,r]]); }
      upd.vq={...(u.vq||{}),[k]:((u.vq||{})[k]||0)+1};
    } else upd.q=(u.q||0)+1;
    patch(id,upd);
  } else {
    id="c"+Date.now().toString(36);
    S.custom[id]={id,cat,name,ref:code?("JTC "+code):"",years:year};
    S.items[id]={q:1,f:ref};
    saveCustom(id);
  }
  DRAFT.clear(); closeSheet(); S.yr=""; S.cat=(t?catT(t):cat); S.q=""; $("#q").value=""; S.mosaic=true; render(); openPiece(id);
  toast(t?"Ajoutée à ta collection":"Pièce ajoutée et cochée");
}
function shrink(file,max,q){ return new Promise((res,rej)=>{ const img=new Image(); const u=URL.createObjectURL(file);
  img.onload=()=>{ const r=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement("canvas"); c.width=Math.round(img.width*r); c.height=Math.round(img.height*r);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(u); c.toBlob(b=>b?res(b):rej(),"image/jpeg",q); };
  img.onerror=rej; img.src=u; }); }
function toDataURL(blob){ return new Promise(r=>{const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob);}); }

/* ---------- appareil photo en direct, avec cercle dans le viseur ---------- */
let CAM=null;
function stopCam(){ if(CAM&&CAM.stream) CAM.stream.getTracks().forEach(t=>t.stop()); CAM=null; }
async function showCamera(){
  const sh=$("#sheet");
  sh.innerHTML=`<div class="in">
    <h2>${NP&&NP.search?"Pièce à retrouver":NP&&NP.target?(NP.target.side==="b"?"Photo du dos":"Photo de la face"):"Ajouter ma pièce"}</h2>
    <div class="cam" id="camBox"><video id="camV" playsinline autoplay muted></video><div class="crop-mask"></div><div class="crop-ring"></div></div>
    <p class="note" id="camMsg" style="text-align:center">Place la pièce dans le cercle, puis appuie sur le bouton doré.</p>
    <label class="field full">Zoom<input type="range" id="camZoom" min="1" max="3" step="0.01" value="1"></label>
    <div class="camrow"><label class="btn ghost" for="newGal">Galerie</label><button class="shutter" id="shot" aria-label="Prendre la photo"></button><button class="btn ghost" type="button" id="camCancel">Annuler</button></div>
  </div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0;
  $("#camCancel").onclick=closeSheet;
  const v=$("#camV"), zoom=$("#camZoom");
  zoom.oninput=()=>{ v.style.transform=`scale(${zoom.value})`; };
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1920}},audio:false});
    CAM={stream}; v.srcObject=stream; await v.play().catch(()=>{});
  }catch(err){
    $("#camMsg").innerHTML=`L'appareil photo n'a pas pu s'ouvrir ici. <label class="linkbtn" for="newCam">Utiliser l'appareil photo du téléphone</label>`;
    $("#shot").disabled=true; return;
  }
  $("#shot").onclick=async()=>{
    const box=$("#camBox"), Sz=box.clientWidth, vw=v.videoWidth, vh=v.videoHeight; if(!vw) return;
    const z=+zoom.value, sc=Math.max(Sz/vw,Sz/vh)*z, r=Sz*0.47;
    const cx=vw/2, cy=vh/2, rv=r/sc;                       // cercle exprimé en pixels vidéo
    const O=520, cv=document.createElement("canvas"); cv.width=cv.height=O; const c=cv.getContext("2d");
    c.beginPath(); c.arc(O/2,O/2,O/2,0,Math.PI*2); c.clip();
    c.drawImage(v,cx-rv,cy-rv,2*rv,2*rv,0,0,O,O);
    const blob=await new Promise(res=>cv.toBlob(res,"image/png"));
    stopCam(); gotBlob(blob);
  };
}
async function gotBlob(blob){
  if(NP&&NP.search){ photoSearch(blob); return; }
  NP.blob=blob; if(NP.cropUrl) URL.revokeObjectURL(NP.cropUrl); NP.cropUrl=URL.createObjectURL(blob);
  if(NP.target){ const {id,side}=NP.target, y=NP.y; const ref=await storeBlob(blob); patch(id,{[side]:ref}); closeSheet(); render();
    const back=()=>scrollTo(0,y||0); back(); requestAnimationFrame(back); setTimeout(back,150); toast("Photo enregistrée"); return; }
  idb.put("draft:np",blob).catch(()=>{});
  openSheet();
}
async function restoreDraft(){
  const d=DRAFT.get(); if(!d) return;
  if(d.kind==="np"){ const blob=await idb.get("draft:np").catch(()=>null); if(!blob){ DRAFT.clear(); return; }
    NP={blob,cropUrl:URL.createObjectURL(blob),form:d.form,rev:d.rev,revnew:d.revnew}; openSheet(); }
  if(d.kind==="yr"&&byId(d.id)) showAddYear(d.id,d);
}
function showPick(){
  const sh=$("#sheet");
  sh.innerHTML=`<div class="in">
    <h2>${NP&&NP.search?"Retrouver une pièce en photo":NP&&NP.target?"Photo de la pièce":"Ajouter ma pièce"}</h2>
    ${NP&&NP.search?`<p class="note">Prends la pièce en photo : l'appli la compare à toutes les photos déjà enregistrées (face et dos) et te montre celles qui lui ressemblent le plus.</p>`:""}
    <button type="button" class="pick" id="pickCam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Prendre une photo</button>
    <label class="pick alt" for="newGal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>Choisir dans ma galerie</label>
    <button type="button" class="linkbtn" id="pickCancel">Annuler</button></div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; $("#pickCancel").onclick=closeSheet; $("#pickCam").onclick=showCamera;
}
$("#fab").addEventListener("click",()=>{ NP={}; showPick(); });
$("#psBtn").addEventListener("click",()=>{ NP={search:true}; showPick(); });

/* ---------- recherche par photo : compare à toutes les photos déjà enregistrées (sur le téléphone, sans internet une fois prêt) ----------
   Reconnaissance d'image MobileNet (poids Keras, Apache 2.0) exécutée avec TensorFlow.js. Chaque photo est résumée une fois
   (« empreinte » gardée sur le téléphone), les nouvelles photos sont ajoutées toutes seules à la recherche suivante. */
const PS={net:null,emb:null};
function f16(h){ const o=new Float32Array(h.length); for(let i=0;i<h.length;i++){ const x=h[i], s=x&0x8000?-1:1, e=(x>>10)&31, m=x&1023;
  o[i]=e===0?s*m*5.960464477539063e-8:e===31?(m?NaN:s*Infinity):s*Math.pow(2,e-15)*(1+m/1024); } return o; }
async function psNet(){
  if(PS.net) return PS.net;
  if(!window.tf) await new Promise((res,rej)=>{ const sc=document.createElement("script"); sc.src="vendor/tf.min.js?v=1"; sc.onload=res; sc.onerror=()=>rej(new Error("tf")); document.head.appendChild(sc); });
  try{ await tf.setBackend("webgl"); }catch(e){} await tf.ready();
  const [L,buf]=await Promise.all([fetch("vendor/mobilenet/model.json?v=1").then(r=>r.json()),fetch("vendor/mobilenet/w.bin?v=1").then(r=>r.arrayBuffer())]);
  const w=f16(new Uint16Array(buf));
  PS.net=L.map(l=>{ const n=l.k.reduce((a,b)=>a*b,1), out=l.t==="d"?l.k[2]:l.k[3];
    return {t:l.t,s:l.s,K:tf.tensor(w.subarray(l.o,l.o+n),l.k),b:tf.tensor1d(w.subarray(l.o+n,l.o+n+out))}; });
  return PS.net;
}
// image -> carré 224 px, pièce dans un rond sur fond gris (comme les photos enregistrées), tourné de « ang » degrés
function psCanvas(img,ang){ const N=224, cv=document.createElement("canvas"); cv.width=cv.height=N; const c=cv.getContext("2d");
  c.fillStyle="#808080"; c.fillRect(0,0,N,N); c.save(); c.beginPath(); c.arc(N/2,N/2,N/2,0,Math.PI*2); c.clip();
  c.translate(N/2,N/2); c.rotate((ang||0)*Math.PI/180); const W=img.naturalWidth||img.width, H=img.naturalHeight||img.height;
  const f=coinBox(img); // pièce recadrée bord à bord, quelle que soit la photo
  if(f){ const k=N/f.d; c.drawImage(img,-f.cx*k,-f.cy*k,W*k,H*k); } else { const k=N/Math.min(W,H); c.drawImage(img,-W*k/2,-H*k/2,W*k,H*k); }
  c.restore(); return cv; }
function psEmbed(cv){ return tf.tidy(()=>{ let x=tf.browser.fromPixels(cv).toFloat().div(127.5).sub(1).expandDims(0);
  for(const l of PS.net){ x=l.t==="d"?tf.depthwiseConv2d(x,l.K,l.s,"same"):tf.conv2d(x,l.K,l.s,"same"); x=x.add(l.b).clipByValue(0,6); }
  const v=x.mean([1,2]).squeeze(); return v.div(v.norm()).dataSync().slice(); }); }
function psImg(blob){ return new Promise((res,rej)=>{ const u=URL.createObjectURL(blob), i=new Image(); i.onload=()=>{ URL.revokeObjectURL(u); res(i); }; i.onerror=()=>{ URL.revokeObjectURL(u); rej(new Error("img")); }; i.src=u; }); }
async function psBlob(ref){
  if(ref.startsWith("cat:")){ const r=await fetch(ref.slice(4)); return r.ok?await r.blob():null; }
  if(MEM[ref]) return MEM[ref];
  let b=await idb.get(ref).catch(()=>null); if(b) return b;
  if(ref.startsWith("sb:")&&UID){ const {data,error}=await supa.storage.from("photos").download(ref.slice(3)); if(!error&&data){ idb.put(ref,data).catch(()=>{}); return data; } }
  return null;
}
function psRefs(){ const out=[]; for(const id of Object.keys(S.items)){ if(id[0]==="_") continue; const it=S.items[id]; if(!byId(id)) continue;
  for(const side of ["f","b"]) if(it[side]&&typeof it[side]==="string"&&!REMOVED[it[side]]) out.push({id,side,ref:it[side]}); }
  // + photos du catalogue fournies avec l'appli (Disney, Beauval) : retrouve aussi celles que Nico n'a pas encore prises en photo
  for(const [id,p] of Object.entries(PHOTOS)) if(p.f&&/^img\//.test(String(p.f.src))&&byId(id)) out.push({id,side:"f",ref:"cat:"+p.f.src});
  return out; }
/* apprentissage en arrière-plan : dès qu'une photo arrive (nouvelle, ou au démarrage pour celles pas encore apprises),
   pour que la recherche n'ait jamais rien à apprendre */
async function psLoadEmb(){ if(!PS.emb){ let e=null; try{ e=await idb.get("ps:emb2"); }catch(x){} PS.emb=PS.emb||e||{}; } return PS.emb; }
function psSave(){ clearTimeout(PS.st); PS.st=setTimeout(()=>idb.put("ps:emb2",PS.emb).catch(()=>{}),800); }
async function psRename(a,b){ await psLoadEmb(); if(PS.emb[a]&&!PS.emb[b]){ PS.emb[b]=PS.emb[a]; delete PS.emb[a]; psSave(); } }
let PSRUN=false;
async function psLearnSoon(){
  if(PSRUN) { PS.again=true; return; } PSRUN=true;
  try{ do{ PS.again=false;
      await psLoadEmb(); const todo=psRefs().filter(r=>!PS.emb[r.ref]); if(!todo.length) break;
      await psNet();
      for(const r of todo){ if(PS.busy) break; if(PS.emb[r.ref]) continue;
        try{ const b=await psBlob(r.ref); if(b){ PS.emb[r.ref]=Array.from(psEmbed(psCanvas(await psImg(b),0)),x=>Math.round(x*1e4)/1e4); psSave(); } }catch(e){}
        await new Promise(res=>setTimeout(res,250)); }      // doucement, pour ne pas ralentir l'appli
    }while(PS.again&&!PS.busy);
  }catch(e){} finally{ PSRUN=false; }
}
async function photoSearch(blob){
  const sh=$("#sheet"); let stop=false;
  sh.innerHTML=`<div class="in"><h2>Je cherche…</h2><p class="note" id="psMsg">Préparation de la reconnaissance d'image…</p><div class="psbar"><i id="psBar"></i></div>
    <button type="button" class="linkbtn" id="psCancel">Annuler</button></div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; $("#psCancel").onclick=()=>{ stop=true; closeSheet(); };
  const msg=t=>{ const m=$("#psMsg"); if(m) m.textContent=t; }, bar=f=>{ const b=$("#psBar"); if(b) b.style.width=Math.round(f*100)+"%"; };
  try{
    PS.busy=true; await psNet(); if(stop) return;
    await psLoadEmb();
    const refs=psRefs(), todo=refs.filter(r=>!PS.emb[r.ref]);
    if(!refs.length){ sh.innerHTML=`<div class="in"><h2>Aucune photo enregistrée</h2><p class="note">La recherche compare aux photos déjà prises dans l'appli. Ajoute des photos à tes pièces, puis réessaie.</p><button type="button" class="btn" id="psClose">OK</button></div>`; $("#psClose").onclick=closeSheet; return; }
    let n=0, miss=0;
    for(const r of todo){ if(stop) return;
      msg(`J'apprends tes photos (une seule fois) : ${n+1} / ${todo.length}`); bar(n/todo.length); n++;
      try{ const b=await psBlob(r.ref); if(!b){ miss++; continue; } PS.emb[r.ref]=Array.from(psEmbed(psCanvas(await psImg(b),0)),x=>Math.round(x*1e4)/1e4); }catch(e){ miss++; }
      if(n%20===0) idb.put("ps:emb2",PS.emb).catch(()=>{});
      await new Promise(r=>setTimeout(r,0)); }
    if(todo.length) idb.put("ps:emb2",PS.emb).catch(()=>{});
    PS.busy=false;
    msg("Je compare…"); bar(1);
    const img=await psImg(blob), Q=[]; for(let a=0;a<360;a+=30) Q.push(psEmbed(psCanvas(img,a)));
    const best={};
    for(const r of refs){ const e=PS.emb[r.ref]; if(!e) continue; let m=-1;
      for(const q of Q){ let d=0; for(let i=0;i<q.length;i++) d+=q[i]*e[i]; if(d>m) m=d; }
      if(!best[r.id]||m>best[r.id].s) best[r.id]={id:r.id,s:m,ref:r.ref}; }
    const top=Object.values(best).sort((a,b)=>b.s-a.s).slice(0,6);
    const mine=URL.createObjectURL(blob);
    sh.innerHTML=`<div class="in"><h2>Ça ressemble à…</h2>
      <div class="psme"><img src="${mine}" alt="Ta photo"><p class="note">Touche la bonne pièce pour ouvrir sa fiche.${miss?` <br>(${miss} photo${miss>1?"s":""} pas accessible${miss>1?"s":""} pour l'instant, réessaie avec internet.)`:""}</p></div>
      <div class="psres">${top.map((r,i)=>{ const t=byId(r.id); return `<button type="button" class="psit" data-psopen="${esc(r.id)}">
        ${r.ref.startsWith("cat:")?`<img src="${esc(r.ref.slice(4))}" alt="">`:`<img data-ph="${esc(r.ref)}" src="${ownSrc(r.ref)}" alt="">`}<span><b>${esc(t.name)}</b><small>${esc(t.ref||"")} · ${esc(t.years||"")}</small></span>${i===0?`<em>${top[1]&&r.s-top[1].s>=0.05?"Très probable":"Le plus proche"}</em>`:""}</button>`; }).join("")}</div>
      <p class="note">Pas dedans ? Soit la pièce n'a pas encore de photo dans l'appli, soit refais la photo plus nette, bien dans le cercle.</p>
      <div class="row"><button type="button" class="btn ghost" id="psAgain">Autre photo</button><button type="button" class="btn ghost" id="psClose">Fermer</button></div></div>`;
    $("#psClose").onclick=closeSheet; $("#psAgain").onclick=()=>{ NP={search:true}; showPick(); };
  }catch(e){
    sh.innerHTML=`<div class="in"><h2>Recherche impossible</h2><p class="note">La reconnaissance d'image n'a pas pu démarrer sur ce téléphone (${esc(e&&e.message||String(e))}). Vérifie la connexion internet la première fois, puis réessaie.</p><button type="button" class="btn" id="psClose">OK</button></div>`;
    $("#psClose").onclick=closeSheet;
  }finally{ PS.busy=false; }
}
["#newCam","#newGal"].forEach(sel=>$(sel).addEventListener("change",e=>{ const f=e.target.files[0]; if(!f) return; stopCam();
  NP=NP||{}; if(NP.url) URL.revokeObjectURL(NP.url); NP.file=f; NP.url=URL.createObjectURL(f); showCrop(); e.target.value=""; }));

/* ---------- ajout manuel ---------- */
const DRAFT={ get(){ return ls.get("nico_draft"); }, set(d){ ls.set("nico_draft",d); }, clear(){ try{localStorage.removeItem("nico_draft")}catch(e){} idb.put("draft:np",null).catch(()=>{}); } };
function showAdd(){ S.addOpen=true; saveView(); rerender(); setTimeout(()=>{ const f=$("#add-name"); if(f){ f.scrollIntoView({block:"center"}); } },50); }
function addFormHTML(){
  const d=DRAFT.get(); const v=d&&d.kind==="add"&&d.cat===S.cat?d:{};
  return `<form class="panel" id="addForm"><h2>Nouvelle médaille – ${esc(catOf(S.cat).name)}</h2>
   <p class="note">Ta saisie est gardée si tu quittes l'appli pour chercher une info.</p>
   <div class="fields">
    <label class="field full">Nom<input id="add-name" required placeholder="Ex. Stitch 2026" value="${esc(v.name||"")}"></label>
    <label class="field">Référence officielle<input id="add-ref" placeholder="Ex. FR77-4500" value="${esc(v.ref||"")}"></label>
    <label class="field">Année(s)<input id="add-years" inputmode="numeric" placeholder="2026" value="${esc(v.years||"")}"></label>
    <label class="field full">Note<input id="add-note" placeholder="Variante, tirage…" value="${esc(v.note||"")}"></label></div>
   <div class="row"><button class="btn" type="submit">Ajouter</button><button class="btn ghost" type="button" id="cancelAdd">Annuler</button></div></form>`;
}
function bindAdd(){
  const f=$("#addForm"); if(!f) return;
  const save=()=>DRAFT.set({kind:"add",cat:S.cat,name:$("#add-name").value,ref:$("#add-ref").value,years:$("#add-years").value,note:$("#add-note").value});
  f.addEventListener("input",save);
  $("#cancelAdd").onclick=()=>{ S.addOpen=false; DRAFT.clear(); saveView(); rerender(); };
  f.onsubmit=ev=>{ ev.preventDefault();
    const id="c"+Date.now().toString(36);
    S.custom[id]={id,cat:S.cat,name:$("#add-name").value.trim(),ref:$("#add-ref").value.trim(),years:$("#add-years").value.trim(),note:$("#add-note").value.trim()};
    S.addOpen=false; DRAFT.clear(); saveView(); saveCustom(id); render(); toast("Médaille ajoutée"); };
}


/* ---------- écran de chargement : on attend que la collection soit à jour avant de laisser toucher ---------- */
let BOOT=true, BOOTT=null;
function showBoot(msg){ BOOT=true; $("#bootMsg").textContent=msg||"Mise à jour de ta collection…"; $("#boot").hidden=false;
  clearTimeout(BOOTT); BOOTT=setTimeout(()=>bootDone("Connexion lente : la mise à jour continue en arrière-plan."),15000); }
function bootMsg(m){ if(BOOT) $("#bootMsg").textContent=m; }
function bootDone(msg){ clearTimeout(BOOTT); if(!BOOT) return; BOOT=false; $("#boot").hidden=true; if(msg) toast(msg);
  setTimeout(()=>psLearnSoon(),8000); } // photos pas encore apprises par la recherche par photo : apprises en fond
/* ---------- démarrage ---------- */
async function loadCatalogue(){
  const r=await fetch("catalogue.json",{cache:"no-cache"}); const c=await r.json();
  CATS=c.cats; CATALOG=c.tokens; PHOTOS=c.photos||{}; CATALOG_DATE=c.updated||""; LEGACY=c.legacy||{}; CJT_OWN=c.cjtOwn||{}; CJT_DATE=c.cjtDate||""; RESET_OWN=c.resetOwn||""; RESET_BACK=c.resetBack||"";
  NEWY=Math.max(...CATALOG.filter(t=>t.cat!=="disney"&&t.cat!=="beauval").flatMap(t=>t.v?t.v.map(v=>+v[0]):[parseInt(t.years,10)||0]));
  CATALOG.forEach(t=>{ if(t.np&&!PHOTOS[t.id]) PHOTOS[t.id]=t.np; });
}
async function start(){
  S.nearR=ls.get("nico_nearR")||10; S.filter=ls.get("nico_filter")||null; S.items=ls.get("nico_items")||{}; S.custom=ls.get("nico_custom")||{};
  showBoot("Chargement du catalogue…");
  try{ await Promise.all([loadCatalogue(),loadGeo()]); }catch(e){ bootDone(); $("#view").innerHTML='<div class="empty">Impossible de charger le catalogue. Vérifie ta connexion et relance l\'appli.</div>'; return; }
  // retour au même écran seulement si l'appli a été quittée il y a moins de 30 min (sinon on repart de l'accueil)
  let vw=ls.get("nico_view"); if(vw&&!(Date.now()-(vw.t||0)<30*60e3)) vw=null;
  if(vw&&vw.cat&&hasCat(vw.cat)){ S.cat=vw.cat; S.mosaic=vw.mosaic; S.addOpen=vw.add; }
  if(vw){ S.q=vw.q||""; S.homeQ=vw.hq||""; $("#q").value=S.q; }
  render(); checkRobot();
  if(vw&&vw.piece&&byId(vw.piece)) openPiece(vw.piece);
  restoreDraft();
  const {data:{session}}=await supa.auth.getSession();
  if(!session){ bootDone(); showLogin(); return; }
  bootMsg(Object.keys(Q()).length?"Envoi de tes dernières coches…":"Mise à jour de ta collection…");
  UID=session.user.id; setSync("wait","Synchronisation…"); pull(); retryPhotos(true);
}
function showLogin(){
  $("#login").hidden=false;
  $("#loginForm").onsubmit=async ev=>{ ev.preventDefault(); const b=$("#lg-btn"), er=$("#lg-err"); er.hidden=true; b.disabled=true; b.textContent="Connexion…";
    const {data,error}=await supa.auth.signInWithPassword({email:$("#lg-mail").value.trim(),password:$("#lg-pass").value});
    b.disabled=false; b.textContent="Se connecter";
    if(error){ er.textContent=navigator.onLine?"E-mail ou mot de passe incorrect.":"Pas de réseau : connecte-toi une première fois avec internet."; er.hidden=false; return; }
    $("#login").hidden=true; showBoot(); UID=data.user.id; setSync("wait","Synchronisation…"); pull(); retryPhotos(true); };
}
window.addEventListener("online",flush);
let HIDDENAT=0;
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden"){ HIDDENAT=Date.now(); if(UID&&Object.keys(Q()).length){ clearTimeout(flushTimer); flush(); } } // on réduit l'appli : envoi immédiat
  if(document.visibilityState==="visible"){ checkRobot(); if(UID){ if(HIDDENAT&&Date.now()-HIDDENAT>60e3&&navigator.onLine) showBoot(); pull(); } setTimeout(retryPhotos,300); } });
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
/* ---------- bouton « retour » du téléphone : revient à l'écran précédent au lieu de fermer l'appli ---------- */
let ARMED=false;
const zoomOpen=()=>{ const z=$("#zoom"); return !!(z&&!z.hidden); };
function atRoot(){ return !S.cat && !S.near && !S.q && $("#sheet").hidden && !zoomOpen() && !S.addOpen; }
function arm(){ if(!ARMED && !atRoot()){ try{ history.pushState({medaillier:1},""); ARMED=true; }catch(e){} } }
let HOMEY=0;
function backHome(){ const y=HOMEY||0, go=()=>scrollTo(0,y); go(); requestAnimationFrame(go); setTimeout(go,120); }
function exitNear(){ S.near=false; S.q=S.homeQ||""; $("#q").value=S.q; render(); backHome(); }
function goBack(){
  const ae=document.activeElement; if(ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){ ae.blur(); return; }
  if(zoomOpen()){ closeZoom(); return; }
  if(!$("#sheet").hidden){ if($("#sheet .piece")) closePiece(); else { if($("#npForm")||$("#yrForm")) DRAFT.clear(); closeSheet(); } return; }
  if(S.addOpen){ S.addOpen=false; DRAFT.clear(); render(); return; }
  if(S.near&&!S.cat){ exitNear(); return; }
  if(S.cat && !S.mosaic){ S.mosaic=true; render(); scrollTo(0,0); return; }   // liste -> mosaïque
  if(S.cat){ OPEN.clear(); S.mosaic=false; S.cat=null; S.q=S.homeQ||""; $("#q").value=S.q; render(); backHome(); return; } // thème -> accueil (recherche retrouvée)
  if(S.q){ S.q=""; S.homeQ=""; $("#q").value=""; render(); return; }
}
window.addEventListener("popstate",()=>{ ARMED=false; goBack(); setTimeout(arm,0); });
new MutationObserver(()=>arm()).observe(document.body,{subtree:true,attributes:true,attributeFilter:["hidden"],childList:true});
start();
