/* Médaillier de Nico — appli installable (PWA)
   Données : catalogue.json (public) + collection de Nico dans Supabase (privée, protégée par compte). */
"use strict";
let CATS=[], CATALOG=[], PHOTOS={}, CATALOG_DATE="", LEGACY={}, CJT_OWN={}, CJT_DATE="";
const IMPORT_CJT=true;
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
function units(t){ const u=st(t.id);
  if(t.v) return t.v.concat((u.xv||[]).filter(([y,r])=>!t.v.some(v=>v[0]==y&&v[1]===r))).map(([y,r,c])=>{const k=y+"|"+r; return {k,y,r,c:c||null,q:(u.vq||{})[k]||0};});
  return [{k:"_",y:yearOf(t),r:t.rev||"",q:u.q||0,c:null}]; }
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
  return true;
}
function matches(t,q){
  if(!q) return true;
  const hay=norm([t.ref,t.name,t.site,t.years,t.dept,t.note,t.metal,catOf(catT(t)).name].join(" "));
  return norm(q).split(/\s+/).filter(Boolean).every(w=>hay.includes(w));
}
function stats(list){
  let total=0,own=0,qty=0,dup=0,spent=0,value=0;
  list.forEach(t=>{const e=eff(t); e.us.forEach(x=>{ total++; if(x.q>0){own++; qty+=x.q; dup+=x.q-1; value+=(x.c??e.val??0)*x.q;} }); spent+=(e.paid||0)*e.qty;});
  return {total,own,missing:total-own,qty,dup,spent,value};
}

/* ---------- photos perso : stockage local (IndexedDB) + en ligne (Supabase Storage) ---------- */
const BLANK="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const URLS={}, LOADING={};
const idb=(()=>{ let p=null; const open=()=>p||(p=new Promise((res,rej)=>{ const r=indexedDB.open("medaillier",1); r.onupgradeneeded=()=>r.result.createObjectStore("photos"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }));
  const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{ const t=db.transaction("photos",mode); const st=t.objectStore("photos"); const q=fn(st); t.oncomplete=()=>res(q&&q.result); t.onerror=()=>rej(t.error); }));
  return { get:k=>tx("readonly",s=>s.get(k)), put:(k,v)=>tx("readwrite",s=>s.put(v,k)) }; })();
function ownSrc(ref){ if(!ref) return ""; if(URLS[ref]) return URLS[ref]; loadPhoto(ref); return BLANK; }
async function loadPhoto(ref){
  if(LOADING[ref]) return; LOADING[ref]=true;
  try{
    let blob=await idb.get(ref).catch(()=>null);
    if(!blob && ref.startsWith("sb:") && supa){ const {data,error}=await supa.storage.from("photos").download(ref.slice(3)); if(!error&&data){ blob=data; idb.put(ref,blob).catch(()=>{}); } }
    if(blob){ URLS[ref]=URL.createObjectURL(blob); document.querySelectorAll(`img[data-ph="${CSS.escape(ref)}"]`).forEach(i=>i.src=URLS[ref]); }
  }finally{ LOADING[ref]=false; }
}
async function storeBlob(blob){
  const key="idb:"+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
  await idb.put(key,blob); URLS[key]=URL.createObjectURL(blob); return key;
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
function patch(id,obj){
  const cur={...(S.items[id]||{}),...obj};
  Object.keys(cur).forEach(k=>{ if(cur[k]===""||cur[k]==null) delete cur[k]; });
  if(cur.vq){ Object.keys(cur.vq).forEach(k=>{ if(!cur.vq[k]) delete cur.vq[k]; }); if(!Object.keys(cur.vq).length) delete cur.vq; }
  if(cur.hv && !Object.keys(cur.hv).length) delete cur.hv;
  if(!cur.q && !cur.vq && !cur.xv && !cur.hv && !cur.f && !cur.b && !cur.mv) delete S.items[id]; else S.items[id]=cur;
  if(S.custom[id]) saveCustom(id); else saveItem(id);
}
function setSync(state,txt){ const el=$("#status"); el.innerHTML=`<span class="sync ${state}"><i></i>${esc(txt)}</span>${UID?'<button class="logout" id="logoutBtn">Se déconnecter</button>':""}`; }
async function uploadPending(id){
  const it=S.items[id]; if(!it) return;
  for(const side of ["f","b"]){
    const ref=it[side]; if(!ref||!ref.startsWith("idb:")) continue;
    const blob=await idb.get(ref); if(!blob){ delete it[side]; continue; }
    const path=`${UID}/${id}_${side}_${Date.now()}.png`;
    const {error}=await supa.storage.from("photos").upload(path,blob,{contentType:blob.type||"image/png",upsert:true});
    if(error) throw error;
    const nref="sb:"+path; await idb.put(nref,blob).catch(()=>{}); URLS[nref]=URLS[ref]; it[side]=nref;
  }
}
async function flush(){
  if(!UID||syncing) return; const q=Q(); const ids=Object.keys(q); if(!ids.length){ setSync("ok","Tout est sauvegardé en ligne"); return; }
  if(!navigator.onLine){ setSync("wait","Hors ligne : enregistré sur le téléphone, envoi au retour du réseau"); return; }
  syncing=true; setSync("wait","Sauvegarde en cours…"); let failed=false;
  try{
    for(const id of ids){
      if(id==="_prefs"){ const {error}=await supa.from("collection").upsert({user_id:UID,token_id:"_prefs",data:{...S.prefs,seeded:true},updated_at:new Date().toISOString()}); if(error) throw error; }
      else if(S.items[id]||S.custom[id]){
        await uploadPending(id); persistLocal();
        const data={...(S.items[id]||{})}; if(S.custom[id]) data._custom=S.custom[id];
        const {error}=await supa.from("collection").upsert({user_id:UID,token_id:id,data,updated_at:new Date().toISOString()}); if(error) throw error;
      } else { const {error}=await supa.from("collection").delete().eq("token_id",id); if(error) throw error; }
      const cur=Q(); delete cur[id]; ls.set("nico_queue",cur);
    }
    setSync("ok","Tout est sauvegardé en ligne");
  }catch(e){ console.warn(e); failed=true; setSync("off","Envoi impossible pour l'instant, nouvel essai automatique"); clearTimeout(retryTimer); retryTimer=setTimeout(flush,30000); }
  finally{ syncing=false; if(!failed&&Object.keys(Q()).length) setTimeout(flush,800); }
}
async function pull(){
  if(!UID) return;
  if(syncing){ setTimeout(pull,1500); return; }
  const t0=Date.now();
  let data=null, error=null;
  try{ ({data,error}=await supa.from("collection").select("token_id,data")); }catch(e){ error=e; }
  if(error){ setSync("off","Serveur injoignable : tu travailles sur la copie du téléphone");
    if(navigator.onLine){ ALERT.server="Le serveur de sauvegarde ne répond pas (peut-être en pause). Tes coches restent sur le téléphone."; showAlert(); }
    return; }
  if(ALERT.server){ ALERT.server=""; showAlert(); }
  const items={}, custom={}; let prefs=null;
  data.forEach(r=>{ if(r.token_id==="_prefs"){ prefs=r.data; return; } const d={...r.data}; if(d._custom){ custom[r.token_id]=d._custom; delete d._custom; } if(Object.keys(d).length) items[r.token_id]=d; });
  const q=Q(); Object.keys(EDIT).forEach(id=>{ if(EDIT[id]>=t0-2000) q[id]=1; });
  Object.keys(q).forEach(id=>{ if(S.items[id]) items[id]=S.items[id]; else delete items[id]; if(S.custom[id]) custom[id]=S.custom[id]; else delete custom[id]; });
  if(!(prefs&&prefs.seeded) && !q._prefs){
    // premier lancement : on reprend ce qui avait été coché localement + les variantes vertes du tableau de Nico
    Object.assign(items,S.items); Object.assign(custom,S.custom); applyPreset(items);
    S.items=items; S.custom=custom; persistLocal();
    Object.keys(items).concat(Object.keys(custom)).forEach(id=>{ const c=Q(); c[id]=1; ls.set("nico_queue",c); });
    queue("_prefs");
  } else { S.items=items; S.custom=custom; persistLocal(); }
  S.prefs={...(ls.get("nico_prefs")||{}),...(prefs||{}),...S.prefs,seeded:true}; upgrade();
  render(); flush();
}

/* ---------- bandeau d'alerte (bilan du robot Supabase + serveur injoignable) ---------- */
const ALERT={robot:"",server:""};
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
function mosaicHTML(list,mode){
  if(!list.length) return `<div class="empty">Aucune médaille ne correspond${S.filter?" avec ce filtre":""}.</div>`;
  const byL=mode==="letter", none=byL?"#":"Sans année", groups=new Map();
  list.forEach(t=>{ const k=byL?letterOf(t):(yearOf(t)||none); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(t); });
  const keys=[...groups.keys()].sort((a,b)=>(a===none)-(b===none)||a.localeCompare(b));
  const idx=byL?`<nav class="mabc">${keys.map(k=>`<button data-ml="ml-${k==="#"?"0":k}">${esc(k)}</button>`).join("")}</nav>`:"";
  // une ligne par année : étiquette à gauche (année + compte), pièces à droite
  return `<p class="mhint">Touche une pièce pour ouvrir sa fiche, ou ${byL?"une lettre":"une année"} pour la voir dans la liste.</p>`+idx+keys.map(k=>{
    const ts=groups.get(k), own=ts.filter(t=>eff(t).qty>0).length;
    return `<section class="mrow"${byL?` id="ml-${k==="#"?"0":k}"`:""}><button class="mlab${own===ts.length?" full":""}" data-j${byL?"l":"y"}="${esc(k)}" aria-label="${esc(k)} : ${own} sur ${ts.length} possédée${own>1?"s":""}"><b>${esc(k==="Sans année"?"?":k)}</b><small>${own}/${ts.length}</small></button><div class="mgrid four">${ts.map(mtileHTML).join("")}</div></section>`; }).join("");
}
function mtileHTML(t){
  const e=eff(t), np=PHOTOS[t.id]||{}, own=e.qty>0;
  let img="";
  if(e.f) img=`<img src="${esc(ownSrc(e.f))}" data-ph="${esc(e.f)}" alt="" loading="lazy">`;
  else if(np.f) img=`<img src="${esc(String(np.f.src).replace("-original.jpg","-180.jpg"))}" alt="" loading="lazy">`;
  const short=esc(String(t.name).replace(/^(Disneyland( Resort)? Paris|ZooParc de Beauval)\s*[-–:]?\s*/i,"").slice(0,28));
  return `<button class="mtile${own?" own":""}" data-jt="${t.id}" aria-label="${esc(t.name)}${own?" (possédée)":" (manquante)"}">${img||`<span class="mph">${short}</span>`}${own?'<span class="mok">✓</span>':""}</button>`;
}
let KEEPY=false, moreObs=null;
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
function render(){ renderMain(); if(PIECE&&$("#sheet .piece")) renderPiece(); }
function renderMain(){
  $("#backBtn").hidden=!S.cat;
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
  if(!S.cat && !S.q){ v.innerHTML=homeHTML(); renderFoot(allTokens(),"Toute la collection"); return; }
  const pool=allTokens().filter(t=>(!S.cat||inCat(t,S.cat)));
  const list=pool.filter(t=>matches(t,S.q)&&passFilter(t)).sort(mmode==="letter"?((a,b)=>a.name.localeCompare(b.name,"fr")):((a,b)=>String(a.years).localeCompare(String(b.years))||a.name.localeCompare(b.name)));
  if(mos){ v.innerHTML=mosaicHTML(list,mmode); renderFoot(pool,"Total "+catOf(S.cat).name); return; }
  if(!S.cat&&S.q){ const dm=matchDeps(S.q).map(c=>c.id); if(dm.length){ const first=t=>dm.includes(catT(t))||(t.dept&&dm.includes("d"+t.dept))?0:1; list.sort((a,b)=>first(a)-first(b)); } } // pièces du département tapé en premier
  const vk=[S.cat,S.q,S.filter].join("§"); if(vk!==VIEWKEY){ VIEWKEY=vk; S.shown=PAGE; }
  S.list=list; const part=list.slice(0,S.shown), rest=list.length-part.length;
  let h="";
  if(!S.cat){ const dm=matchDeps(S.q); if(dm.length) h+=`<p class="sect-title">Département${dm.length>1?"s":""}</p><div class="deps">${depTiles(dm,groupByCat())}</div>`;
    h+=`<p class="sect-title">${list.length} pièce${list.length>1?"s":""} trouvée${list.length>1?"s":""}</p>`; }
  h+= list.length?`<div class="list">${part.map(cardHTML).join("")}</div>${rest>0?`<button class="addbtn more" id="moreBtn">Afficher la suite (${rest} pièce${rest>1?"s":""})</button>`:""}`:`<div class="empty">Aucune médaille ne correspond${S.filter?" avec ce filtre":""}.</div>`;
  if(S.cat&&!isVirtual(S.cat)) h+=`<button class="addbtn" id="addBtn">+ Ajouter une médaille absente du catalogue</button><div id="addPanel"></div>`;
  const y0=scrollY; v.innerHTML=h; if(KEEPY){ scrollTo(0,y0); KEEPY=false; }
  watchMore();
  renderFoot(S.cat?pool:list, S.cat?"Total "+catOf(S.cat).name:"Total des résultats");
}
function catMeta(all){ const l=S.filter?all.filter(passFilter):all, s=stats(all), pct=s.total?Math.round(s.own/s.total*100):0;
  return {l,s,pct,f:S.filter?`<span class="meta">${l.length} jeton${l.length>1?"s":""} ${({own:"possédé",missing:"avec un manque",dup:"avec doublon",hugo:"avec Hugo"})[S.filter]}${l.length>1&&S.filter==="own"?"s":""}</span>`:""}; }
function groupByCat(){ const g={}; allTokens().forEach(t=>{ const k=catT(t); (g[k]=g[k]||[]).push(t); }); return g; }
// ronds des départements (accueil et recherche) : blason en transparence sous le numéro, anneau = progression
function depTiles(cats,groups){ return cats.map(c=>{ const all=groups[c.id]||[]; if(!all.length) return ""; const m=catMeta(all); if(S.filter&&!m.l.length) return "";
  return `<button class="dep" data-cat="${c.id}" style="--c1:${c.c1};--c2:${c.c2};--p:${m.pct}" aria-label="${esc(c.num)} ${esc(c.name)} : ${m.s.own} sur ${m.s.total} possédées"><span class="dnum"><b>${esc(c.num)}</b></span><span class="dname">${esc(c.name)}</span></button>`; }).join(""); }
// « 77 », « 7 », « 2a », « seine »… -> départements dont le numéro ou le nom correspond
function matchDeps(q){ const n=norm(q).trim(); if(!n) return [];
  const num=/^\d{1,3}$|^2[ab]$/.test(n);
  return CATS.filter(c=>c.dep&&c.num&&(num?(n.length>=2?String(c.num).toLowerCase()===n:(c.num==="0"+n||String(c.num).startsWith(n))):n.length>=3&&norm(c.name).includes(n))); }
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
    <p class="sect-title">Départements</p><div class="deps">${deps||'<div class="empty">Aucun département avec ce filtre.</div>'}</div>
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
    return `<div class="vrow${x.q>0?" on":""}"><button class="vtog" data-vt="${esc(key)}" aria-pressed="${x.q>0}"><span class="dot">${x.q>0?"✓":""}</span>${x.y||x.r?`${x.y?`<span class="vy">${x.y}</span>`:""}${x.r?`<span class="vr">${esc(x.r)}</span>`:""}`:`<span class="vr">Sans année</span>`}</button>
      <div class="stepper sm"><button data-vd="${esc(key)}" aria-label="Retirer une">−</button><span>${x.q}</span><button data-vi="${esc(key)}" aria-label="Ajouter une">+</button></div>${hugoBtn(t,x.k)}</div>`; }).join("");
  if(n===1) return `<div class="vars single"><div class="vlist">${rows}</div></div>`; // une seule ligne : pas de menu à ouvrir
  return `<details class="vars"${OPEN.has(t.id)?" open":""} data-vid="${t.id}"><summary><b>${own} / ${n}</b> variante${n>1?"s":""} possédée${n>1?"s":""} <span class="chev">▾</span></summary><div class="vlist">${rows}</div></details>`; }
const OPEN=new Set();
// Case « Hugo » : simple info cochée par ligne (variante ou pièce), sans effet sur les totaux de Nico
function hugoBtn(t,k){ const on=!!((st(t.id).hv||{})[k]); return `<button class="hugo${on?" on":""}" data-hu="${esc(t.id+"~"+k)}" role="switch" aria-checked="${on}" aria-label="Hugo"><span class="htxt">Hugo</span><span class="hknob"></span></button>`; }
function cjtUrl(t){ const m=/[A-Z]{2}[0-9AB]{2}-(\d{4})/.exec(t.ref||""); return m?"https://www.collection-jetons-touristiques.com/jeton/"+parseInt(m[1],10):""; }
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
function photoBlock(t,e,sf,sb,faceOnly){
  const nl=`<a class="nlink" href="${numUrl(t)}" target="_blank" rel="noopener">${t.n?"Voir les photos sur Numista":"Chercher les photos sur Numista"} ↗</a>`;
  if(!sf&&!sb) return `<div class="phrow">${plusMini(t,"f"," inrow")}${plusMini(t,"b"," inrow")}<span class="lnk">${nl}${cjtLink(t)}</span></div>`;
  const repl=(!e.f&&sf)||(!e.b&&sb&&!faceOnly)?`<div class="addrow">${!e.f&&sf?`<button class="addph" data-photo="${t.id}" data-side="f">+ Ma photo (face)</button>`:""}${!e.b&&sb&&!faceOnly?`<button class="addph" data-photo="${t.id}" data-side="b">+ Ma photo (dos)</button>`:""}</div>`:"";
  let faces;
  if(faceOnly) faces=sf?`<div class="faces one">${picHTML(t,"f",sf)}${backMini(t,sb)}</div>`:`<div class="phrow">${plusMini(t,"f"," inrow")}${backMini(t,sb).replace('class="backmini','class="backmini inrow')}<span class="lnk">${nl}${cjtLink(t)}</span></div>`;
  else if(sf&&sb) faces=`<div class="faces">${picHTML(t,"f",sf)}${picHTML(t,"b",sb)}</div>`;
  else if(sf) faces=`<div class="faces one">${picHTML(t,"f",sf)}${plusMini(t,"b")}</div>`;
  else faces=`<div class="faces one">${picHTML(t,"b",sb)}${plusMini(t,"f"," left")}</div>`;
  return faces+creditHTML([sf,sb])+repl;
}
function creditHTML(ps){
  const c=[...new Set(ps.filter(p=>p&&p.by).map(p=>p.by==="Numista"?p.lic:`© ${p.by} – ${p.lic}`))];
  return c.length?`<div class="credit">Photo${c.length>1?"s":""} ${c.map(esc).join(" · ")} · Source : Numista</div>`:"";
}
function cardHTML(t){
  const e=eff(t); const own=e.qty>0; const faceOnly=!!t.v;
  const np=PHOTOS[t.id]||{};
  const side=k=>{ if(e[k]) return {src:ownSrc(e[k]),own:true,ph:e[k]}; if(np[k]) return {src:np[k].src,by:np[k].by,lic:np[k].lic}; return null; };
  const sf=side("f"), sb=faceOnly?(e.b?{src:ownSrc(e.b),own:true,ph:e.b}:null):side("b");
  const hasPh=!!(sf||sb);
  const coin=l=>`<span class="ncoin"><span class="blank"></span><small>${l}</small></span>`;
  const dup=e.us.reduce((a,x)=>a+Math.max(0,x.q-1),0);
  const mini=catT(t)!=="disney"&&catT(t)!=="beauval"; // fiches du catalogue CJT sans photo : vignette compacte
  return `<article class="card${own?" own":""}" data-id="${t.id}" data-year="${yearOf(t)}" data-letter="${letterOf(t)}">
    ${photoBlock(t,e,sf,sb,faceOnly)}
    <div>
      <div class="ref" data-mv="${t.id}">${esc(t.ref||"Sans référence JTC")}${st(t.id).mv?' <span class="moved">· déplacée</span>':""}</div>
      <h3 class="name">${esc(t.name)}</h3>
      <div class="info"><span>${esc(t.years)}</span>${t.dept?`<span>Dép. ${esc(t.dept)}</span>`:""}${t.metal?`<span>${esc(t.metal)}</span>`:""}${t.mint?`<span>Tirage ${esc(t.mint)}</span>`:""}${!S.cat||isVirtual(S.cat)?`<span>${esc(catOf(catT(t)).name)}</span>`:""}</div>
      ${t.note?`<div class="note">${esc(t.note)}</div>`:""}
      <div class="links">${!((!sf&&!sb)||(faceOnly&&!sf))?`<a class="nlink" href="${numUrl(t)}" target="_blank" rel="noopener">Photos sur Numista ↗</a>${cjtLink(t)}`:""}</div>
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
function renderFoot(list,label){
  const s=stats(list); const gain=s.value-s.spent;
  $("#foot").setAttribute("aria-label",label);
  $("#foot").innerHTML=`<div class="kpi"><span>Obtenues</span><b>${s.own}<small style="font-size:.7em;color:var(--muted)">/${s.total}</small></b></div>
   <div class="kpi"><span>Manquantes</span><b>${s.missing}</b></div>
   <span class="gap" aria-hidden="true"></span>
   <div class="kpi"><span>Doublons</span><b>${s.dup}</b></div>
   <div class="kpi"><span>Total</span><b>${s.qty}</b></div>`;
}
/* ---------- photo en grand ---------- */
let ZOOMY=null;
function showZoom(id,side){ ZOOMY=scrollY;
  const t=byId(id); if(!t) return; const e=eff(t); const np=PHOTOS[t.id]||{};
  let src="", ph="", credit="", own=false;
  if(e[side]){ ph=e[side]; src=ownSrc(ph); own=true; }
  else if(np[side]){ src=np[side].src; credit=np[side].by==="Numista"?np[side].lic:`© ${np[side].by} – ${np[side].lic} · Source : Numista`; }
  if(!src) return;
  let z=$("#zoom"); if(!z){ z=document.createElement("div"); z.id="zoom"; z.className="zoom"; document.body.appendChild(z);
    z.addEventListener("click",ev=>{ if(ev.target===z||ev.target.classList.contains("zimg")) closeZoom(); }); }
  z.innerHTML=`<div class="zin"><img class="zimg" src="${esc(src)}"${ph?` data-ph="${esc(ph)}"`:""} alt="${side==="f"?"Face":"Dos"} – ${esc(t.name)}">
    <div class="zcap"><b>${esc(t.name)}</b> · ${side==="f"?"Face":"Dos"}${credit?`<small>${esc(credit)}</small>`:""}</div>
    <div class="row zbtns"><button class="btn ghost" data-photo="${t.id}" data-side="${side}">${own?"Changer la photo":"Mettre ma photo"}</button><button class="btn" id="zoomClose">Fermer</button></div></div>`;
  z.hidden=false; document.body.style.overflow="hidden";
}
function closeZoom(){ const z=$("#zoom"); if(z){ z.hidden=true; z.innerHTML=""; } document.body.style.overflow=""; ZOOMY=null; }
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeZoom(); });
function toast(msg){ const d=document.createElement("div"); d.className="toast"; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),2200); }
function numUrlSafe(t){ return numUrl(t); }

/* ---------- interactions ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.cat){ OPEN.clear(); S.mosaic=true; S.cat=b.dataset.cat; S.q=""; $("#q").value=""; scrollTo(0,0); render(); return; }
  if(b.id==="mosaicBtn"){ S.mosaic=!S.mosaic; render(); scrollTo(0,0); return; }
  if(b.dataset.jy){ const y=b.dataset.jy; jumpTo(t=>(yearOf(t)||"Sans année")===y); return; }
  if(b.dataset.ml){ const g=document.getElementById(b.dataset.ml); if(g) scrollTo({top:g.getBoundingClientRect().top+scrollY-($(".top").offsetHeight+10),behavior:"smooth"}); return; }
  if(b.dataset.jl){ jumpTo(t=>letterOf(t)===b.dataset.jl); return; }
  if(b.dataset.jt){ openPiece(b.dataset.jt); return; }
  if(b.id==="pieceClose"){ closePiece(); return; }
  if(b.id==="pieceList"){ const id=PIECE; closePiece(); jumpTo(t=>t.id===id); return; }
  if(b.id==="moreBtn"){ showMore(); return; }
  if(b.id==="helpBtn"){ showHelp(); return; }
  if(b.id==="backBtn"){ OPEN.clear(); S.mosaic=false; S.cat=null; S.q=""; $("#q").value=""; render(); return; }
  if(b.dataset.f){ S.filter=S.filter===b.dataset.f?null:b.dataset.f; saveFilter(); render(); return; }
  if(b.id==="clearF"){ S.filter=null; saveFilter(); render(); return; }
  if(b.dataset.vt||b.dataset.vi||b.dataset.vd){ const key=b.dataset.vt||b.dataset.vi||b.dataset.vd; const i=key.indexOf("~"); const id=key.slice(0,i), k=key.slice(i+1);
    if(k==="_"){ const q=st(id).q||0; patch(id,{q: b.dataset.vt?(q>0?0:1): b.dataset.vi? q+1 : Math.max(0,q-1)}); rerender(); return; }
    const vq={...(st(id).vq||{})}; const q=vq[k]||0;
    vq[k]= b.dataset.vt?(q>0?0:1): b.dataset.vi? q+1 : Math.max(0,q-1);
    OPEN.add(id); patch(id,{vq}); rerender(); return; }
  if(b.dataset.own){ const id=b.dataset.own; patch(id,{q:eff(byId(id)).qty>0?0:1}); rerender(); return; }
  if(b.dataset.inc){ const id=b.dataset.inc; patch(id,{q:eff(byId(id)).qty+1}); rerender(); return; }
  if(b.dataset.dec){ const id=b.dataset.dec; patch(id,{q:Math.max(0,eff(byId(id)).qty-1)}); rerender(); return; }
  if(b.dataset.hu){ const key=b.dataset.hu, i=key.indexOf("~"), id=key.slice(0,i), k=key.slice(i+1);
    const hv={...(st(id).hv||{})}; if(hv[k]) delete hv[k]; else hv[k]=1; OPEN.add(id); patch(id,{hv}); rerender(); return; }
  if(b.dataset.zoom){ showZoom(b.dataset.zoom,b.dataset.side); return; }
  if(b.id==="zoomClose"){ closeZoom(); return; }
  if(b.dataset.photo){ const y=ZOOMY!=null?ZOOMY:scrollY; closeZoom(); NP={target:{id:b.dataset.photo,side:b.dataset.side},y}; showPick(); return; }
  if(b.dataset.rm){ const id=b.dataset.rm; delete S.custom[id]; delete S.items[id]; saveCustom(id); render(); toast("Médaille supprimée"); return; }
  if(b.id==="addBtn"){ showAdd(); return; }
});
document.addEventListener("toggle",e=>{ const d=e.target; if(d.classList&&d.classList.contains("vars")){ if(d.open) OPEN.add(d.dataset.vid); else OPEN.delete(d.dataset.vid);} },true);
document.addEventListener("change",e=>{
  const el=e.target; if(!el.dataset.k) return;
  const v=el.value.trim(); patch(el.dataset.id,{[el.dataset.k]: el.dataset.k==="rar"?(v?+v:""):v.replace(",",".")});
  renderFoot(S.cat?allTokens().filter(t=>inCat(t,S.cat)):allTokens(), S.cat?"Total "+catOf(S.cat).name:"Toute la collection");
  toast("Enregistré");
});
let qTimer; $("#q").addEventListener("input",e=>{ clearTimeout(qTimer); qTimer=setTimeout(()=>{S.q=e.target.value.trim(); render();},150); });
const byId=id=>allTokens().find(t=>t.id===id);
document.addEventListener("click",e=>{ if(e.target.id==="logoutBtn"){ supa.auth.signOut().then(()=>location.reload()); } });
// photo Numista distante introuvable -> lien vers Numista
document.addEventListener("error",e=>{ const i=e.target; if(i.tagName==="IMG"&&i.parentElement&&i.parentElement.classList.contains("mtile")){ const t=byId(i.parentElement.dataset.jt); const sp=document.createElement("span"); sp.className="mph"; sp.textContent=t?String(t.name).slice(0,28):""; i.replaceWith(sp); return; } if(i.tagName==="IMG"&&i.closest(".npic")){ const f=i.closest(".npic"); const a=document.createElement("a"); a.className="face nmini"; a.target="_blank"; a.rel="noopener"; const t=byId(f.closest(".card")?.dataset.id); a.href=t?numUrl(t):"https://fr.numista.com"; a.innerHTML='<span class="ph"><span class="blank"></span>Voir sur Numista ↗</span>'; f.replaceWith(a); } },true);

/* ---------- Déplacer une pièce mal rangée ----------
   Volontairement caché pour éviter les erreurs : appui long (2 s) sur le code de la pièce, puis double confirmation. */
let LP=null;
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
    <ol class="steps"><li>Ouvre le thème où se trouve la pièce.</li>
      <li>Sur sa fiche, <b>garde le doigt appuyé 2 secondes sur le code doré</b> (ex. « JTC FR95-0344 »). Il devient orange pendant l'appui.</li>
      <li>Choisis le <b>nouveau thème</b>, puis <b>Déplacer</b> et <b>Oui, déplacer</b>.</li>
      <li>Le code affiche alors « · déplacée ».</li></ol>
    <p class="note">Pour annuler : même appui long, puis <b>Remettre dans « … »</b>.</p>
    <h3 class="htitle">Mosaïque</h3>
    <p class="note">Dans un thème, le bouton rond en haut à droite affiche les pièces en mosaïque. Touche une année, une lettre ou une pièce pour y aller dans la liste.</p>
    <div class="row"><button class="btn" type="button" id="helpClose">Fermer</button></div></div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=0; $("#helpClose").onclick=closeSheet;
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
$("#sheetBg").addEventListener("click",()=>{ if($("#sheet .piece")) closePiece(); else closeSheet(); });
/* ---------- fiche d'une pièce ouverte depuis la mosaïque ---------- */
let PIECE=null;
function openPiece(id){ PIECE=id; OPEN.add(id); renderPiece(true); } // dans la fiche, les variantes sont déjà ouvertes
function renderPiece(first){
  const t=byId(PIECE); if(!t){ PIECE=null; closeSheet(); return; } // pièce supprimée : on ferme
  const sh=$("#sheet"), y=first?0:sh.scrollTop;
  sh.innerHTML=`<div class="in piece"><div class="phead"><button class="btn ghost" type="button" id="pieceList">Voir dans la liste</button><button class="btn" type="button" id="pieceClose">Fermer</button></div>${cardHTML(t)}</div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; sh.scrollTop=y;
}
function closePiece(){ PIECE=null; closeSheet(); }
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
    drawCrop();
    const zoom=$("#cropZoom");
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
  $("#npCancel").onclick=closeSheet;
  $("#np-ref").addEventListener("input",refreshMatch);
  $("#np-year").addEventListener("input",refreshRev);
  $("#np-rev").addEventListener("change",()=>{ $("#npRevNewWrap").hidden=$("#np-rev").value!=="__new"; });
  $("#npForm").addEventListener("submit",saveNew);
  refreshMatch();
}
function readForm(){ const g=id=>{const e=$(id); return e?e.value:"";}; return {ref:g("#np-ref"),name:g("#np-name"),cat:g("#np-cat"),year:g("#np-year")}; }
function writeForm(f){ $("#np-ref").value=f.ref||""; $("#np-name").value=f.name||""; if(f.cat) $("#np-cat").value=f.cat; if(f.year) $("#np-year").value=f.year; }
function curMatch(){ return findByRef(normRef($("#np-ref").value)); }
function refreshMatch(){
  const t=curMatch(), box=$("#npMatch");
  if(t){
    box.innerHTML=`<div class="match">Déjà au catalogue : <b>${esc(t.name)}</b> (${esc(catOf(t.cat).name)}). Elle sera ajoutée à ta collection.</div>`;
    $("#np-name").value=t.name; $("#np-cat").value=t.cat;
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
  closeSheet(); S.cat=(t?catT(t):cat); S.q=""; $("#q").value=""; S.mosaic=true; render(); openPiece(id);
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
    <h2>${NP&&NP.target?(NP.target.side==="b"?"Photo du dos":"Photo de la face"):"Ajouter ma pièce"}</h2>
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
  NP.blob=blob; if(NP.cropUrl) URL.revokeObjectURL(NP.cropUrl); NP.cropUrl=URL.createObjectURL(blob);
  if(NP.target){ const {id,side}=NP.target, y=NP.y; const ref=await storeBlob(blob); patch(id,{[side]:ref}); closeSheet(); render();
    const back=()=>scrollTo(0,y||0); back(); requestAnimationFrame(back); setTimeout(back,150); toast("Photo enregistrée"); return; }
  openSheet();
}
function showPick(){
  const sh=$("#sheet");
  sh.innerHTML=`<div class="in">
    <h2>${NP&&NP.target?"Photo de la pièce":"Ajouter ma pièce"}</h2>
    <button type="button" class="pick" id="pickCam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Prendre une photo</button>
    <label class="pick alt" for="newGal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>Choisir dans ma galerie</label>
    <button type="button" class="linkbtn" id="pickCancel">Annuler</button></div>`;
  sh.hidden=false; $("#sheetBg").hidden=false; $("#pickCancel").onclick=closeSheet; $("#pickCam").onclick=showCamera;
}
$("#fab").addEventListener("click",()=>{ NP={}; showPick(); });
["#newCam","#newGal"].forEach(sel=>$(sel).addEventListener("change",e=>{ const f=e.target.files[0]; if(!f) return; stopCam();
  NP=NP||{}; if(NP.url) URL.revokeObjectURL(NP.url); NP.file=f; NP.url=URL.createObjectURL(f); showCrop(); e.target.value=""; }));

/* ---------- ajout manuel ---------- */
function showAdd(){
  $("#addPanel").innerHTML=`<form class="panel" id="addForm"><h2>Nouvelle médaille – ${esc(catOf(S.cat).name)}</h2>
   <div class="fields">
    <label class="field full">Nom<input id="add-name" required placeholder="Ex. Stitch 2026"></label>
    <label class="field">Référence officielle<input id="add-ref" placeholder="Ex. FR77-4500"></label>
    <label class="field">Année(s)<input id="add-years" inputmode="numeric" placeholder="2026"></label>
    <label class="field full">Note<input id="add-note" placeholder="Variante, tirage…"></label></div>
   <div class="row"><button class="btn" type="submit">Ajouter</button><button class="btn ghost" type="button" id="cancelAdd">Annuler</button></div></form>`;
  $("#cancelAdd").onclick=()=>$("#addPanel").innerHTML="";
  $("#addForm").onsubmit=ev=>{ ev.preventDefault();
    const id="c"+Date.now().toString(36);
    S.custom[id]={id,cat:S.cat,name:$("#add-name").value.trim(),ref:$("#add-ref").value.trim(),years:$("#add-years").value.trim(),note:$("#add-note").value.trim()};
    saveCustom(id); render(); toast("Médaille ajoutée"); };
}

/* ---------- démarrage ---------- */
async function loadCatalogue(){
  const r=await fetch("catalogue.json",{cache:"no-cache"}); const c=await r.json();
  CATS=c.cats; CATALOG=c.tokens; PHOTOS=c.photos||{}; CATALOG_DATE=c.updated||""; LEGACY=c.legacy||{}; CJT_OWN=c.cjtOwn||{}; CJT_DATE=c.cjtDate||"";
  NEWY=Math.max(...CATALOG.filter(t=>t.cat!=="disney"&&t.cat!=="beauval").flatMap(t=>t.v?t.v.map(v=>+v[0]):[parseInt(t.years,10)||0]));
  CATALOG.forEach(t=>{ if(t.np&&!PHOTOS[t.id]) PHOTOS[t.id]=t.np; });
}
async function start(){
  S.filter=ls.get("nico_filter")||null; S.items=ls.get("nico_items")||{}; S.custom=ls.get("nico_custom")||{};
  try{ await loadCatalogue(); }catch(e){ $("#view").innerHTML='<div class="empty">Impossible de charger le catalogue. Vérifie ta connexion et relance l\'appli.</div>'; return; }
  render(); checkRobot();
  const {data:{session}}=await supa.auth.getSession();
  if(!session){ showLogin(); return; }
  UID=session.user.id; setSync("wait","Synchronisation…"); pull();
}
function showLogin(){
  $("#login").hidden=false;
  $("#loginForm").onsubmit=async ev=>{ ev.preventDefault(); const b=$("#lg-btn"), er=$("#lg-err"); er.hidden=true; b.disabled=true; b.textContent="Connexion…";
    const {data,error}=await supa.auth.signInWithPassword({email:$("#lg-mail").value.trim(),password:$("#lg-pass").value});
    b.disabled=false; b.textContent="Se connecter";
    if(error){ er.textContent=navigator.onLine?"E-mail ou mot de passe incorrect.":"Pas de réseau : connecte-toi une première fois avec internet."; er.hidden=false; return; }
    $("#login").hidden=true; UID=data.user.id; setSync("wait","Synchronisation…"); pull(); };
}
window.addEventListener("online",flush);
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ checkRobot(); if(UID) pull(); } });
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
start();
