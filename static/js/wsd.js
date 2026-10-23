// Anlam seçimi (WSD): bilgi tabanlı Lesk ve denetimli Naive Bayes.
import {$, $$, esc, tr, sub, POS, icon, state, NBS, api, urlSync, registerView} from "./core.js";
import {openConcept} from "./ui.js";

const WSD_EX = {
  en: [["She pays 3% interest on the loan.","interest","S4 faiz"],["He showed a lot of interest in the painting.","interest","S1 ilgi"],["Microsoft purchased a controlling interest in Google.","interest","S6 hisse"],["It is in the national interest to invade the Bahamas.","interest","S3 çıkar"],["Playing chess is one of my interests.","interests","S5 uğraş"],["Business interests lobbied for the legislation.","interests","S7 grup"],["I withdrew the money from the bank.","bank","para bankası"],["The bank is constructed from red brick.","bank","bina"]],
  kenet: [["Banka kredi faizini yükseltti.","faiz",""],["Kuş uçmak istedi ama kanadı kırıktı.","kanadı","kanat"],["Binanın doğu kanadı yıkıldı.","kanadı","kanat"],["Kalemle deftere yazı yazdı.","kalem",""],["Bu bakanlığın yazı işleri kalemi çok yoğun.","kalem",""]]
};
const NB_EX = [["She pays 3% interest on the loan.","faiz (6)"],["He showed a lot of interest in the painting.","ilgi (1)"],["Microsoft purchased a controlling interest in Google.","hisse (5)"],["It is in the national interest to invade the Bahamas.","çıkar (4)"],["I only have your best interest in mind.","çıkar (4)"],["Playing chess is one of my interests.","uğraş (3)"],["Business interests lobbied for the legislation.","grup"]];
let root = null;

function mount(){
  if(root) return;
  root = $("#v-wsd");
  root.innerHTML = `<div class="page">
    <h1 class="page-title">Bu cümlede hangi anlam?</h1>
    <div class="row"><div class="seg" id="wMethod"><button data-v="lesk">Lesk · bilgi tabanlı</button><button data-v="nb">Naive Bayes · denetimli</button></div></div>
    <p class="lesson-intro" id="wHint" style="margin:14px 0 0"></p>
    <textarea class="ta" id="wText" rows="2" placeholder="Bir cümle yaz…" style="margin-top:16px" spellcheck="false"></textarea>
    <div id="wLesk">
      <div id="wTokens" class="chips" style="margin-top:12px"></div>
      <div class="row" style="margin-top:12px">
        <label class="field sm" style="width:190px"><input id="wTarget" type="text" placeholder="hedef sözcük" spellcheck="false"></label>
        <label class="field sm" style="width:190px" title="Ekli biçimden kök bulunamazsa elle yaz (örn. kanadı → kanat)"><input id="wLemma" type="text" placeholder="kök (isteğe bağlı)" spellcheck="false"></label>
        <label class="chk"><input type="checkbox" id="wExt" checked> ilişkili synset tanımlarını da kat</label>
        <button class="btn pri" id="wGo">Anlamı bul</button>
      </div>
      <div class="chips" id="wEx" style="margin-top:14px"></div>
    </div>
    <div id="wNb" class="hidden">
      <div class="row" style="margin-top:12px">
        <select class="sel" id="nbCorpus"><option value="senseval">SENSEVAL-2 (hard, interest, line, serve)</option><option value="semcor">SemCor (WordNet anlamları)</option></select>
        <label class="field sm" style="width:150px"><input id="nbLemma" type="text" placeholder="sözcük" spellcheck="false"></label>
        <label class="chk"><input type="checkbox" id="nbBag" checked> bağlam torbası</label>
        <label class="chk"><input type="checkbox" id="nbPos" checked> yan sözcükler (±2)</label>
        <label class="chk">pencere <input type="number" id="nbWin" min="0" max="40" value="10" style="width:56px;height:30px;border:1px solid var(--rule-2);border-radius:var(--r);background:var(--page);padding:0 6px"></label>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn pri" id="nbGo">Anlamı bul</button><button class="btn" id="nbEval">Doğruluğu ölç · 5-kat</button></div>
      <div class="chips" id="nbLemmas" style="margin-top:14px"></div>
      <div class="chips" id="nbEx" style="margin-top:10px"></div>
    </div>
    <div id="wOut" aria-live="polite"></div></div>`;
  $("#wMethod", root).addEventListener("click", e => { const b = e.target.closest("button"); if(!b) return; NBS.method = b.dataset.v; view.enter(); urlSync(true); });
  $("#wText", root).addEventListener("input", tokens);
  $("#wTarget", root).addEventListener("input", tokens);
  $("#wTokens", root).addEventListener("click", e => { const t = e.target.closest("[data-tk]"); if(!t) return; $("#wTarget", root).value = t.dataset.tk; tokens(); runLesk(); });
  $("#wGo", root).addEventListener("click", runLesk);
  $("#wEx", root).addEventListener("click", e => {
    const c = e.target.closest("[data-wi]"); if(!c) return; const x = WSD_EX[state.ds][+c.dataset.wi];
    $("#wText", root).value = x[0]; $("#wTarget", root).value = x[1]; $("#wLemma", root).value = state.ds === "kenet" && x[2] ? x[2] : ""; tokens(); runLesk();
  });
  $("#nbCorpus", root).addEventListener("change", () => { NBS.corpus = $("#nbCorpus", root).value; NBS.lemma = NBS.corpus === "senseval" ? "interest-n" : "interest"; nbUI(); nbLemmas(); });
  $("#nbLemmas", root).addEventListener("click", e => { const c = e.target.closest("[data-nbl]"); if(!c) return; NBS.lemma = c.dataset.nbl; $("#nbLemma", root).value = NBS.lemma; nbLemmas(); });
  $("#nbGo", root).addEventListener("click", runNb);
  $("#nbEval", root).addEventListener("click", runNbEval);
  $("#nbEx", root).addEventListener("click", e => { const c = e.target.closest("[data-nbi]"); if(!c) return; $("#wText", root).value = NB_EX[+c.dataset.nbi][0]; NBS.corpus = "senseval"; NBS.lemma = "interest-n"; nbUI(); nbLemmas(); runNb(); });
  $("#wOut", root).addEventListener("click", e => { const o = e.target.closest("[data-open]"); if(o) openConcept(o.dataset.open, o.dataset.ods); });
}
function tokens(){
  const t = $("#wText", root).value, ws = [...new Set(t.match(/\p{L}+/gu) || [])], cur = $("#wTarget", root).value.trim().toLowerCase();
  $("#wTokens", root).innerHTML = ws.map(w => `<button class="tk" data-tk="${esc(w)}" aria-pressed="${w.toLowerCase() === cur}">${esc(w)}</button>`).join("");
}
function methodUI(){
  $$("#wMethod button", root).forEach(b => b.setAttribute("aria-pressed", b.dataset.v === NBS.method));
  $("#wLesk", root).classList.toggle("hidden", NBS.method !== "lesk"); $("#wNb", root).classList.toggle("hidden", NBS.method !== "nb");
  $("#wHint", root).innerHTML = NBS.method === "lesk"
    ? "Bilgi tabanlı yöntem: bağlam sözcükleri ile tanım ve örnek sözcüklerinin örtüşmesi. Cümledeki bir sözcüğe tıklayarak hedefi seç. Örtüşme yoksa karar veremez; sınırı bu."
    : "Denetimli yöntem: anlam etiketli gerçek cümlelerden Naive Bayes öğrenir. Özellikler bağlam torbası ve hedefin çevresindeki sözcükler. Yalnızca İngilizce veri var (SemCor, SENSEVAL-2).";
}
function nbUI(){
  $("#nbCorpus", root).value = NBS.corpus; $("#nbLemma", root).value = NBS.lemma; $("#nbBag", root).checked = NBS.bag; $("#nbPos", root).checked = NBS.pos; $("#nbWin", root).value = NBS.win;
  $("#nbEx", root).innerHTML = NB_EX.map(([t, l], i) => `<button class="chip" data-nbi="${i}">${esc(t.length > 40 ? t.slice(0, 38) + "…" : t)}<small>${esc(l)}</small></button>`).join("");
}
async function nbLemmas(){
  const j = await api("/api/nblemmas", {corpus:NBS.corpus});
  $("#nbLemmas", root).innerHTML = j.lemmas.slice(0, 24).map(l => `<button class="chip" data-nbl="${esc(l.lemma)}" aria-pressed="${l.lemma === NBS.lemma}">${esc(l.lemma)}<small>${l.n} örnek · ${l.senses} anlam</small></button>`).join("");
}
function exChips(){
  $("#wEx", root).innerHTML = (WSD_EX[state.ds] || []).map(([t, w, l], i) => `<button class="chip" data-wi="${i}">${esc(t.length > 40 ? t.slice(0, 38) + "…" : t)}<small>${esc(l || w)}</small></button>`).join("");
}

// ───────── Lesk
async function runLesk(){
  state.wtext = $("#wText", root).value.trim(); state.wtarget = $("#wTarget", root).value.trim(); state.wlemma = $("#wLemma", root).value.trim(); state.wext = $("#wExt", root).checked; urlSync(false);
  const out = $("#wOut", root);
  if(!state.wtext || !state.wtarget){ out.innerHTML = '<div class="empty">Bir cümle yaz ve hedef sözcüğü seç.</div>'; return; }
  out.innerHTML = '<div class="skeleton" style="height:110px;margin-top:26px"></div>';
  const j = await api("/api/wsd", {ds:state.ds, text:state.wtext, target:state.wtarget, lemma:state.wlemma, ext:state.wext ? 1 : 0});
  if(j.error){ out.innerHTML = `<div class="empty"><b>${esc(state.wtarget)}</b> için sözlükte kayıt yok.<br><span style="font-size:.92rem">Ekli biçimse <b>kök</b> alanına yalın hâlini yaz.</span></div>`; return; }
  const mx = Math.max(...j.results.map(r => r.score), .0001);
  out.innerHTML = `<div class="entry" style="margin-top:30px"><div class="entry-head"><h2 class="headword" style="font-size:clamp(2rem,4vw,3rem)">${esc(j.lemma)}</h2><div class="entry-meta">${j.n} aday anlam</div></div>
    <p class="up" style="margin:8px 0 0">bağlam sözcükleri: ${j.ctx.map(esc).join(" · ") || "—"}</p>
    ${j.best ? "" : '<div class="notice warn">Bağlam sözcükleriyle hiçbir aday tanımı örtüşmedi; Lesk karar veremedi (varsayılan: ilk aday). Bu yöntemin tipik sınırı: ortak sözcük yoksa sinyal yok.</div>'}
    ${j.results.map(s => cand(s, s.id === j.best, s.score / mx, `skor ${s.score.toFixed(2)}`, `${s.overlap.length ? `ortak: <b style="color:var(--ink)">${s.overlap.map(esc).join(" · ")}</b>` : ""}${s.overlap_rel.length ? ` · ilişkili tanımlardan: ${s.overlap_rel.map(esc).join(" · ")}` : ""}`)).join("")}</div>`;
}
function cand(s, best, frac, left, right){
  return `<div class="cand ${best ? "best" : ""}"><div class="sense-line"><span class="pos-l">${esc((POS[s.pos] || s.pos).toLocaleLowerCase("tr"))}</span><span class="syn">${s.lits.slice(0, 5).map(l => `<button data-open="${esc(s.id)}" data-ods="${state.ds}">${esc(l.w)}${sub(l.s)}</button>`).join("<i>·</i>")}</span>${best ? '<span class="badge">seçilen anlam</span>' : ""}</div>
    <p class="def">${esc(s.def)}</p>${s.ex && s.ex.length ? `<p class="ex">${esc(s.ex[0].t)}</p>` : ""}
    <div class="prob"><span>${left}</span><div class="meter"><i><b style="width:${frac * 100}%"></b></i></div><span>${right}</span></div></div>`;
}

// ───────── Naive Bayes
const nbParams = (extra = {}) => ({corpus:NBS.corpus, lemma:NBS.lemma, feat:[NBS.bag ? "bag" : "", NBS.pos ? "pos" : ""].filter(Boolean).join(","), win:NBS.win, ...extra});
function nbRead(){ NBS.corpus = $("#nbCorpus", root).value; NBS.lemma = $("#nbLemma", root).value.trim(); NBS.bag = $("#nbBag", root).checked; NBS.pos = $("#nbPos", root).checked; NBS.win = +$("#nbWin", root).value || 0; state.wtext = $("#wText", root).value.trim(); }
async function runNb(){
  nbRead(); urlSync(false);
  const out = $("#wOut", root);
  if(!state.wtext){ out.innerHTML = '<div class="empty">Bir İngilizce cümle yaz; hedef sözcük cümlede geçmeli.</div>'; return; }
  out.innerHTML = '<div class="skeleton" style="height:110px;margin-top:26px"></div>';
  const j = await api("/api/nb", nbParams({text:state.wtext}));
  if(j.error === "nodata"){ out.innerHTML = `<div class="empty"><b>${esc(NBS.lemma)}</b> için bu korpusta yeterli eğitim verisi yok.<br><span style="font-size:.92rem">Yukarıdaki önerilerden birini seç.</span></div>`; return; }
  if(j.error === "notarget"){ out.innerHTML = `<div class="empty">Cümlede <b>${esc(NBS.lemma.split("-")[0])}</b> sözcüğü bulunamadı.</div>`; return; }
  const mx = Math.max(...j.results.map(r => r.p), .0001);
  out.innerHTML = `<div class="entry" style="margin-top:30px"><div class="entry-head"><h2 class="headword" style="font-size:clamp(2rem,4vw,3rem)">${esc(NBS.lemma.split("-")[0])}</h2><div class="entry-meta">${tr(j.n)} eğitim örneği · ${j.k} anlam</div></div>
    <p class="up" style="margin:8px 0 0">hedef: <b>${esc(j.tokens[j.target])}</b> · ${j.features.length} özellik</p>
    ${j.results.map((r, i) => `<div class="cand ${i === 0 ? "best" : ""}"><div class="sense-line"><span class="tag">${esc(r.label)}</span>${r.syn ? `<span class="syn">${r.syn.lits.slice(0, 4).map(l => `<button data-open="${esc(r.syn.id)}" data-ods="en">${esc(l.w)}${sub(l.s)}</button>`).join("<i>·</i>")}</span>` : ""}${i === 0 ? '<span class="badge">tahmin</span>' : ""}</div>
      <p class="def">${esc(r.syn ? r.syn.def : (r.gloss || "(bu etiket için tanım yok: SENSEVAL-2 etiketi)"))}</p>
      <div class="prob"><span>olasılık ${(r.p * 100).toFixed(1)}%</span><div class="meter"><i><b style="width:${r.p / mx * 100}%"></b></i></div><span>${r.n} eğitim örneği</span></div></div>`).join("")}
    ${j.top.length ? `<h3 class="lbl" style="margin:24px 0 8px">Kararı belirleyen özellikler · 1. ile 2. anlam arasındaki log-oran</h3><div class="chips">${j.top.map(t => `<span class="chip" title="b: bağlam sözcüğü · w-1 / w+1: yan sözcük">${esc(t.f)}<small>${t.d > 0 ? "+" : ""}${t.d}</small></span>`).join("")}</div>` : ""}</div>`;
}
async function runNbEval(){
  nbRead(); urlSync(false);
  const out = $("#wOut", root); out.innerHTML = '<div class="skeleton" style="height:140px;margin-top:26px"></div>';
  const j = await api("/api/nbeval", nbParams());
  if(j.error){ out.innerHTML = '<div class="empty">Bu sözcük için değerlendirme yapılamadı: yeterli örnek yok.</div>'; return; }
  const bar = (name, v, note) => v == null ? "" : `<div class="bar"><span>${name}</span><div class="meter"><i><b style="width:${v * 100}%"></b></i></div><b>${(v * 100).toFixed(1)}%</b></div>${note ? `<div class="up" style="margin:-4px 0 4px 162px">${note}</div>` : ""}`;
  out.innerHTML = `<div class="entry" style="margin-top:30px"><div class="entry-head"><h2 class="headword" style="font-size:clamp(2rem,4vw,3rem)">${esc(NBS.lemma.split("-")[0])}</h2><div class="entry-meta">${tr(j.n)} örnek · ${j.k} anlam · ${j.folds}-kat çapraz doğrulama</div></div>
    <div class="bars" style="margin-top:12px">${bar("Naive Bayes", j.nb, "denetimli")}${bar("En sık anlam (MFS)", j.mfs, "taban çizgisi")}${bar("Lesk", j.lesk, j.lesk != null ? `ilk ${j.lesk_n} örnek` : "")}</div>
    <p class="lesson-intro" style="margin-top:14px">${j.nb > j.mfs ? "Naive Bayes tabandan daha iyi: bağlam sözcükleri anlamı ayırt etmeye yarıyor." : "Naive Bayes taban çizgisini geçemedi: bu sözcük için eğitim verisi az ya da anlamlar çok dengesiz."}${j.lesk != null && j.lesk < j.mfs ? " Lesk en sık anlamdan bile kötü: sözlük tanımlarıyla örtüşme çoğu zaman yeterli sinyal vermiyor." : ""}</p></div>`;
}

export const view = {
  apply(p){
    if(p.ds) state.ds = p.ds;
    if(p.ex){ const d = p.ex, x = d.wi === "-1" ? [d.t, d.w, ""] : WSD_EX[d.ds][+d.wi]; NBS.method = "lesk"; state.wtext = x[0]; state.wtarget = x[1]; state.wlemma = d.ds === "kenet" && x[2] ? x[2] : ""; }
    if(p.nb){ NBS.method = "nb"; NBS.corpus = p.nb.corpus || "senseval"; NBS.lemma = p.nb.lemma || "interest-n"; NBS.autoeval = p.nb.eval === "1"; state.wtext = p.nb.text || ""; }
  },
  async enter(){
    mount(); methodUI();
    $("#wText", root).value = state.wtext;
    if(NBS.method === "nb"){
      if(state.ds !== "en"){ state.ds = "en"; (await import("./ui.js")).syncShell(); }
      nbUI(); nbLemmas();
      if(NBS.autoeval){ NBS.autoeval = false; await runNbEval(); } else if(state.wtext) await runNb(); else $("#wOut", root).innerHTML = "";
    }else{
      $("#wTarget", root).value = state.wtarget; $("#wLemma", root).value = state.wlemma; $("#wExt", root).checked = state.wext;
      tokens(); exChips();
      if(state.wtext && state.wtarget) await runLesk(); else $("#wOut", root).innerHTML = "";
    }
    urlSync(false);
  },
  dsChange(){ return this.enter(); }
};
registerView("wsd", view);
