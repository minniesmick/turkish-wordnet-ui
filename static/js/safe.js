// Sayı girişleri ve tarayıcıda saklanan ayarlar için sınır denetimi. DOM'a bağlı değildir (test: node scripts/test_safe.mjs).

// min / max dışındaki ya da sayı olmayan değer, sınır içine çekilir.
export function clampNumber(value, min, max, fallback){
  let v = value === "" || value === null || value === undefined ? NaN : Number(value);
  if(!Number.isFinite(v)) v = fallback;
  if(Number.isFinite(min)) v = Math.max(min, v);
  if(Number.isFinite(max)) v = Math.min(max, v);
  return v;
}

// Saklanan nesneden yalnızca varsayılanda bulunan ve aynı türdeki alanları alır; sayılar `limits` içine çekilir.
// limits: {alan: [en az, en çok]}. Bozuk bir kayıt ekranı kilitleyemesin diye her yükleme buradan geçer.
export function restore(defaults, saved, limits = {}){
  const out = {...defaults};
  if(!saved || typeof saved !== "object") return out;
  for(const [key, base] of Object.entries(defaults)){
    const v = saved[key];
    if(v === undefined || v === null || typeof v !== typeof base || Array.isArray(v) !== Array.isArray(base)) continue;
    if(typeof base === "number"){
      const [min, max] = limits[key] || [];
      out[key] = clampNumber(v, min, max, base);
    }else out[key] = v;
  }
  return out;
}
