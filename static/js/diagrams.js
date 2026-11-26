// Diyagram tanımları (bildirimli). umlsvg.js bunlardan SVG üretir; konum ve yollar elle verilir, böylece çıktı her seferinde aynıdır.
// Yeni diyagram: buraya bir tanım ekle, `node scripts/make_diagrams.mjs` dosyalarını (HTML, SVG, isteğe bağlı PNG) üretir.
// Sınıflar: {id, name, x, y, w, attrs[], ops[], focal?, stereotype?}; ilişkiler: {kind, pts: [[x, y], ...], labels: [{x, y, t, w?}]}.
// Kurallar (diagram-design, type-uml-class): en çok 7 sınıf ve 8 ilişki, tek odak sınıf, 4px ızgara, sahip ucunda dolu elmas.
export const TRANSFORMER_UML = {
  id: "transformer-uml",
  title: "Transformer bloğu · UML sınıf diyagramı",
  desc: "Transformer, bir EncoderBlock ve isteğe bağlı bir DecoderBlock'a sahiptir. Her blok çok başlı dikkat (MultiHeadAttention) içerir; decoder'da iki tane vardır: maskeli öz-dikkat ve encoder-decoder dikkati. MultiHeadAttention bir ya da daha fazla AttentionHead'e sahiptir.",
  source: "static/js/tfm.js (runTransformer, encoderBlock, decoderBlock, multiHeadAttention)",
  width: 980,
  classes: [
    {id: "T", name: "Transformer", x: 40, y: 232, w: 224, focal: true, attrs: ["+ dModel: int", "+ numHeads: int", "+ seed: int"], ops: ["+ run(src, tgt): Result"]},
    {id: "E", name: "EncoderBlock", x: 340, y: 88, w: 240, attrs: ["- ffn: FeedForward", "+ output: Matrix"], ops: ["+ forward(X): Matrix"]},
    {id: "D", name: "DecoderBlock", x: 340, y: 376, w: 240, attrs: ["- ffn: FeedForward", "+ output: Matrix"], ops: ["+ forward(Y, enc): Matrix"]},
    {id: "M", name: "MultiHeadAttention", x: 660, y: 232, w: 252, attrs: ["- Wo: Matrix"], ops: ["+ attend(Xq, Xkv, mask?): Heads"]},
    {id: "H", name: "AttentionHead", x: 660, y: 520, w: 252, attrs: ["- Wq, Wk, Wv: Matrix", "+ weights: Matrix"], ops: ["+ scaledDotProduct(Q, K, V)"]}
  ],
  edges: [
    {kind: "composition", pts: [[264, 280], [302, 280], [302, 150], [340, 150]], labels: [{x: 286, y: 276, t: "1"}, {x: 322, y: 146, t: "1"}]},
    {kind: "composition", pts: [[264, 328], [302, 328], [302, 438], [340, 438]], labels: [{x: 286, y: 324, t: "1"}, {x: 322, y: 434, t: "0..1", w: 24}]},
    {kind: "composition", pts: [[580, 150], [620, 150], [620, 268], [660, 268]], labels: [{x: 598, y: 146, t: "1"}, {x: 640, y: 264, t: "1"}]},
    {kind: "composition", pts: [[580, 438], [620, 438], [620, 300], [660, 300]], labels: [{x: 598, y: 434, t: "1"}, {x: 640, y: 296, t: "2"}]},
    {kind: "composition", pts: [[786, 336], [786, 520]], labels: [{x: 798, y: 352, t: "1"}, {x: 804, y: 512, t: "1..h", w: 24}]}
  ]
};


export const NGRAM_UML = {
  id: "ngram-uml", subtitle: "UML sınıf diyagramı",
  title: "N-gram dil modeli · UML sınıf diyagramı",
  desc: "LanguageModel, her düzey için bir NgramTable'a sahiptir; tablo geçmiş başına bir Entry tutar (toplam ve sonraki sözcük sayımları). LanguageModel yumuşatma ayarını (Config) kullanır ve bir olasılık sonucu (Prob) döndürür.",
  source: "static/js/lm.js (buildModel, prob, perplexity, sample)",
  width: 980,
  classes: [
    {id: "L", name: "LanguageModel", x: 40, y: 168, w: 256, focal: true, attrs: ["+ n: int", "+ N: int  (sözcük sayısı)", "+ V: int  (sözlük boyu)", "- orders: NgramTable[]"], ops: ["+ prob(hist, w, cfg): Prob", "+ perplexity(sents, cfg): float", "+ sample(cfg): string[]"]},
    {id: "T", name: "NgramTable", x: 380, y: 96, w: 224, attrs: ["+ order: int", "- entries: Map<hist, Entry>"], ops: []},
    {id: "E", name: "Entry", x: 700, y: 96, w: 224, attrs: ["+ total: int", "+ next: Map<word, int>"], ops: []},
    {id: "C", name: "Config", x: 380, y: 352, w: 224, attrs: ["+ smooth: Smoothing", "+ alpha: float", "+ lam: float[]", "+ D: float"], ops: []},
    {id: "P", name: "Prob", x: 380, y: 520, w: 224, attrs: ["+ num, den: int", "+ p: float", "+ order: int", "+ how: string"], ops: []}
  ],
  edges: [
    {kind: "composition", pts: [[296, 208], [338, 208], [338, 160], [380, 160]], labels: [{x: 316, y: 204, t: "1"}, {x: 360, y: 156, t: "1..n", w: 24}]},
    {kind: "composition", pts: [[604, 150], [700, 150]], labels: [{x: 622, y: 146, t: "1"}, {x: 686, y: 146, t: "0..*", w: 24}]},
    {kind: "dependency", pts: [[296, 330], [338, 330], [338, 400], [380, 400]], labels: [{x: 360, y: 396, t: "USES", w: 28}]},
    {kind: "dependency", pts: [[296, 358], [322, 358], [322, 568], [380, 568]], labels: [{x: 350, y: 564, t: "RETURNS", w: 44}]}
  ]
};

export const NN_UML = {
  id: "nn-uml", subtitle: "UML sınıf diyagramı",
  title: "Sinir ağı · UML sınıf diyagramı",
  desc: "Network birden çok Layer'dan oluşur. Her Layer bir Matrix (ağırlıklar) taşır ve bir Activation kullanır; ReLU, Sigmoid ve Tanh Activation arayüzünü gerçekler.",
  source: "static/js/nn.js (buildNetwork, forward, backward, applyAct)",
  width: 980,
  classes: [
    {id: "N", name: "Network", x: 40, y: 96, w: 224, focal: true, attrs: ["- layers: Layer[]", "- seed: int"], ops: ["+ forward(x): Activations", "+ backward(acts, target): Grads"]},
    {id: "L", name: "Layer", x: 340, y: 96, w: 240, attrs: ["+ W: Matrix", "+ b: Vector", "+ act: Activation"], ops: []},
    {id: "M", name: "Matrix", x: 660, y: 96, w: 252, attrs: ["+ rows: int", "+ cols: int", "+ data: Float64Array"], ops: []},
    {id: "A", name: "Activation", x: 340, y: 320, w: 240, stereotype: "«interface»", attrs: [], ops: ["+ f(z): float", "+ df(a): float"]},
    {id: "R", name: "ReLU", x: 100, y: 504, w: 200, attrs: [], ops: ["+ f(z): float"]},
    {id: "S", name: "Sigmoid", x: 392, y: 504, w: 200, attrs: [], ops: ["+ f(z): float"]},
    {id: "T", name: "Tanh", x: 680, y: 504, w: 200, attrs: [], ops: ["+ f(z): float"]}
  ],
  edges: [
    {kind: "composition", pts: [[264, 168], [340, 168]], labels: [{x: 282, y: 164, t: "1"}, {x: 322, y: 164, t: "1..*", w: 24}]},
    {kind: "composition", pts: [[580, 160], [660, 160]], labels: [{x: 598, y: 156, t: "1"}, {x: 642, y: 156, t: "1"}]},
    {kind: "association", pts: [[460, 208], [460, 320]], labels: [{x: 474, y: 232, t: "0..*", w: 24}, {x: 472, y: 312, t: "1"}]},
    {kind: "realization", pts: [[200, 504], [200, 458], [400, 458], [400, 412]], labels: []},
    {kind: "realization", pts: [[492, 504], [492, 458], [460, 458], [460, 412]], labels: []},
    {kind: "realization", pts: [[780, 504], [780, 458], [520, 458], [520, 412]], labels: []}
  ]
};

export const MODULES_UML = {
  id: "modules-uml", subtitle: "Modül bağımlılıkları (UML sınıf notasyonuyla)",
  title: "Rapor ve diyagram sistemi · modül bağımlılıkları",
  desc: "transformer.js görünümü tfmview.js ile çizer. tfmview.js, reportdoc.js (kaçış ve belge kabuğu), umlsvg.js ve diagrams.js'e bağlıdır; umlsvg.js ve report.js de reportdoc.js'i kullanır. reportdoc.js, DOM'dan bağımsız ortak tabandır.",
  source: "static/js/*.js (import ilişkileri)",
  width: 980,
  classes: [
    {id: "V", name: "transformer.js", x: 40, y: 96, w: 272, stereotype: "«view»", attrs: [], ops: ["+ render()", "+ showCell(td)"]},
    {id: "F", name: "tfmview.js", x: 360, y: 96, w: 272, stereotype: "«pure»", attrs: [], ops: ["+ tfmBody(R, S, opt): html", "+ cellDetail(R, kind, h, i, j)", "+ tfmSettings(S, R)"]},
    {id: "G", name: "diagrams.js", x: 680, y: 96, w: 232, stereotype: "«data»", attrs: ["+ TRANSFORMER_UML", "+ NGRAM_UML, NN_UML, MODULES_UML"], ops: []},
    {id: "P", name: "report.js", x: 40, y: 400, w: 272, stereotype: "«browser»", attrs: [], ops: ["+ snapshot(section)", "+ buildReport(view): html", "+ openReport()", "+ downloadReport()"]},
    {id: "D", name: "reportdoc.js", x: 360, y: 400, w: 272, focal: true, stereotype: "«pure»", attrs: [], ops: ["+ escH(s)", "+ inlineFonts(css, load)", "+ reportDocument(opts): html"]},
    {id: "U", name: "umlsvg.js", x: 680, y: 400, w: 232, stereotype: "«pure»", attrs: [], ops: ["+ umlSvg(spec, opt): svg"]}
  ],
  edges: [
    {kind: "dependency", pts: [[312, 150], [360, 150]], labels: []},
    {kind: "dependency", pts: [[632, 150], [680, 150]], labels: []},
    {kind: "dependency", pts: [[496, 208], [496, 400]], labels: []},
    {kind: "dependency", pts: [[600, 208], [600, 330], [796, 330], [796, 400]], labels: []},
    {kind: "dependency", pts: [[680, 456], [632, 456]], labels: []},
    {kind: "dependency", pts: [[312, 456], [360, 456]], labels: []}
  ]
};
export const DIAGRAMS = [TRANSFORMER_UML, NGRAM_UML, NN_UML, MODULES_UML];
export const DIAGRAM = Object.fromEntries(DIAGRAMS.map(d => [d.id, d]));
