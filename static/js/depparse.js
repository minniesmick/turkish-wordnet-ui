// Geçiş tabanlı bağımlılık ayrıştırma (Lecture 3): arc-standard sistemi ve altın ağaçtan eylem dizisi çıkaran "oracle".
// Durum: yığın (0 = yapay kök ile başlar), tampon (sözcük numaraları), çizilen yaylar. Eylemler:
//   SHIFT: tamponun başını yığına koy
//   LEFT-ARC(rel): yığının ikinci öğesi, en üstteki öğenin bağımlısı olur; ikinci öğe çıkar
//   RIGHT-ARC(rel): yığının en üstteki öğesi, ikincinin bağımlısı olur; en üstteki çıkar
// Oracle yalnızca projektif ağaçlarda çalışır; kesişen yay varsa durur ve nedenini bildirir.
// toks: [{id, form, head, rel}]. Dönen: {ok, steps:[{act, rel, stack, buffer, arcs, note}], reason}
export function oracle(toks){
  const by = new Map(toks.map(t => [t.id, t])), kids = new Map(toks.map(t => [t.id, 0]));
  for(const t of toks) if(t.head) kids.set(t.head, (kids.get(t.head) || 0) + 1);
  const stack = [0], buffer = toks.map(t => t.id), arcs = [], done = new Map(toks.map(t => [t.id, 0]));
  const name = id => id === 0 ? "ROOT" : by.get(id)?.form ?? String(id);
  const steps = [{act:"BAŞLA", stack:stack.slice(), buffer:buffer.slice(), arcs:[], note:"yığında yalnızca ROOT var, tampon tüm cümle"}];
  const snap = (act, rel, note) => steps.push({act, rel, stack:stack.slice(), buffer:buffer.slice(), arcs:arcs.map(a => ({...a})), note});
  let guard = 0;
  while(buffer.length || stack.length > 1){
    if(++guard > 4 * toks.length + 10) return {ok:false, steps, reason:"döngü"};
    const s1 = stack[stack.length - 1], s2 = stack[stack.length - 2];
    if(stack.length >= 2 && s2 !== 0 && by.get(s2).head === s1){
      stack.splice(stack.length - 2, 1); arcs.push({h:s1, d:s2, rel:by.get(s2).rel}); done.set(s1, done.get(s1) + 1);
      snap("LEFT-ARC", by.get(s2).rel, `${name(s2)}, ${name(s1)} sözcüğünün bağımlısı (${by.get(s2).rel}); ${name(s2)} yığından çıkar`);
    }else if(stack.length >= 2 && s1 !== 0 && by.get(s1).head === s2 && done.get(s1) === kids.get(s1)){
      stack.pop(); arcs.push({h:s2, d:s1, rel:by.get(s1).rel}); done.set(s2, done.get(s2) + 1);
      snap("RIGHT-ARC", by.get(s1).rel, `${name(s1)}, ${name(s2)} sözcüğünün bağımlısı (${by.get(s1).rel}); tüm bağımlıları bağlandı, ${name(s1)} yığından çıkar`);
    }else if(buffer.length){
      const b = buffer.shift(); stack.push(b);
      snap("SHIFT", "", `${name(b)} tampondan yığına`);
    }else return {ok:false, steps, reason:"ağaç projektif değil: oracle bu durumda eylem bulamıyor (kesişen yay)"};
  }
  return {ok:true, steps, reason:""};
}
// ağaç yaylarını tek tek yeniden kurup altınla karşılaştır (testler için)
export const sameArcs = (steps, toks) => {
  const last = steps[steps.length - 1].arcs, g = toks.map(t => `${t.head}>${t.id}:${t.rel}`).sort();
  return JSON.stringify(last.map(a => `${a.h}>${a.d}:${a.rel}`).sort()) === JSON.stringify(g);
};
