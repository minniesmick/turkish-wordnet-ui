// Metin temsili: Lecture 6, DL-4 Part 1–2. Hesaplar tok.js içindedir.
import {$, esc, registerView} from "./core.js";
import {characterTokens, createBPETrainer, decodeBPE, encodeBPE, encodeBPEText, preprocess, stats, wordTokens} from "./tok.js";
import {loadCorpus} from "./corpusdata.js";

const PRESETS = {
  tr:"Öğrencilerimizin kitaplarını bugün sınıfta yeniden okuyacağız.",
  punctuation:"İstanbul'da NLP çalışmak güzel! İkinci örnek: çığ, öğün, şüphe.",
  bpe:"hug ".repeat(10) + "pug ".repeat(5) + "pun ".repeat(12) + "bun ".repeat(4) + "hugs ".repeat(5)
};
const DEFAULTS = {
  text:PRESETS.tr, options:{lower:true, punct:false, accents:false, stop:false, stem:false},
  source:"text", corpusLimit:100, mergeLimit:100, inspectStep:0, encode:"öğrencilerimizin"
};
const KEY = "wn:textrep";
const MAX_WORDS = 20000, MAX_MERGES = 500, DISPLAY_WORDS = 140;
const T = {...DEFAULTS, options:{...DEFAULTS.options}};
let root = null, training = null, trainer = null, activeJob = 0, loaded = false;
let practiceAnswer = null;

function loadState(){
  if(loaded) return;
  loaded = true;
  try{
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if(saved && typeof saved === "object"){
      if(typeof saved.text === "string") T.text = saved.text.slice(0, 100000);
      if(typeof saved.encode === "string") T.encode = saved.encode.slice(0, 1000);
      if(["text", "boun"].includes(saved.source)) T.source = saved.source;
      if(Number.isFinite(saved.corpusLimit)) T.corpusLimit = Math.max(1, Math.min(979, Math.floor(saved.corpusLimit)));
      if(Number.isFinite(saved.mergeLimit)) T.mergeLimit = Math.max(0, Math.min(MAX_MERGES, Math.floor(saved.mergeLimit)));
      if(saved.options && typeof saved.options === "object"){
        for(const key of Object.keys(T.options)) if(typeof saved.options[key] === "boolean") T.options[key] = saved.options[key];
      }
    }
  }catch(_){}
}
function saveState(){
  try{
    localStorage.setItem(KEY, JSON.stringify({
      text:T.text, encode:T.encode, source:T.source, corpusLimit:T.corpusLimit,
      mergeLimit:T.mergeLimit, options:T.options
    }));
  }catch(_){}
}
const prep = text => preprocess(text, T.options);
const number = n => Number(n).toLocaleString("tr");
const pct = n => `${(n * 100).toFixed(1).replace(".", ",")}%`;

function diffTokens(before, after){
  const count = tokens => {
    const map = new Map();
    for(const token of tokens) map.set(token, (map.get(token) || 0) + 1);
    return map;
  };
  const oldCount = count(before), newCount = count(after);
  const paint = (tokens, other, tag) => {
    const remain = new Map(other);
    return tokens.map(token => {
      const available = remain.get(token) || 0;
      if(available){ remain.set(token, available - 1); return `<span>${esc(token)}</span>`; }
      return `<${tag}>${esc(token)}</${tag}>`;
    }).join(" ") || '<span class="muted">—</span>';
  };
  return `<div class="tr-diff-row"><b>Önce</b><div>${paint(before, newCount, "del")}</div></div><div class="tr-diff-row"><b>Sonra</b><div>${paint(after, oldCount, "ins")}</div></div>`;
}

function prepHTML(){
  const result = prep(T.text);
  const steps = result.steps.map(step => `<details class="tr-step"><summary>${esc(step.label)}</summary>
    ${diffTokens(wordTokens(step.input), wordTokens(step.output))}</details>`).join("");
  $("#trPrepOut", root).innerHTML = `<p class="tr-output-label">Ön işlenmiş metin</p><p class="tr-output">${esc(result.text) || '<span class="muted">Çıktı boş.</span>'}</p>
    <div class="stu tr-step-list">${steps || '<p class="muted">Bir adım seçerek dönüşüm izini gör.</p>'}</div>`;
}

function tokensForComparison(){
  const text = prep(T.text).text;
  const words = wordTokens(text);
  const chars = characterTokens(text);
  const pieces = training
    ? words.map(word => encodeBPE(word, training.model.merges, training.model.vocab))
    : chars;
  return {words:words.map(word => [word]), chars, pieces};
}

function groupHTML(groups, limit = DISPLAY_WORDS){
  const shown = groups.slice(0, limit);
  return `${shown.map(group => `<span class="tr-word-group">${group.map(part => `<span class="tr-token">${esc(part)}</span>`).join('<span class="tr-join" aria-hidden="true">·</span>')}</span>`).join('<span class="tr-space" aria-hidden="true">/</span>')}
    ${groups.length > limit ? `<span class="muted">… ${number(groups.length - limit)} sözcük daha</span>` : ""}` || '<span class="muted">Gösterilecek token yok.</span>';
}

function statsHTML(groups, vocab){
  const result = stats(groups, vocab);
  const unknown = vocab ? `${number(result.unkCount)} · ${pct(result.unkRate)}` : "—";
  const cell = (value, label) => `<div><b>${value}</b><span>${label}</span></div>`;
  return `<div class="ng-stats">${cell(number(result.tokenCount), "token")}${cell(number(result.typeCount), "tür")}${cell(result.avgPerWord.toFixed(2).replace(".", ","), "token / sözcük")}${cell(unknown, "sözlük dışı / UNK")}</div>`;
}

function comparisonHTML(label, groups, vocab, note = ""){
  return `<article class="tr-method"><h3>${label}</h3>${note ? `<p class="ck-meta">${note}</p>` : ""}
    <div class="tr-token-output" aria-label="${label} token çıktısı">${groupHTML(groups)}</div>${statsHTML(groups, vocab)}</article>`;
}

function comparison(){
  const {words, chars, pieces} = tokensForComparison();
  const knownWords = training?.wordVocab;
  const knownChars = training?.charVocab;
  const bpeNote = training ? `Eğitilmiş BPE · ${number(training.model.merges.length)} birleştirme` : "Henüz BPE eğitilmedi; başlangıç karakterleri gösteriliyor.";
  $("#trCompare", root).innerHTML = `<div class="tr-methods">
    ${comparisonHTML("Sözcük düzeyi", words, knownWords)}
    ${comparisonHTML("Karakter düzeyi", chars, knownChars)}
    ${comparisonHTML("Alt-sözcük · BPE", pieces, training?.model.vocab, bpeNote)}
  </div>`;
}

function markdownTable(model){
  return [
    "| Adım | Birleştirilen çift | Sıklık | Sözlük boyutu |",
    "| ---: | --- | ---: | ---: |",
    ...model.steps.map((step, index) => `| ${index + 1} | ${step.pair.join(" + ")} | ${step.count} | ${step.vocabSnapshot.length} |`)
  ].join("\n");
}

function bpeDetails(){
  const target = $("#trBpeDetails", root);
  if(!training){
    target.innerHTML = '<p class="muted">Korpusu seçip “BPE’yi eğit” düğmesine bas. Eğitim en çok 20.000 sözcük ve 500 birleştirmeyle sınırlıdır.</p>';
    $("#trStep", root).max = "0";
    $("#trStep", root).value = "0";
    $("#trStep", root).disabled = true;
    $("#trStepLabel", root).textContent = "0 / 0 birleştirme";
    $("#trCopyMerges", root).disabled = true;
    encodeOutput();
    return;
  }
  if(practiceAnswer && !practiceAnswer.checked){
    target.innerHTML = '<p class="notice">Önce ilk üç birleştirmeyi tahmin et; ardından adım adım sonucu açabilirsin.</p>';
    return;
  }
  const max = training.model.steps.length;
  $("#trStep", root).disabled = max === 0;
  T.inspectStep = Math.max(0, Math.min(max, T.inspectStep));
  const step = T.inspectStep ? training.model.steps[T.inspectStep - 1] : null;
  const vocab = step?.vocabSnapshot || training.initialVocab;
  const changes = step?.changes || [];
  const candidate = step ? `<div class="tr-pair-summary"><span>Seçilen çift</span><b><code>${esc(step.pair[0])}</code> + <code>${esc(step.pair[1])}</code></b><span>Sıklık</span><b>${number(step.count)}</b></div>` :
    '<p class="muted">Başlangıç sözlüğü: eğitim verisinde görülen karakterler.</p>';
  const changedRows = changes.map(change => `<tr><td>${esc(change.word)}</td><td>${number(change.count)}</td><td><code>${change.before.map(esc).join(" · ")}</code></td><td><code>${change.after.map(esc).join(" · ")}</code></td></tr>`).join("");
  target.innerHTML = `${candidate}${step ? `<p class="ck-meta">${number(step.changedWordCount)} farklı sözcük türü değişti; tabloda en çok 80 örnek gösterilir.</p>
    <div class="ck-scroll tr-scroll" role="region" tabindex="0" aria-label="BPE sözcük bölünme değişiklikleri, yatay kaydırılabilir"><table class="ng-tbl"><thead><tr><th>Sözcük</th><th>Sıklık</th><th>Birleştirmeden önce</th><th>Sonra</th></tr></thead><tbody>${changedRows || '<tr><td colspan="4">Bu çift sözcüklerde bulunamadı.</td></tr>'}</tbody></table></div>` : ""}
    <h3 class="tr-vocab-title">Güncel sözlük · ${number(vocab.length)} sembol</h3>
    <div class="tr-vocab">${vocab.slice(0, 120).map(symbol => `<code>${esc(symbol)}</code>`).join(" ") || "—"}${vocab.length > 120 ? `<span class="muted">… ${number(vocab.length - 120)} sembol daha</span>` : ""}</div>
    <div class="stu tr-explain"><p>Her adımda o anki sözcük bölünmelerindeki bitişik sembol çiftleri sayılır; sözcüğün eğitim korpusundaki sıklığı bu sayıya katkı verir. En sık çift bir sembole dönüştürülür. Eşit sıklıkta çiftlerde sonuç tekrarlanabilir olsun diye sözlüksel sıra kullanılır.</p><p>Bu laboratuvar DL-4 slayt 17–21'deki BPE örneğini uygular. WordPiece'in farklı seçim ölçütü (slayt 22) burada eğitilmez.</p></div>`;
  $("#trCopyMerges", root).disabled = !max;
  $("#trCopyMerges", root).dataset.copy = max ? markdownTable(training.model) : "";
  $("#trStep", root).max = String(max);
  $("#trStep", root).value = String(T.inspectStep);
  $("#trStepLabel", root).textContent = `${number(T.inspectStep)} / ${number(max)} birleştirme`;
  encodeOutput();
}

function encodeOutput(){
  const target = $("#trEncodeOut", root);
  if(!training){ target.innerHTML = '<p class="muted">Önce BPE modeli eğit.</p>'; return; }
  const word = T.encode;
  const pieces = encodeBPEText(word, training.model.merges, training.model.vocab);
  const decoded = decodeBPE(pieces);
  const hasUnknown = pieces.includes("<UNK>");
  const rendered = pieces.map((piece, index) => {
    if(/^\s+$/u.test(piece)){
      const visible = Array.from(piece, char => char === " " ? "␠" : char === "\t" ? "⇥" : "↵").join("");
      return `<span class="tr-space" aria-label="Boşluk">${esc(visible)}</span>`;
    }
    return `${index && !/^\s+$/u.test(pieces[index - 1]) ? '<span class="tr-join" aria-hidden="true">·</span>' : ""}<span class="tr-token">${esc(piece)}</span>`;
  }).join("");
  target.innerHTML = `<div class="tr-token-output">${rendered || '<span class="muted">Boş girdi.</span>'}</div>
    <p class="ck-meta">Geri çözümlenen: <code>${esc(decoded) || "—"}</code> · ${hasUnknown ? "Sözlükte olmayan karakter(ler) &lt;UNK&gt; olarak gösterilir." : decoded === word ? "Gidiş-dönüş aynı." : "Girdi boş."}</p>`;
}

function renderAll(){
  prepHTML();
  comparison();
  $("#trPracticeSlot", root).innerHTML = practiceHTML();
  bpeDetails();
}

function syncSource(){
  $("#trSource", root).value = T.source;
  $("#trLimitWrap", root).classList.toggle("hidden", T.source !== "boun");
}

function setBusy(on, text = ""){
  const status = $("#trStatus", root);
  status.textContent = text;
  status.classList.toggle("hidden", !on && !text);
  $("#trTrain", root).disabled = on;
  $("#trPractice", root).disabled = on;
}
function cancelTraining(){
  activeJob++;
  training = null;
  trainer = null;
  practiceAnswer = null;
  setBusy(false, "");
}

function corpusWords(corpus){
  const limit = Math.max(1, Math.min(corpus.sents.length, Math.floor(T.corpusLimit) || 1));
  const result = [];
  for(const sentence of corpus.sents.slice(0, limit)){
    const forms = sentence.f || [];
    for(const form of forms){
      const transformed = prep(form).text;
      for(const token of wordTokens(transformed)){
        if(result.length >= MAX_WORDS) return {words:result, sentences:limit, truncated:true};
        result.push(token);
      }
    }
  }
  return {words:result, sentences:limit, truncated:false};
}

async function getTrainingWords(job){
  if(T.source === "text"){
    const words = wordTokens(prep(T.text).text);
    return {words:words.slice(0, MAX_WORDS), sentences:1, truncated:words.length > MAX_WORDS};
  }
  const corpus = await loadCorpus("boun");
  if(job !== activeJob) return null;
  return corpusWords(corpus);
}

async function train(quizOnly = false){
  const job = ++activeJob;
  training = null;
  trainer = null;
  practiceAnswer = null;
  T.inspectStep = 0;
  renderAll();
  setBusy(true, "Eğitim verisi hazırlanıyor…");
  try{
    const sample = await getTrainingWords(job);
    if(!sample || job !== activeJob) return;
    if(!sample.words.length){
      setBusy(false, "Eğitim için sözcük bulunamadı; metni veya korpusu kontrol et.");
      return;
    }
    trainer = createBPETrainer(sample.words);
    const steps = [];
    const limit = Math.min(MAX_MERGES, Math.max(0, Math.floor(Number(T.mergeLimit) || 0)));
    const initialVocab = trainer.vocab;
    setBusy(true, `0 / ${limit} birleştirme · ${number(sample.words.length)} sözcük`);
    const runChunk = () => {
      if(job !== activeJob) return;
      let exhausted = false;
      for(let i = 0; i < 4 && steps.length < limit; i++){
        const step = trainer.step();
        if(!step){ exhausted = true; break; }
        steps.push(step);
      }
      setBusy(true, `${number(steps.length)} / ${number(limit)} birleştirme · ${number(sample.words.length)} sözcük`);
      if(steps.length < limit && !exhausted){
        setTimeout(runChunk, 0);
        return;
      }
      training = {
        model:{merges:trainer.merges, vocab:trainer.vocab, steps},
        initialVocab,
        wordVocab:new Set(sample.words),
        charVocab:new Set(sample.words.flatMap(word => Array.from(word))),
        wordCount:sample.words.length,
        sentences:sample.sentences,
        truncated:sample.truncated,
        quizOnly
      };
      setBusy(false, `Eğitim tamamlandı · ${number(training.wordCount)} sözcük, ${number(steps.length)} birleştirme${training.truncated ? " · 20.000 sözcük sınırı uygulandı" : ""}`);
      if(quizOnly && steps.length >= 3) practiceAnswer = {checked:false};
      renderAll();
    };
    runChunk();
  }catch(error){
    if(job !== activeJob) return;
    training = null;
    trainer = null;
    setBusy(false, "Eğitim başarısız oldu. Korpus yüklenemedi veya veri işlenemedi; yerel sunucuyu kontrol edip yeniden deneyin.");
    console.error("Metin temsili BPE eğitimi başarısız oldu:", error);
  }
}

function practiceHTML(){
  if(!training || training.model.steps.length < 3) return "";
  if(practiceAnswer?.checked){
    return `<section class="stu tr-practice"><h3>Kendin yap · ilk üç birleştirme</h3><p>${practiceAnswer.correct ? "Doğru: üç adımın sırası tuttu." : "Sıra farklı. Doğru sıra aşağıda; adımları inceleyip tekrar deneyebilirsin."}</p>
      <p><code>${training.model.steps.slice(0, 3).map(step => step.pair.join(" + ")).join("</code> → <code>")}</code></p></section>`;
  }
  return `<section class="stu tr-practice"><h3>Kendin yap · ilk üç birleştirme</h3>
    <p>BPE sonuçlarını açmadan önce en sık seçilecek ilk üç çifti sırayla tahmin et. Biçim: <code>a + b, c + d, e + f</code>.</p>
    <div class="row"><label class="sr" for="trGuess">İlk üç BPE birleştirmesi</label><input id="trGuess" class="in" autocomplete="off" placeholder="ör. u + g, u + n, h + ug"><button class="btn sm" id="trCheckGuess">Kontrol et</button></div>
    <p id="trGuessStatus" class="ck-meta" role="status" aria-live="polite"></p></section>`;
}

function updateBpeView(){
  $("#trPracticeSlot", root).innerHTML = practiceHTML();
  bpeDetails();
}

function mount(){
  if(root) return;
  root = $("#v-tok");
  loadState();
  root.innerHTML = `<div class="page wide tr-page">
    <h1 class="page-title">Metin temsili</h1>
    <p class="lesson-intro">DL-4 · Ön işleme ve tokenization. Metni dönüştür, birden çok tokenization yöntemini karşılaştır ve BPE birleştirmelerini adım adım izle.</p>
    <section class="tr-section" aria-labelledby="trPrepTitle">
      <h2 class="ng-h" id="trPrepTitle">1 · Metin ve ön işleme</h2>
      <label class="ng-label" for="trText">Girdi metni</label>
      <textarea class="ta" id="trText" rows="3" maxlength="100000" aria-describedby="trInputHelp"></textarea>
      <p class="ck-meta" id="trInputHelp">Kendi metnini yaz veya örnek seç.</p>
      <div class="chips tr-presets"><button class="chip" data-preset="tr">Türkçe eklemeli örnek</button><button class="chip" data-preset="punct">Türkçe harfler ve noktalama</button><button class="chip" data-preset="bpe">BPE · DL-4 slayt 17–21</button></div>
      <fieldset class="tr-options"><legend>Uygulanacak adımlar</legend>
        <label class="chk"><input type="checkbox" data-option="lower"><span>Küçük harfe çevir</span></label>
        <label class="chk"><input type="checkbox" data-option="punct"><span>Noktalama işaretlerini çıkar</span></label>
        <label class="chk"><input type="checkbox" data-option="accents"><span>Aksan işaretlerini çıkar</span></label>
        <label class="chk"><input type="checkbox" data-option="stop"><span>Stop word'leri çıkar</span></label>
        <label class="chk"><input type="checkbox" data-option="stem"><span>Stemming örneğini uygula</span></label>
      </fieldset>
      <div id="trPrepOut" aria-live="polite"></div>
    </section>
    <section class="tr-section" aria-labelledby="trCompareTitle">
      <h2 class="ng-h" id="trCompareTitle">2 · Tokenization karşılaştırması</h2>
      <p class="stu ck-meta">Slayt 14–16 ve 23–26: sözcük, karakter ve alt-sözcük düzeyleri. Bu laboratuvarda alt-sözcük yöntemi olarak slayt 17–21'deki BPE eğitilir; WordPiece yalnızca slayt 22'de açıklanan farkıyla ele alınır.</p>
      <div id="trCompare"></div>
    </section>
    <section class="tr-section" aria-labelledby="trBpeTitle">
      <h2 class="ng-h" id="trBpeTitle">3 · BPE'yi eğit</h2>
      <p class="stu ck-meta">Byte Pair Encoding, eğitim verisindeki bitişik sembol çiftlerini sıklıklarına göre birleştirir. Her adımda sözcük bölünmeleri ve sözlük güncellenir (DL-4, slayt 17–21).</p>
      <div class="tr-controls">
        <label class="fie">Eğitim kaynağı<select id="trSource" class="sel"><option value="text">Kendi metnim</option><option value="boun">BOUN · ilk N cümle</option></select></label>
        <label class="fie" id="trLimitWrap">BOUN cümle sayısı<input id="trCorpusLimit" class="in" type="number" min="1" max="979" step="1"></label>
        <label class="fie">Birleştirme sayısı<input id="trMergeLimit" class="in" type="number" min="0" max="500" step="1"></label>
        <button class="btn pri" id="trTrain">BPE'yi eğit</button>
        <button class="btn ghost stu" id="trPractice">Öğrenci: önce tahmin et</button>
      </div>
      <p class="ck-meta">İşlem sınırı: en çok 20.000 sözcük ve 500 birleştirme. Büyük BOUN kaynağı dilimlenir; hazırlık ve eğitim durumu burada gösterilir.</p>
      <p id="trStatus" class="notice hidden" role="status" aria-live="polite"></p>
      <div id="trPracticeSlot"></div>
      <div class="tr-step-control"><label for="trStep">İncelenecek adım</label><input id="trStep" type="range" min="0" max="0" value="0" disabled><output id="trStepLabel">0 / 0 birleştirme</output><button class="btn sm ghost" id="trCopyMerges" disabled>Birleştirmeleri Markdown olarak kopyala</button></div>
      <div id="trBpeDetails"></div>
    </section>
    <section class="tr-section" aria-labelledby="trEncodeTitle">
      <h2 class="ng-h" id="trEncodeTitle">4 · BPE ile kodla</h2>
      <label class="ng-label" for="trEncode">Sözcük ya da cümle</label>
      <input class="in tr-encode-input" id="trEncode" maxlength="1000">
      <div id="trEncodeOut" aria-live="polite"></div>
    </section>
    <div class="stu tr-source-note">Kaynak: DL-4 slayt 4–11 (standardization, stop word'ler, stemming ve temsil hattı), 13–16 (tokenization türleri ve karakter düzeyi), 17–21 (BPE), 22 (WordPiece farkı), 23–26 (sözcük düzeyi ve karşılaştırma). Slayt 28–32'deki embedding konuları bu adımın kapsamı dışındadır.</div>
  </div>`;

  $("#trText", root).value = T.text;
  $("#trEncode", root).value = T.encode;
  $("#trCorpusLimit", root).value = T.corpusLimit;
  $("#trMergeLimit", root).value = T.mergeLimit;
  syncSource();
  root.querySelectorAll("[data-option]").forEach(input => { input.checked = !!T.options[input.dataset.option]; });
  renderAll();

  root.addEventListener("input", event => {
    const target = event.target;
    if(target.id === "trText"){
      T.text = target.value; cancelTraining(); saveState(); renderAll(); return;
    }
    if(target.id === "trEncode"){ T.encode = target.value; saveState(); encodeOutput(); return; }
    if(target.dataset.option){
      T.options[target.dataset.option] = target.checked; cancelTraining(); saveState(); renderAll(); return;
    }
    if(target.id === "trCorpusLimit"){
      T.corpusLimit = Math.max(1, Math.min(979, Number(target.value) || 1)); saveState(); return;
    }
    if(target.id === "trMergeLimit"){
      T.mergeLimit = Math.max(0, Math.min(MAX_MERGES, Number(target.value) || 0)); saveState(); return;
    }
    if(target.id === "trStep"){
      T.inspectStep = Number(target.value) || 0; bpeDetails();
    }
  });
  root.addEventListener("change", event => {
    if(event.target.id === "trSource"){
      T.source = event.target.value; cancelTraining();
      syncSource(); saveState(); renderAll();
    }
  });
  root.addEventListener("click", event => {
    const preset = event.target.closest("[data-preset]");
    if(preset){
      T.text = PRESETS[preset.dataset.preset]; $("#trText", root).value = T.text;
      T.source = "text"; syncSource();
      cancelTraining(); saveState(); renderAll(); return;
    }
    if(event.target.id === "trTrain"){ train(false); return; }
    if(event.target.id === "trPractice"){ train(true); return; }
    if(event.target.id === "trCheckGuess"){
      const input = $("#trGuess", root);
      const normalizePair = value => value.replace(/\s+/g, "").replace(/[→=]/g, "+");
      const actual = training.model.steps.slice(0, 3).map(step => step.pair.join("+")).join(",");
      const guess = input.value.split(",").map(normalizePair).join(",");
      practiceAnswer = {checked:true, correct:guess === actual};
      updateBpeView();
    }
  });
}

export const view = {
  apply(patch = {}){
    loadState();
    if(typeof patch.text === "string"){ T.text = patch.text.slice(0, 100000); T.source = "text"; }
    if(typeof patch.encode === "string") T.encode = patch.encode.slice(0, 1000);
    if(patch.preset && PRESETS[patch.preset]){ T.text = PRESETS[patch.preset]; T.source = "text"; }
    saveState();
  },
  async enter(){
    mount();
    $("#trText", root).value = T.text;
    $("#trEncode", root).value = T.encode;
    syncSource();
    prepHTML(); comparison(); encodeOutput();
  }
};
registerView("tok", view);
