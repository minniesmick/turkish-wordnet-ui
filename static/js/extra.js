// "Ek (slayt dışı)" içerik: slaytlarda yalnızca adı geçen ya da hiç geçmeyen, bizim ayrıntılı eklediğimiz bölümler.
// Varsayılan kapalıdır; açık olan anahtarlar tarayıcıda saklanır. Gizlenecek öğe data-ext="anahtar" taşır (bkz. app.css),
// açan düğme extBtn(anahtar, ...) ile üretilir. Paylaşılan bağlantı ek içerik istiyorsa ilgili görünüm anahtarı kendisi açar (setExt).
const KEY = "wn:ext";
const open = new Set();
const sync = k => {
  document.body.classList.toggle("ext-" + k, open.has(k));
  document.querySelectorAll(`[data-ext-toggle="${k}"]`).forEach(b => b.setAttribute("aria-expanded", open.has(k)));
};
const save = () => { try{ localStorage.setItem(KEY, JSON.stringify([...open])); }catch(_){} };

export const isExt = k => open.has(k);
export function setExt(k, on){
  if(on) open.add(k); else open.delete(k);
  save(); sync(k);
}
export const extBtn = (k, label) => `<button class="ext-toggle" type="button" data-ext-toggle="${k}" aria-expanded="${open.has(k)}"><span class="ext-chev" aria-hidden="true"></span><span>${label}</span><small>slayt dışı</small></button>`;

export function initExt(){
  try{ (JSON.parse(localStorage.getItem(KEY)) || []).forEach(k => open.add(String(k))); }catch(_){}
  open.forEach(sync);
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-ext-toggle]"); if(!b) return;
    setExt(b.dataset.extToggle, !open.has(b.dataset.extToggle));
  });
}
