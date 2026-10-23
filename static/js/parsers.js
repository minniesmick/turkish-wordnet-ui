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
