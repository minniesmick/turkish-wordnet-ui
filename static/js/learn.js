// Ders: Lecture 4 (Semantics) slaytlarının kavramları, bu araçtaki canlı örneklerle eşleşir; kendini sına.
import {$, $$, esc, REL, icon, state, api, registerView} from "./core.js";
import {LECTURES} from "./lessons.js";

const L = (label, act) => `<button class="chip" ${act}>${label}</button>`;
const S_ = (w, ds = "en") => L(`Ara · ${esc(w)}`, `data-act="search" data-ds="${ds}" data-q="${esc(w)}"`);
const R_ = (a, b, ds = "en") => L(`${esc(a)} ${icon("swap")} ${esc(b)}`, `data-act="relate" data-ds="${ds}" data-a="${esc(a)}" data-b="${esc(b)}"`);
const REL_TABLE = [
  ["Hypernym","Superordinate","Kavramlardan üst kavrama","breakfast","meal"],
  ["Hyponym","Subordinate","Kavramlardan alt türlere","meal","lunch"],
  ["Member meronym","Has-Member","Gruptan üyelerine","faculty","professor"],
  ["Has-Instance","","Kavramdan örneklerine","composer","Bach"],
  ["Instance","","Örneklerden kavrama","Austen","author"],
  ["Member holonym","Member-Of","Üyeden grubuna","copilot","crew"],
  ["Part meronym","Has-Part","Bütünden parçalara","table","leg"],
  ["Part holonym","Part-Of","Parçadan bütüne","course","meal"],
  ["Antonym","","Karşıtlar","leader","follower"],
  ["Hypernym (fiil)","","Olaylardan üst olaya","fly","travel"],
  ["Troponym (fiil)","","Fiilden belirli bir tarzdaki fiile","walk","stroll"],
  ["Entails (fiil)","","Fiilin gerektirdiği fiil","snore","sleep"],
];
let root = null;
const quiz = {kind:"hyper", ds:"en", qs:[], i:0, score:0};

const lessons = () => `<section class="lesson"><div class="gut">slayt 3</div><div><h3>Anlambilimin üç düzeyi</h3>
    <ul><li><b>Sözcüksel</b> (lexical): sözcüğün anlamı → bu araç tam olarak bunu kapsar.</li>
    <li><b>Birleşimsel</b> (compositional): cümlenin anlamı (Frege ilkesi) → FOL, λ-hesabı, CCG; bu veride yok.</li>
    <li><b>Söylem</b> (discourse): daha uzun metnin anlamı → anafora, söylem ilişkileri; bu veride yok.</li></ul></div></section>

  <section class="lesson"><div class="gut">slayt 11</div><div><h3>Word form · Lexeme · Lemma · Lexicon</h3>
    <p><b>Word form</b>: çekimli biçim (<i>runs, ran</i> / <i>yüzünü</i>). <b>Lexeme</b>: sözlük biçimi. <b>Lemma</b>: sözcük + tür + anlam (RUN (V), BANK<sub>1</sub> (N)). Arayüzde bir lemma, kartlardaki <b>sözcük<sub>anlam no</sub></b> + tür etiketidir; <b>lexicon</b> ise tüm sözlüğün kendisi.</p>
    <div class="chips">${S_("yüz","kenet")}${S_("bank")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 13–15</div><div><h3>Homonymy ve Polysemy</h3>
    <p><b>Homonymy</b>: aynı biçim, ilgisiz anlamlar (<i>bat</i>: sopa vs yarasa; <i>bank</i>: kurum vs nehir kıyısı). <b>Polysemy</b>: aynı sözcük, ilişkili anlamlar (<i>bank</i>: bina vs kurum).</p>
    <p>İpucu: kartlardaki <b>üst kavram</b> satırına (yukarı ok) ve <b>İlişkiler → yol</b> kısmına bak. Anlamların üst yolları çok erken ayrışıyorsa (hayvan ↔ eşya) homonymy'ye, aynı dalda kalıyorsa polysemy'ye yakındır. Sözcük aramasında başlıkta “<i>N anlam</i>” sayısı çok anlamlılığı gösterir.</p>
    <div class="chips">${S_("bat")}${S_("bank")}${S_("interest")}${S_("yüz","kenet")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 16</div><div><h3>Synonymy (eş anlamlılık)</h3>
    <p>WordNet'te eş anlamlılar aynı <b>synset</b>'te durur. Her bağlamda yer değiştirebilme şartı çok katıdır (<i>large coke / big coke</i> gibi istisnalar) — yine de aynı synset'te olmaları anlam eşitliği için yeterli kabul edilir.</p>
    <div class="chips">${R_("couch","sofa")}${R_("big","large")}${R_("automobile","car")}${R_("vomit","throw up")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 17</div><div><h3>Antonymy</h3>
    <p>Bir özelliğin karşıt uçları; sözcük düzeyinde ilişkidir.</p>
    <div class="chips">${R_("hot","cold")}${R_("long","short")}${R_("up","down")}${R_("sıcak","soğuk","kenet")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 18–19</div><div><h3>Hypernym – Hyponym</h3>
    <p>A, B'nin <b>hyponym</b>'u ise A bir B'dir (entailment). İlişki <b>geçişkendir</b>: A⊂B ve B⊂C ise A⊂C. “Yol uzunluğu” bu geçişkenliğin kaç adım olduğunu gösterir.</p>
    <div class="chips">${R_("car","vehicle")}${R_("dog","animal")}${R_("mango","fruit")}${R_("poodle","living thing")}${R_("köpek","hayvan","kenet")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 21–22</div><div><h3>WordNet ilişki tabloları</h3>
    <p>İsim ve fiil ilişkileri; her satırda slayttaki örnek çifti canlı karşılaştırabilirsin (hangisinin gerçekten o ilişkide olduğunu arayüz bulur).</p>
    <table class="argtbl"><tr><th>İlişki</th><th>Anlamı</th><th>Slayttaki örnek</th><th></th></tr>
    ${REL_TABLE.map(r => `<tr><td><b>${r[0]}</b>${r[1] ? `<br><small class="muted">${r[1]}</small>` : ""}</td><td>${r[2]}</td><td><i>${r[3]} → ${r[4]}</i></td><td>${R_(r[3], r[4])}</td></tr>`).join("")}</table></div></section>

  <section class="lesson"><div class="gut">slayt 23</div><div><h3>WordNet yapısı: <i>bass</i></h3>
    <p>Bir anlamın kökten (<i>entity</i>) o anlama kadar <b>tüm hypernym yolları</b> slaytta olduğu gibi görülebilir: <i>bass</i>'in “en alçak sesli erkek şarkıcı” anlamı iki farklı dala ayrılır (<i>singer → … → person</i> ve <i>causal agent</i>). <b>Ara → bass → İlişkiler</b> ile yolları gör; “yol 1, yol 2” satırları çoklu hypernym'i gösterir.</p>
    <div class="chips">${S_("bass")}</div></div></section>

  <section class="lesson"><div class="gut">“read” ve “mango”</div><div><h3>ID alıştırması (slayt 25–28)</h3>
    <p>Slaytta: <b>ENG31-07721676-n</b> kimliğini önce English.xml'de, sonra Turkish.xml'de ara. Burada ID alanı KeNet'te bağlı <b>ENG31</b> kimliklerini de arar; yani İngilizce kimlik → Türkçe synset'i bulur. Ardından <i>mango</i> sözcüğünü ara ve <b>TR</b> etiketinden Türkçe karşılığına geç.</p>
    <div class="chips">${L("English'te ENG31-07721676-n","data-act=\"idsearch\" data-ds=\"en\" data-q=\"ENG31-07721676-n\"")}${L("Türkçe'de ENG31-07721676-n","data-act=\"idsearch\" data-ds=\"kenet\" data-q=\"ENG31-07721676-n\"")}${L("English'te ENG31-07780131-n","data-act=\"idsearch\" data-ds=\"en\" data-q=\"ENG31-07780131-n\"")}${S_("mango")}${S_("read")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 29</div><div><h3>Benzerlik ≠ ilişkililik</h3>
    <p><i>car–bicycle</i>: benzer (kısa yol, ortak üst kavram <i>wheeled vehicle</i>). <i>car–gasoline</i>: ilişkili ama benzer değil (uzun yol). Yol-tabanlı ölçüler yalnızca hiyerarşide yakınlığı ölçer, her türlü ilişkiyi değil.</p>
    <div class="chips">${R_("car","bicycle")}${R_("car","gasoline")}${R_("nickel","dime")}${R_("nickel","Richter scale")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 4–9</div><div><h3>Soru-cevap sistemlerindeki zorluklar</h3>
    <ul>
      <li><b>Senses</b>: <i>What plants are native to Scotland?</i> ↔ <i>chemical plant</i> → <i>plant</i> çok anlamlı, bağlamla ayrılmalı. ${S_("plant")} ${L("WSD: chemical plant","data-act=\"wsd\" data-ds=\"en\" data-wi=\"-1\" data-t=\"A new chemical plant was opened in Scotland.\" data-w=\"plant\"")}</li>
      <li><b>Synonyms</b>: <i>vacation</i> ↔ <i>holiday</i>. ${R_("vacation","holiday")}</li>
      <li><b>Hyponym/hypernym</b>: <i>polar bears</i> ↔ <i>animals</i>. ${R_("polar bear","animal")}</li>
      <li><b>Similarity/gradation</b>: <i>remove</i> ↔ <i>eliminate</i>. ${R_("remove","eliminate")}</li>
      <li><b>Inference</b> (Polonya ↔ Orta Avrupa): cümle düzeyi çıkarım; sözcüksel anlambilimle çözülemez.</li>
    </ul></div></section>

  <section class="lesson"><div class="gut">slayt 31–32</div><div><h3>Word Sense Disambiguation</h3>
    <p>Girdi: çok anlamlı sözcük + bağlam; çıktı: doğru anlam (bir sınıflandırma problemi). Slayttaki yöntemler (Naive Bayes, MaxEnt, karar ağaçları) etiketli veri ister. Burada bilgi-tabanlı bir yöntem olan <b>Lesk</b> var: bağlam sözcüğü ↔ tanım sözcüğü örtüşmesi. “Bağlam bir torba sözcük” (bag of words) özelliğinin en yalın hâli.</p>
    <p class="muted" style="font-size:.95rem">Not: Lesk doğruluğu sınırlıdır (örtüşme yoksa karar veremez; slaytlardaki <i>interest</i> cümlelerinin yalnızca bir kısmını doğru seçer). Başarısızlık örneklerini incelemek yöntemi anlamak için faydalıdır.</p>
    <div class="chips">${L("interest cümleleri (7 anlam)","data-act=\"wsd\" data-ds=\"en\" data-wi=\"0\"")}${L("Türkçe: kanat","data-act=\"wsd\" data-ds=\"kenet\" data-wi=\"1\"")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 31–32</div><div><h3>Denetimli WSD ve değerlendirme</h3>
    <p>Slaytlar WSD'yi bir <b>sınıflandırma</b> problemi olarak anlatır: özellikler (bağlam torbası, hedefin yanındaki sözcükler) → anlam etiketi. <b>Naive Bayes</b> burada gerçek etiketli veriden öğrenir: SENSEVAL-2 <i>interest</i> korpusu (2.368 cümle, 6 anlam) ve SemCor (35.795 cümle, 224.149 anlam etiketi). Kararı belirleyen özellikler kutusu, <i>loan</i> gibi bağlam sözcüklerinin neden <i>faiz</i> anlamını seçtirdiğini gösterir.</p>
    <p><b>Değerlendirme</b>: 5-kat çapraz doğrulama ve <b>en sık anlam (MFS)</b> taban çizgisi. <i>interest</i> (SENSEVAL) üzerinde Naive Bayes ≈ %91, MFS ≈ %53. SemCor'da örnek sayısı azalınca fark küçülür ve bilgi tabanlı Lesk çoğu zaman MFS'nin bile altında kalır — yönteme göre veri ihtiyacı ve doğruluk dengesi.</p>
    <div class="chips">${L("interest cümlesi → Naive Bayes", 'data-act="nb" data-corpus="senseval" data-lemma="interest-n" data-text="She pays 3% interest on the loan."')}${L("interest: doğruluğu ölç", 'data-act="nb" data-corpus="senseval" data-lemma="interest-n" data-text="" data-eval="1"')}${L("SemCor: line karşılaştırması", 'data-act="nb" data-corpus="semcor" data-lemma="line" data-text="" data-eval="1"')}</div></div></section>

  <section class="lesson"><div class="gut">slayt 29 devamı</div><div><h3>Bilgi içeriği (IC) ile benzerlik</h3>
    <p>Yol-tabanlı ölçü her kenarı eşit sayar. <b>Bilgi içeriği</b> kavramın korpusta ne kadar nadir olduğuna bakar: IC(c) = −log P(c). <b>Resnik</b> = IC(LCS); <b>Lin</b> = 2·IC(LCS) / (IC(a)+IC(b)); <b>Jiang-Conrath</b> = 1 / (IC(a)+IC(b)−2·IC(LCS)). IC değerleri SemCor etiketlerinden (üst kavramlara yayılarak, add-one düzeltmeli) hesaplanır. Benzerlik sekmesinde English seçip karşılaştır: <i>dog–cat</i> Lin ≈ 0,89, <i>car–gasoline</i> ≈ 0,09.</p>
    <div class="chips">${R_("dog","cat")}${R_("car","bicycle")}${R_("car","gasoline")}${R_("nickel","dime")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 35–36</div><div><h3>VerbNet ve SemLink</h3>
    <p>VerbNet fiilleri <b>sınıflara</b> ayırır; her sınıfın tematik rolleri (Agent, Theme…), üyeleri, sözdizimi çerçeveleri ve anlam yüklemleri vardır. PropBank rolesetleri ve FrameNet çerçeveleri VerbNet'e bağlanır (SemLink / Unified Verb Index): <i>agree.01</i> kartındaki VN etiketlerine tıkla, sınıfa git; sınıf kartında turuncu çerçeveli üyeler PropBank'e geri bağlar.</p>
    <div class="chips">${L("agree.01", 'data-act="pb" data-lang="en" data-field="id" data-q="agree.01"')}${L("VerbNet: correspond-36.1", 'data-act="vn" data-field="class" data-q="correspond-36.1"')}${L("VerbNet üyesi: break", 'data-act="vn" data-field="member" data-q="break"')}</div></div></section>

  <section class="lesson"><div class="gut">NLTK / WordNet 3.1</div><div><h3>WordNet'te sıklık, kategori ve fiil kalıpları</h3>
    <p>İngilizce kartlarda artık anlam numarası <b>sıklık sırasını</b> gösterir (1 = en sık); sözcüğün üzerine gelince SemCor'daki etiket sayısı görünür (<i>interest</i> için 62, 21, 14…). <b>Lexname</b> (noun.cognition, verb.motion…) bir üst düzey anlam kategorisidir; Ara sekmesinde kategoriye göre süzebilirsin. Fiil kartlarındaki <b>kalıp</b> satırı (<i>Somebody ----s something</i>) fiilin cümle çerçevelerini verir; VerbNet çerçevelerinin sade hâlidir. Örnek cümleler de artık İngilizce kartlarda.</p>
    <div class="chips">${S_("interest")}${S_("read")}${S_("bank")}</div></div></section>

  <section class="lesson"><div class="gut">slayt 33–34</div><div><h3>Verb semantics: olaylar ve tematik roller</h3>
    <p>Fiiller olay ya da durum anlatır; katılımcılar <b>tematik roller</b> taşır: <b>Agent</b> (eylemi yapan), <b>Patient</b> (eylemin yöneldiği), <b>Tool / Instrument</b> (araç). <i>Tom broke the window with a rock</i> → break(Tom, window, rock); <i>The window broke</i> → break(window). Çatı değişse de roller aynı kalır (<i>The window was broken by Tom</i>).</p>
    <p>PropBank bunu <b>break.01</b> rolesetinde ARG0 = breaker (<i>pag</i>), ARG1 = thing broken (<i>ppt</i>), ARG2 = instrument olarak yazar. İşlev etiketleri (<i>pag</i> = proto-agent, <i>ppt</i> = proto-patient) rollerin genel anlamını verir.</p>
    <div class="chips">${L("break.01 roleset'i", 'data-act="pb" data-lang="en" data-field="lemma" data-q="break"')}${L("give", 'data-act="pb" data-lang="en" data-field="lemma" data-q="give"')}</div></div></section>

  <section class="lesson"><div class="gut">slayt 35</div><div><h3>PropBank</h3>
    <p>Tüm fiiller için ortak <b>ARG0, ARG1, …</b> etiketleri; yorum fiile bağlıdır (ARG0 çoğunlukla eylemci, ARG1 hedef). Slayttaki <b>agree.01</b> (Arg0 agreer · Arg1 proposition · Arg2 other entity agreeing) ve <b>fall.01</b> (Arg1 thing falling · Arg2 extent · Arg3 start point · Arg4 end point) kartlarını örnek cümleleriyle aç; <i>Örnekler</i> düğmesi [Arg0 The group] agreed [Arg1 …] gibi renkli gösterir.</p>
    <p><b>Türkçe PropBank (TRopBank)</b> aynı fikri Türkçe fiil synset'lerine uygular ve argümanlara <b>durum eki</b> (acc, dat, abl…) bilgisi ekler: ARG1 genelde <i>-ı</i> almış nesnedir. Durum ekine göre süzerek sözdizimi–anlam eşleşmesini incele, kendi cümlende dene, altın örneklerle sına.</p>
    <div class="chips">${L("agree", 'data-act="pb" data-lang="en" data-field="lemma" data-q="agree"')}${L("fall", 'data-act="pb" data-lang="en" data-field="lemma" data-q="fall"')}${L("TR: açmak", 'data-act="pb" data-lang="tr" data-field="verb" data-q="açmak"')}${L("Cümle etiketle: Ahmet kapıyı açtı.", 'data-act="label" data-text="Ahmet kapıyı açtı."')}</div></div></section>

  <section class="lesson"><div class="gut">slayt 36</div><div><h3>FrameNet</h3>
    <p><b>Çerçeve (frame)</b>: bir durum / olay / nesne türü ve onun katılımcıları ile destek unsurları (<b>çerçeve elemanları</b>, Core = zorunlu). Aynı çerçeveye farklı türde sözcükler girebilir (<i>agree.v</i>, <i>agreement.n</i>) — bu birimlere <b>lexical unit (LU)</b> denir.</p>
    <p>Slayttaki ekran gibi <b>agree.v</b> arattığında Compatibility, Be_in_agreement_on_action, Make_agreement_on_action, Agree_or_refuse_to_act çerçevelerini görürsün. PropBank ↔ FrameNet ↔ VerbNet eşleşmesi (SemLink / Unified Verb Index) <i>agree.01</i> kartında FrameNet ve VerbNet bağlantıları olarak görünür; Türkçe tarafta çerçevelerin sözcük birimleri KeNet synset'leridir.</p>
    <div class="chips">${L("agree.v → çerçeveler", 'data-act="fn" data-lang="en" data-field="lu" data-q="agree.v" data-mode="contains"')}${L("Make_agreement_on_action", 'data-act="fn" data-lang="en" data-field="name" data-q="Make_agreement_on_action" data-name="Make_agreement_on_action"')}${L("Türkçe: Motion", 'data-act="fn" data-lang="tr" data-field="name" data-q="Motion" data-name="Motion"')}${L("Türkçe: açmak", 'data-act="fn" data-lang="tr" data-field="verb" data-q="açmak" data-mode="exact"')}</div></div></section>

  <section class="lesson"><div class="gut">slayt 37–45</div><div><h3>Kapsam dışı (bu veride yok)</h3>
    <p><b>Birleşimsellik</b> (Frege), <b>FOL</b>, <b>CCG + λ-hesabı</b> ve <b>söylem semantiği</b> (SDRT, DRS, anafora, presupposition) bu veri setlerinde yok; bunlar mantık / ayrıştırma altyapısı ister. İstersen ileride küçük bir FOL dönüştürücü ya da CCG türetme çizici eklenebilir.</p></div></section>`;

// ───────────────────────── ders seçici ve Lecture 1, 2, 3, 5 içeriği (lessons.js)
let lec = 4, lq = {score:0, done:new Set()};
try{ lec = +localStorage.getItem("wn:lec") || 4; }catch(_){}
const attr = o => Object.entries(o).map(([k, v]) => k === "v" ? `data-act="go" data-v="${esc(v)}"` : `data-${k}="${esc(v)}"`).join(" ");
const chipOf = ([label, o]) => `<button class="chip" ${attr(o)}>${esc(label)}</button>`;
const secHTML = s => `<section class="lesson"><div class="gut">${esc(s.gut)}</div><div><h3>${esc(s.h)}</h3>${s.p.map(t => `<p>${t}</p>`).join("")}${s.list ? `<ul>${s.list.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}${s.chips ? `<div class="chips">${s.chips.map(chipOf).join("")}</div>` : ""}</div></section>`;
const lecQuizHTML = L => `<section class="lesson"><div class="gut">kendini sına</div><div><h3>Çoktan seçmeli sorular</h3>
  ${L.quiz.map((q, i) => `<div class="lq" data-qi="${i}"><p class="q" style="margin:14px 0 6px"><b>${i + 1}.</b> ${esc(q[0])}</p>${q[1].map((o, k) => `<button class="opt" data-lq="${i}" data-k="${k}">${esc(o)}</button>`).join("")}<p class="lq-why muted hidden" style="margin:6px 0 0;font-size:.92rem"></p></div>`).join("")}
  <p class="verdict" id="lqScore" style="margin-top:16px"></p></div></section>`;
function renderLecture(){
  $$("#lecSeg button", root).forEach(b => b.setAttribute("aria-pressed", +b.dataset.lec === lec));
  lq = {score:0, done:new Set()};
  const body = $("#lecBody", root);
  if(lec === 4){
    body.innerHTML = `<p class="lesson-intro">Sol kenardaki slayt numaraları Lecture 4'e (Semantics) karşılık gelir. Düğmeler ilgili bölümü hazır sorguyla açar.</p>${lessons()}
      <section class="lesson" id="quizBox"><div class="gut">kendini sına</div><div><h3>Veriden üretilen sorular</h3>
      <div class="row" style="margin-top:8px"><div class="seg" id="qKind"><button data-v="hyper" aria-pressed="true">Üst kavramı bul</button><button data-v="rel" aria-pressed="false">İlişki türünü bul</button></div>
      <div class="seg" id="qDs"><button data-v="en" aria-pressed="true">English</button><button data-v="kenet" aria-pressed="false">Türkçe</button></div>
      <button class="btn pri" id="qGo">Başlat · 5 soru</button></div><div id="qOut"></div></div></section>`;
    return;
  }
  const L = LECTURES[lec];
  body.innerHTML = `<p class="lesson-intro">${esc(L.intro)}</p>${L.sections.map(secHTML).join("")}${lecQuizHTML(L)}`;
}
function lecAnswer(btn){
  const i = +btn.dataset.lq, k = +btn.dataset.k, q = LECTURES[lec].quiz[i], box = btn.closest(".lq");
  if(lq.done.has(i)) return;
  lq.done.add(i);
  $$(".opt", box).forEach((b, j) => { b.disabled = true; if(j === q[2]) b.classList.add("ok"); else if(j === k) b.classList.add("no"); });
  if(k === q[2]) lq.score++;
  const why = $(".lq-why", box); why.textContent = (k === q[2] ? "Doğru. " : "Yanlış. ") + q[3]; why.classList.remove("hidden");
  $("#lqScore", root).textContent = `${lq.done.size} / ${LECTURES[lec].quiz.length} soru yanıtlandı · ${lq.score} doğru`;
}

function mount(){
  if(root) return;
  root = $("#v-learn");
  root.innerHTML = `<div class="page">
    <h1 class="page-title">Slaytlardaki her kavram, bir tık uzakta</h1>
    <div class="seg" id="lecSeg" role="group" aria-label="Ders" style="margin:6px 0 14px">${[1, 2, 3, 4, 5].map(n => `<button data-lec="${n}">Lecture ${n}</button>`).join("")}</div>
    <div id="lecBody"></div>
  </div>`;
  root.addEventListener("click", e => {
    const lb = e.target.closest("#lecSeg button");
    if(lb){ lec = +lb.dataset.lec; try{ localStorage.setItem("wn:lec", lec); }catch(_){} renderLecture(); return; }
    const la = e.target.closest("[data-lq]"); if(la){ lecAnswer(la); return; }
    const kb = e.target.closest("#qKind button"), db = e.target.closest("#qDs button");
    if(kb){ quiz.kind = kb.dataset.v; $$("#qKind button", root).forEach(b => b.setAttribute("aria-pressed", b === kb)); }
    else if(db){ quiz.ds = db.dataset.v; $$("#qDs button", root).forEach(b => b.setAttribute("aria-pressed", b === db)); }
    else if(e.target.id === "qGo") quizStart();
    else if(e.target.closest(".opt")) quizAnswer(+e.target.closest(".opt").dataset.k);
    else if(e.target.id === "qNext"){ quiz.i++; quizShow(); }
  });
  renderLecture();
}
async function quizStart(){
  const j = await api("/api/quiz", {ds:quiz.ds, kind:quiz.kind, n:5});
  Object.assign(quiz, {qs:j.questions, i:0, score:0}); quizShow();
}
function quizShow(){
  const box = $("#qOut", root), q = quiz.qs[quiz.i];
  if(!q){ box.innerHTML = `<p class="verdict">Bitti: <b>${quiz.score} / ${quiz.qs.length}</b></p>`; return; }
  const lit = b => b.lits.map(l => esc(l.w)).join(", ");
  const head = q.kind === "hyper"
    ? `<div class="q"><b>${lit(q.a)}</b> sözcüğünün üst kavramı hangisi?<br><span class="muted" style="font-size:.95rem">${esc(q.a.d)}</span></div>`
    : `<div class="q"><b>${lit(q.a)}</b> → <b>${lit(q.b)}</b> ilişkisi nedir?<br><span class="muted" style="font-size:.95rem">${esc(q.a.d)} → ${esc(q.b.d)}</span></div>`;
  const opts = q.options.map((o, k) => q.kind === "hyper" ? `<button class="opt" data-k="${k}">${lit(o)}<small>${esc(o.d)}</small></button>` : `<button class="opt" data-k="${k}">${esc(REL[o] || o)}</button>`).join("");
  box.innerHTML = `<p class="up" style="margin:14px 0 0">Soru ${quiz.i + 1} / ${quiz.qs.length} · puan ${quiz.score}</p>${head}${opts}`;
}
function quizAnswer(k){
  const q = quiz.qs[quiz.i];
  $$("#qOut .opt", root).forEach((b, i) => { b.disabled = true; if(i === q.answer) b.classList.add("ok"); else if(i === k) b.classList.add("no"); });
  if(k === q.answer) quiz.score++;
  $("#qOut", root).insertAdjacentHTML("beforeend", `<button class="btn pri" id="qNext" style="margin-top:10px">${quiz.i + 1 < quiz.qs.length ? "Sonraki" : "Sonucu gör"}</button>`);
}

export const view = { async enter(){ mount(); } };
registerView("learn", view);
