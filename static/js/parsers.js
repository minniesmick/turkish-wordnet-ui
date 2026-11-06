// Ayrıştırma yöntemlerinin adım adım izi (Lecture 3-1): üstten alta (özyinelemeli iniş, derinlik öncelikli, geri dönüşlü) ve alttan üste (shift-reduce, geri dönüşlü).
// CKY ayrı çalışır (parse.js). rules: [{lhs, rhs:[...]}], toks: sözcük dizisi. Saf JS.

const same = (a, b) => a.toLocaleLowerCase("tr") === b.toLocaleLowerCase("tr");

// opts.prune: kalan hedef sayısı kalan sözcük sayısından büyükse dalı at (ε kuralı olmayan gramerlerde güvenli); sol özyinelemeyi sonlandırır
export function topDown(rules, toks, start, {cap = 400, prune = false} = {}){
  const nts = new Set(rules.map(r => r.lhs)), by = new Map(), n = toks.length, steps = [], choices = [];
  for(const r of rules){ if(!by.has(r.lhs)) by.set(r.lhs, []); by.get(r.lhs).push(r); }
  let goals = [start], pos = 0, ok = false;
  const log = (kind, note) => steps.push({kind, goals:goals.slice(), pos, note});
  const expand = (sym, rest, p, from) => {
    const alts = by.get(sym) || [];
    if(from >= alts.length) return false;
    choices.push({sym, rest, pos:p, next:from + 1, total:alts.length});
    goals = [...alts[from].rhs, ...rest]; pos = p;
    log("expand", `${sym} → ${alts[from].rhs.join(" ")}${alts.length > 1 ? `   (${from + 1}. seçenek / ${alts.length})` : ""}`);
    return true;
  };
  const back = note => {
    log("fail", note);
    while(choices.length){
      const c = choices.pop();
      if(expand(c.sym, c.rest, c.pos, c.next)){ steps[steps.length - 1].kind = "retry"; steps[steps.length - 1].note += "   ↩ geri dönüldü"; return true; }
    }
    return false;
  };
  log("init", `hedef: ${start}`);
  let exhausted = false;
  while(steps.length < cap){
    if(!goals.length){
      if(pos === n){ ok = true; log("accept", "başarı: hedefler bitti ve girdi tükendi"); break; }
      if(!back(`hedefler bitti ama ${n - pos} sözcük kaldı`)){ exhausted = true; break; }
      continue;
    }
    if(prune && goals.length > n - pos){
      if(!back(`${goals.length} hedef var ama yalnızca ${n - pos} sözcük kaldı (budama)`)){ exhausted = true; break; }
      continue;
    }
    const s = goals[0], rest = goals.slice(1);
    if(nts.has(s)){
      if(!expand(s, rest, pos, 0) && !back(`${s} için kural yok`)){ exhausted = true; break; }
    }else if(pos < n && same(toks[pos], s)){
      goals = rest; pos++; log("match", `“${s}” = “${toks[pos - 1]}” eşleşti`);
    }else if(!back(`“${s}” ≠ ${pos < n ? `“${toks[pos]}”` : "girdi sonu"}`)){ exhausted = true; break; }
  }
  const capped = !ok && !exhausted && steps.length >= cap;
  if(exhausted) steps.push({kind:"exhaust", goals:[], pos, note:"tüm seçenekler tükendi: cümle bu gramerle üstten alta ayrıştırılamadı"});
  if(capped) steps.push({kind:"cap", goals:goals.slice(), pos, note:`${cap} adımda bitmedi: büyük olasılıkla sol özyineleme sonsuz döngüye soktu (budama kapalı)`});
  return {steps, ok, capped, exhausted};
}

export function shiftReduce(rules, toks, start, {cap = 500} = {}){
  const n = toks.length, steps = [], seen = new Set();
  const key = (st, p) => st.join("\u0001") + "|" + p;
  const opts = (st, p) => {
    const o = [];
    for(const r of rules){
      const k = r.rhs.length;
      if(k <= st.length && r.rhs.every((x, i) => same(st[st.length - k + i], x))) o.push({t:"reduce", r});
    }
    if(p < n) o.push({t:"shift"});
    return o;
  };
  const frames = [{st:[], pos:0, opts:opts([], 0), i:0}];
  seen.add(key([], 0));
  steps.push({kind:"init", stack:[], pos:0, note:"başlangıç: yığın boş"});
  let ok = false;
  while(frames.length && steps.length < cap){
    const f = frames[frames.length - 1];
    if(f.i >= f.opts.length){
      frames.pop();
      if(frames.length){ const t = frames[frames.length - 1]; steps.push({kind:"back", stack:t.st.slice(), pos:t.pos, note:"seçenek kalmadı   ↩ geri dönüldü"}); }
      continue;
    }
    const o = f.opts[f.i++];
    let st = f.st.slice(), p = f.pos, note;
    if(o.t === "shift"){ st.push(toks[p].toLocaleLowerCase("tr")); p++; note = `shift: “${toks[p - 1]}” yığına`; }
    else{ st = st.slice(0, st.length - o.r.rhs.length); st.push(o.r.lhs); note = `reduce: ${o.r.lhs} → ${o.r.rhs.join(" ")}`; }
    const k = key(st, p);
    if(seen.has(k)) continue;                                   // aynı durum zaten denendi (tekli kural döngüleri dahil)
    seen.add(k);
    steps.push({kind:o.t, stack:st.slice(), pos:p, note});
    if(st.length === 1 && st[0] === start && p === n){ ok = true; steps.push({kind:"accept", stack:st.slice(), pos:p, note:"başarı: yığında yalnızca başlangıç simgesi var, girdi bitti"}); break; }
    frames.push({st, pos:p, opts:opts(st, p), i:0});
  }
  const capped = !ok && frames.length > 0 && steps.length >= cap, exhausted = !ok && !capped;
  if(exhausted) steps.push({kind:"exhaust", stack:[], pos:n, note:"tüm seçenekler tükendi: cümle bu gramerle alttan üste ayrıştırılamadı"});
  if(capped) steps.push({kind:"cap", stack:[], pos:0, note:`${cap} adımda bitmedi`});
  return {steps, ok, capped, exhausted};
}

// Earley (Lecture 3-1): dinamik programlama + üstten alta tahmin. Çizelge sütunu j = j sözcük okunmuş durumlar.
// Durum: {lhs, rhs, dot, org}, anlamı: lhs → rhs[0..dot) • rhs[dot..], bu durum org'dan başladı. Üç işlem: predict (nokta sonrası ulamdan kuralları ekle), scan (nokta sonrası sözcüğü okuyup bir sonraki sütuna aktar), complete (biten durum, başladığı sütunda onu bekleyen durumları ilerletir).
// Boş (ε) kural desteklenmez. Her durum sütunda bir kez tutulur, bu yüzden sol özyineleme sorun olmaz.
export function earley(rules, toks, start, {cap = 600} = {}){
  const nts = new Set(rules.map(r => r.lhs)), n = toks.length, steps = [], chart = Array.from({length:n + 1}, () => []);
  const by = new Map();
  for(const r of rules){ if(!by.has(r.lhs)) by.set(r.lhs, []); by.get(r.lhs).push(r); }
  const GAMMA = "γ", keyOf = s => `${s.lhs}|${s.rhs.join(" ")}|${s.dot}|${s.org}`;
  const seen = Array.from({length:n + 1}, () => new Set());
  const text = s => `${s.lhs} → ${s.rhs.slice(0, s.dot).join(" ")}${s.dot ? " " : ""}•${s.dot < s.rhs.length ? " " : ""}${s.rhs.slice(s.dot).join(" ")}`;
  let capped = false;
  const add = (j, s, kind, note) => {
    if(seen[j].has(keyOf(s))) return false;
    if(steps.length >= cap){ capped = true; return false; }
    seen[j].add(keyOf(s)); chart[j].push(s);
    steps.push({kind, col:j, item:text(s), org:s.org, note});
    return true;
  };
  add(0, {lhs:GAMMA, rhs:[start], dot:0, org:0}, "init", `başlangıç: ${GAMMA} → • ${start}`);
  for(let j = 0; j <= n && !capped; j++){
    for(let q = 0; q < chart[j].length && !capped; q++){
      const s = chart[j][q];
      if(s.dot < s.rhs.length){
        const nx = s.rhs[s.dot];
        if(nts.has(nx)){
          for(const r of by.get(nx)) add(j, {lhs:r.lhs, rhs:r.rhs, dot:0, org:j}, "predict", `predict: ${text(s)} ulamı ${nx} bekliyor, ${nx} kurallarını ekle`);
        }else if(j < n && toks[j].toLocaleLowerCase("tr") === nx.toLocaleLowerCase("tr")){
          add(j + 1, {lhs:s.lhs, rhs:s.rhs, dot:s.dot + 1, org:s.org}, "scan", `scan: “${toks[j]}” okundu, nokta ilerledi`);
        }
      }else{
        for(const w of chart[s.org].slice()){
          if(w.dot < w.rhs.length && w.rhs[w.dot] === s.lhs) add(j, {lhs:w.lhs, rhs:w.rhs, dot:w.dot + 1, org:w.org}, "complete", `complete: ${s.lhs} [${s.org},${j}] bitti, ${text(w)} durumu ilerledi`);
        }
      }
    }
  }
  const ok = chart[n].some(s => s.lhs === GAMMA && s.dot === 1);
  if(ok) steps.push({kind:"accept", col:n, item:`${GAMMA} → ${start} •`, org:0, note:`başarı: son sütunda ${GAMMA} → ${start} • [0,${n}] var`});
  else if(!capped) steps.push({kind:"exhaust", col:n, item:"", org:0, note:`son sütunda ${GAMMA} → ${start} • yok: cümle bu gramerde değil`});
  if(capped) steps.push({kind:"cap", col:0, item:"", org:0, note:`${cap} durumda bitmedi`});
  return {steps, ok, capped, exhausted:!ok && !capped, chart};
}
