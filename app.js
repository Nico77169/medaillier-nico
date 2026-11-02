/* Médaillier de Nico — appli installable (PWA)
   Données : catalogue.json (public) + collection de Nico dans Supabase (privée, protégée par compte). */
"use strict";
let CATS=[], CATALOG=[], PHOTOS={}, CATALOG_DATE="";
// Variantes cochées en vert dans le tableau Disney de Nico : appliquées une seule fois, au premier lancement
const PRESET = {"d0299":{"2004|04 CN Diff. Bas":1},"d0303":{"2004|04 CN":1},"d0297":{"2007|07 MDP":1},"d0577":{"2008|08 EVM France":1},"d0681":{"2008|08 EVM":1},"d0706":{"2009|09 EVM":1,"2013|13 MDP-2":1,"2020|20 MDP-3 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d0811":{"2009|09 EVM":1},"d0945":{"2009|09 EVM":1,"2010|10 EVM":1},"d0837":{"2009|09 EVM":1},"d1047":{"2010|10 EVM":1},"d1011":{"2010|10 EVM":1,"2013|13 MDP-2":1,"2015|15 MDP-2 NG":1,"2017|17 MDP-2 NG":1,"2018|18 MDP-2 NG":1,"2020|20 MDP-3 NG":1,"2021|21 MDP-3 NG":1,"2022|22 MDP-3 NG":1},"d1010":{"2010|10 EVM":1,"2012|12 EVM":1,"2017|17 MDP-2 NG":1,"2018|18 MDP-2 NG":1,"2019|19 MDP-2 NG":1,"2021|21 MDP-3 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d1100":{"2011|11 EVM":1},"d1373":{"2012|12 MDP-2":1},"d1279":{"2012|12 EVM":1,"2012|12 MDP-2":1},"d1208":{"2012|12 EVM":1,"2020|20 MDP-3 NG":1},"d1201":{"2012|12 EVM":1,"2015|15 MDP-2 NG":1,"2017|17 MDP-2 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d1012":{"2013|13 MDP":1},"d1702":{"2014|14 MDP-2 NG":1},"d1719":{"2014|14 MDP-2 CAN":1},"d1877":{"2015|15 MDP-2 NG":1,"2016|16 MDP-2 NG":1,"2020|20 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d2467":{"2017|17 MDP/EVM":1},"d2392":{"2017|17 MDP/EVM":1},"d1718":{"2017|17 MDP-2 NG":1},"d2817":{"2018|18 MDP/EVM":1},"d2746":{"2018|18 MDP/EVM":1,"2020|20 MDP-3 NG":1,"2021|21 MDP-3 NG":1,"2022|22 MDP-3 NG":1,"2023|23 MDP-3 NG":1},"d2501":{"2018|18 MDP-2 NG":1,"2020|20 MDP-3 NG":1},"d3088":{"2020|20 MDP/EVM":1},"d3035":{"2020|20 MDP/EVM":1},"d3635":{"2022|22 MDP/EVM":1},"d3432":{"2022|22 MDP/EVM":1},"d3704":{"2023|23 MDP/EVM":1},"d3885":{"2023|23 MDP-3 NG":1},"d3491":{"2023|23 MDP-3 NG":1},"d3943":{"2024|24 MDP/EVM":1},"d4182":{"2024|24 MDP-3 NG":1},"d3942":{"2024|24 MDP-3 NG":1,"2025|25 MDP-3 NG":1},"d4198":{"2025|25 MDP/EVM":1},"d4239":{"2025|25 MDP-3 NG":1},"d4256":{"2025|25 MDP/EVM":1},"d4489":{"2025|25 MDP/EVM":1},"d4202":{"2025|25 MDP/EVM":1},"d4496":{"2026|26 MDP/EVM":1},"d4047":{"2026|26 MDP/EVM":1},"d4490":{"2026|26 MDP/EVM":1}};
function applyPreset(items){ Object.entries(PRESET).forEach(([id,vq])=>{ const cur=items[id]||{}; items[id]={...cur,vq:{...vq,...(cur.vq||{})}}; }); }

/* ---------- état ---------- */
const S = { items:{}, custom:{}, filter:null, cat:null, q:"" };
const $ = s=>document.querySelector(s);
const esc = s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm = s=>String(s??"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const eur = n=>(n||0).toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:2});
const catOf = id=>CATS.find(c=>c.id===id)||{name:"Autre"};
const ls = { get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}} };
function allTokens(){ return CATALOG.concat(Object.values(S.custom)); }
function st(id){ return S.items[id]||{}; }
function units(t){ const u=st(t.id);
  if(t.v) return t.v.concat((u.xv||[]).filter(([y,r])=>!t.v.some(v=>v[0]==y&&v[1]===r))).map(([y,r,c])=>{const k=y+"|"+r; return {k,y,r,c:c||null,q:(u.vq||{})[k]||0};});
  return [{k:"_",q:u.q||0,c:null}]; }
function eff(t){ const u=st(t.id); const us=units(t); return {
  us, qty:us.reduce((a,x)=>a+x.q,0), paid:num(u.paid), val: u.val!=null&&u.val!==""?num(u.val):(t.value??null),
  rar: u.rar||t.rar||"", shop: u.shop!=null&&u.shop!==""?u.shop:(t.shop==null?"":(t.shop?"oui":"non")), f:u.f, b:u.b }; }
function num(v){ const n=parseFloat(String(v??"").replace(",",".")); return isNaN(n)?null:n; }

function passFilter(t){
  const us=units(t);
  if(S.filter==="own") return us.some(x=>x.q>0);
  if(S.filter==="missing") return us.some(x=>x.q===0);
  if(S.filter==="dup") return us.some(x=>x.q>1);
  return true;
}
function matches(t,q){
  if(!q) return true;
  const hay=norm([t.ref,t.name,t.years,t.dept,t.note,t.metal,catOf(t.cat).name].join(" "));
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
let UID=null, syncing=false, flushTimer=null;
const Q=()=>ls.get("nico_queue")||{};
function queue(id){ const q=Q(); q[id]=1; ls.set("nico_queue",q); clearTimeout(flushTimer); flushTimer=setTimeout(flush,500); }
function persistLocal(){ ls.set("nico_items",S.items); ls.set("nico_custom",S.custom); }
function saveItem(id){ persistLocal(); queue(id); }
function saveCustom(id){ persistLocal(); queue(id); }
function saveFilter(){ ls.set("nico_filter",S.filter); }
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
  syncing=true; setSync("wait","Sauvegarde en cours…");
  try{
    for(const id of ids){
      if(id==="_prefs"){ const {error}=await supa.from("collection").upsert({user_id:UID,token_id:"_prefs",data:{seeded:true},updated_at:new Date().toISOString()}); if(error) throw error; }
      else if(S.items[id]||S.custom[id]){
        await uploadPending(id); persistLocal();
        const data={...(S.items[id]||{})}; if(S.custom[id]) data._custom=S.custom[id];
        const {error}=await supa.from("collection").upsert({user_id:UID,token_id:id,data,updated_at:new Date().toISOString()}); if(error) throw error;
      } else { const {error}=await supa.from("collection").delete().eq("token_id",id); if(error) throw error; }
      const cur=Q(); delete cur[id]; ls.set("nico_queue",cur);
    }
    setSync("ok","Tout est sauvegardé en ligne");
  }catch(e){ console.warn(e); setSync("off","Envoi impossible pour l'instant, nouvel essai automatique"); setTimeout(flush,30000); }
  finally{ syncing=false; if(Object.keys(Q()).length) setTimeout(flush,800); }
}
async function pull(){
  if(!UID) return;
  const {data,error}=await supa.from("collection").select("token_id,data");
  if(error){ setSync("off","Serveur injoignable : tu travailles sur la copie du téléphone"); return; }
  const items={}, custom={}; let prefs=null;
  data.forEach(r=>{ if(r.token_id==="_prefs"){ prefs=r.data; return; } const d={...r.data}; if(d._custom){ custom[r.token_id]=d._custom; delete d._custom; } if(Object.keys(d).length) items[r.token_id]=d; });
  const q=Q();
  Object.keys(q).forEach(id=>{ if(S.items[id]) items[id]=S.items[id]; else delete items[id]; if(S.custom[id]) custom[id]=S.custom[id]; else delete custom[id]; });
  if(!(prefs&&prefs.seeded) && !q._prefs){
    // premier lancement : on reprend ce qui avait été coché localement + les variantes vertes du tableau de Nico
    Object.assign(items,S.items); Object.assign(custom,S.custom); applyPreset(items);
    S.items=items; S.custom=custom; persistLocal();
    Object.keys(items).concat(Object.keys(custom)).forEach(id=>{ const c=Q(); c[id]=1; ls.set("nico_queue",c); });
    queue("_prefs");
  } else { S.items=items; S.custom=custom; persistLocal(); }
  render(); flush();
}

/* ---------- rendu ---------- */
function render(){
  $("#backBtn").hidden=!S.cat;
  $("#title").textContent=S.cat?catOf(S.cat).name:"Médaillier de Nico";
  $("#crumb").textContent=S.cat?"Thème":"Jetons Monnaie de Paris";
  $("#q").placeholder=S.cat?"Chercher dans ce thème…":"Code, nom ou thème…";
  document.querySelectorAll(".chip[data-f]").forEach(b=>b.setAttribute("aria-pressed",String(S.filter===b.dataset.f)));
  $("#clearF").hidden=!S.filter;
  const v=$("#view");
  if(!S.cat && !S.q){ v.innerHTML=homeHTML(); renderFoot(allTokens(),"Toute la collection"); return; }
  const pool=allTokens().filter(t=>(!S.cat||t.cat===S.cat));
  const list=pool.filter(t=>matches(t,S.q)&&passFilter(t)).sort((a,b)=>String(a.years).localeCompare(String(b.years))||a.name.localeCompare(b.name));
  let h="";
  if(!S.cat) h+=`<p class="sect-title">${list.length} résultat${list.length>1?"s":""} dans tous les thèmes</p>`;
  h+= list.length?`<div class="list">${list.map(cardHTML).join("")}</div>`:`<div class="empty">Aucune médaille ne correspond${S.filter?" avec ce filtre":""}.</div>`;
  if(S.cat) h+=`<button class="addbtn" id="addBtn">+ Ajouter une médaille absente du catalogue</button><div id="addPanel"></div>`;
  v.innerHTML=h;
  renderFoot(S.cat?pool:list, S.cat?"Total "+catOf(S.cat).name:"Total des résultats");
}
function homeHTML(){
  const toks=allTokens();
  return `<p class="sect-title">Thèmes</p><div class="cats">${CATS.map(c=>{
    const l=toks.filter(t=>t.cat===c.id&&passFilter(t)); const all=toks.filter(t=>t.cat===c.id); const s=stats(all);
    const pct=s.total?Math.round(s.own/s.total*100):0;
    return `<button class="cat${c.star?" star":""}" data-cat="${c.id}" style="--c1:${c.c1};--c2:${c.c2}">
      ${c.star?'<span class="badge-star">Objectif</span>':""}
      <span class="medal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg></span>
      <b>${esc(c.name)}</b>
      <span class="meta">${s.own} / ${s.total} possédées${S.filter?` · ${l.length} filtrées`:""}</span>
      <span class="bar"><i style="width:${pct}%"></i></span></button>`;}).join("")}</div>
    <p class="status">Catalogue mis à jour le ${esc(CATALOG_DATE)} · ${CATALOG.length} médailles${Object.keys(S.custom).length?` + ${Object.keys(S.custom).length} ajoutées par toi`:""} · Données et photos : Numista (licences Creative Commons) · Disney : liste de Nico</p>`;
}
function faceHTML(t,side,src,ph){
  const lbl=side==="f"?"Face":"Dos";
  return `<button class="face" data-photo="${t.id}" data-side="${side}" aria-label="Photo ${lbl} de ${esc(t.name)}"><span class="lbl">${lbl}</span>${
    src?`<img src="${esc(src)}"${ph?` data-ph="${esc(ph)}"`:""} alt="${lbl} – ${esc(t.name)}" loading="lazy">`:`<span class="ph"><span class="blank"></span>Ta photo (facultatif)</span>`}</button>`;
}
function variantsHTML(t,e){
  const own=e.us.filter(x=>x.q>0).length, n=e.us.length;
  const rows=e.us.map(x=>{ const key=t.id+"~"+x.k;
    return `<div class="vrow${x.q>0?" on":""}"><button class="vtog" data-vt="${esc(key)}" aria-pressed="${x.q>0}"><span class="dot">${x.q>0?"✓":""}</span><span class="vy">${x.y}</span><span class="vr">${esc(x.r)}</span></button>
      <div class="stepper sm"><button data-vd="${esc(key)}" aria-label="Retirer une">−</button><span>${x.q}</span><button data-vi="${esc(key)}" aria-label="Ajouter une">+</button></div></div>`; }).join("");
  return `<details class="vars"${n<=4||OPEN.has(t.id)?" open":""} data-vid="${t.id}"><summary><b>${own} / ${n}</b> variante${n>1?"s":""} possédée${own>1?"s":""} <span class="chev">▾</span></summary><div class="vlist">${rows}</div></details>`; }
const OPEN=new Set();
function numUrl(t){ if(t.n) return "https://fr.numista.com/"+t.n;
  const m=/FR[0-9AB]{2}-\d{4}/.exec(t.ref||""); return "https://fr.numista.com/catalogue/index.php?ct=exonumia&r="+encodeURIComponent(m?m[0]:t.name); }
function picHTML(t,k,p){
  const lbl=k==="f"?"Face":"Dos";
  if(p&&p.own) return faceHTML(t,k,p.src,p.ph);
  if(p) return `<figure class="face npic"><span class="lbl">${lbl}</span><img src="${esc(p.src)}" alt="${lbl} – ${esc(t.name)}" loading="lazy"></figure>`;
  return `<a class="face nmini" href="${numUrl(t)}" target="_blank" rel="noopener"><span class="lbl">${lbl}</span><span class="ph"><span class="blank"></span>Voir sur Numista ↗</span></a>`;
}
function backMini(t,p){
  return `<button class="backmini${p?" has":""}" data-photo="${t.id}" data-side="b" aria-label="${p?"Changer":"Ajouter"} la photo du dos">${p?`<img src="${esc(p.src)}"${p.ph?` data-ph="${esc(p.ph)}"`:""} alt="Dos – ${esc(t.name)}">`:"<span>+<br>Dos</span>"}<small>Dos</small></button>`;
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
  return `<article class="card${own?" own":""}" data-id="${t.id}">
    ${!hasPh?`<a class="ntile" href="${numUrl(t)}" target="_blank" rel="noopener" aria-label="Voir les photos de ${esc(t.name)} sur Numista">
        <span class="ncoins${faceOnly?" one":""}">${coin("Face")}${faceOnly?"":coin("Dos")}</span>
        <span class="ncap">${t.n?"Voir les photos sur Numista ↗":"Chercher les photos sur Numista ↗"}</span></a>
      <div class="addrow"><button class="addph" data-photo="${t.id}" data-side="f">+ Ajouter ${faceOnly?"ma photo":"mes propres photos"}</button>${faceOnly?`<button class="addph" data-photo="${t.id}" data-side="b">+ Dos</button>`:""}</div>`
      :`<div class="faces${faceOnly?" one":""}">${picHTML(t,"f",sf)}${faceOnly?backMini(t,sb):picHTML(t,"b",sb)}</div>${creditHTML([sf,sb])}`}
    <div>
      <div class="ref">${esc(t.ref||"Sans référence JTC")}</div>
      <h3 class="name">${esc(t.name)}</h3>
      <div class="info"><span>${esc(t.years)}</span>${t.dept?`<span>Dép. ${esc(t.dept)}</span>`:""}${t.metal?`<span>${esc(t.metal)}</span>`:""}${t.mint?`<span>Tirage ${esc(t.mint)}</span>`:""}${!S.cat?`<span>${esc(catOf(t.cat).name)}</span>`:""}</div>
      ${t.note?`<div class="note">${esc(t.note)}</div>`:""}
      <div class="links">${hasPh?`<a class="nlink" href="${numUrl(t)}" target="_blank" rel="noopener">Photos sur Numista ↗</a>`:""}</div>
    </div>
    ${dup?`<div class="pills"><span class="pill ok">${dup} doublon${dup>1?"s":""}</span></div>`:""}
    ${t.v?variantsHTML(t,e):`<div class="own-row">
      <button class="toggle" data-own="${t.id}" aria-pressed="${own}"><span class="dot">${own?"✓":""}</span>${own?"Je l'ai":"Manquante"}</button>
      <div class="stepper" aria-label="Quantité"><button data-dec="${t.id}" aria-label="Retirer une">−</button><span>${e.qty}</span><button data-inc="${t.id}" aria-label="Ajouter une">+</button></div>
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
function toast(msg){ const d=document.createElement("div"); d.className="toast"; d.textContent=msg; document.body.appendChild(d); setTimeout(()=>d.remove(),2200); }
function numUrlSafe(t){ return numUrl(t); }

/* ---------- interactions ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.cat){ S.cat=b.dataset.cat; S.q=""; $("#q").value=""; scrollTo(0,0); render(); return; }
  if(b.id==="backBtn"){ S.cat=null; S.q=""; $("#q").value=""; render(); return; }
  if(b.dataset.f){ S.filter=S.filter===b.dataset.f?null:b.dataset.f; saveFilter(); render(); return; }
  if(b.id==="clearF"){ S.filter=null; saveFilter(); render(); return; }
  if(b.dataset.vt||b.dataset.vi||b.dataset.vd){ const key=b.dataset.vt||b.dataset.vi||b.dataset.vd; const i=key.indexOf("~"); const id=key.slice(0,i), k=key.slice(i+1);
    const vq={...(st(id).vq||{})}; const q=vq[k]||0;
    vq[k]= b.dataset.vt?(q>0?0:1): b.dataset.vi? q+1 : Math.max(0,q-1);
    OPEN.add(id); patch(id,{vq}); render(); return; }
  if(b.dataset.own){ const id=b.dataset.own; patch(id,{q:eff(byId(id)).qty>0?0:1}); render(); return; }
  if(b.dataset.inc){ const id=b.dataset.inc; patch(id,{q:eff(byId(id)).qty+1}); render(); return; }
  if(b.dataset.dec){ const id=b.dataset.dec; patch(id,{q:Math.max(0,eff(byId(id)).qty-1)}); render(); return; }
  if(b.dataset.photo){ NP={target:{id:b.dataset.photo,side:b.dataset.side}}; showPick(); return; }
  if(b.dataset.rm){ const id=b.dataset.rm; delete S.custom[id]; delete S.items[id]; saveCustom(id); render(); toast("Médaille supprimée"); return; }
  if(b.id==="addBtn"){ showAdd(); return; }
  if(b.id==="camBtn"){ $("#camIn").value=""; $("#camIn").click(); return; }
  if(b.id==="galBtn"){ $("#galIn").value=""; $("#galIn").click(); return; }
  if(b.dataset.goto){ const t=byId(b.dataset.goto); S.cat=t.cat; S.q=t.name; $("#q").value=t.name; $("#scan").innerHTML=""; render(); return; }
  if(b.id==="closeScan"){ $("#scan").innerHTML=""; return; }
});
document.addEventListener("toggle",e=>{ const d=e.target; if(d.classList&&d.classList.contains("vars")){ if(d.open) OPEN.add(d.dataset.vid); else OPEN.delete(d.dataset.vid);} },true);
document.addEventListener("change",e=>{
  const el=e.target; if(!el.dataset.k) return;
  const v=el.value.trim(); patch(el.dataset.id,{[el.dataset.k]: el.dataset.k==="rar"?(v?+v:""):v.replace(",",".")});
  renderFoot(S.cat?allTokens().filter(t=>t.cat===S.cat):allTokens(), S.cat?"Total "+catOf(S.cat).name:"Toute la collection");
  toast("Enregistré");
});
let qTimer; $("#q").addEventListener("input",e=>{ clearTimeout(qTimer); qTimer=setTimeout(()=>{S.q=e.target.value.trim(); render();},150); });
const byId=id=>allTokens().find(t=>t.id===id);
document.addEventListener("click",e=>{ if(e.target.id==="logoutBtn"){ supa.auth.signOut().then(()=>location.reload()); } });
// photo Numista distante introuvable -> lien vers Numista
document.addEventListener("error",e=>{ const i=e.target; if(i.tagName==="IMG"&&i.closest(".npic")){ const f=i.closest(".npic"); const a=document.createElement("a"); a.className="face nmini"; a.target="_blank"; a.rel="noopener"; const t=byId(f.closest(".card")?.dataset.id); a.href=t?numUrl(t):"https://fr.numista.com"; a.innerHTML='<span class="ph"><span class="blank"></span>Voir sur Numista ↗</span>'; f.replaceWith(a); } },true);

/* ---------- Ajouter ma pièce ---------- */
let NP=null;
const normRef=v=>{ const m=/(FR|[A-Z]{2})\s*-?\s*([0-9AB]{2})\s*-?\s*(\d{1,4})/i.exec(v||""); return m?(m[1].toUpperCase()+m[2].toUpperCase()+"-"+m[3].padStart(4,"0")):""; };
function findByRef(code){ if(!code) return null; return allTokens().find(t=>normRef(t.ref)===code)||null; }
function closeSheet(){ stopCam(); $("#sheet").hidden=true; $("#sheetBg").hidden=true; $("#sheet").innerHTML=""; }
$("#sheetBg").addEventListener("click",closeSheet);
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
  const keepCat=S.cat||"";
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
      <label class="field">Thème<select id="np-cat" required><option value="">Choisir…</option>${CATS.map(c=>`<option value="${c.id}"${c.id===keepCat?" selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
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
  closeSheet(); S.cat=(t?t.cat:cat); S.q=""; $("#q").value=""; render();
  setTimeout(()=>{ const c=document.querySelector(`[data-id="${id}"]`); if(c) c.scrollIntoView({block:"center"}); },60);
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
  if(NP.target){ const {id,side}=NP.target; const ref=await storeBlob(blob); patch(id,{[side]:ref}); closeSheet(); render(); toast("Photo enregistrée"); return; }
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
  CATS=c.cats; CATALOG=c.tokens; PHOTOS=c.photos||{}; CATALOG_DATE=c.updated||"";
  CATALOG.forEach(t=>{ if(t.np&&!PHOTOS[t.id]) PHOTOS[t.id]=t.np; });
}
async function start(){
  S.filter=ls.get("nico_filter")||null; S.items=ls.get("nico_items")||{}; S.custom=ls.get("nico_custom")||{};
  try{ await loadCatalogue(); }catch(e){ $("#view").innerHTML='<div class="empty">Impossible de charger le catalogue. Vérifie ta connexion et relance l\'appli.</div>'; return; }
  render();
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
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&UID){ pull(); } });
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
start();
