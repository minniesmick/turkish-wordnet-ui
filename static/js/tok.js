// Lecture 6, DL-4 · Ön işleme ve tokenization hesapları (DOM bağımsız).
const TOKEN_RE = /[\p{L}\p{M}\p{N}]+|[^\s]/gu;
const EN_STOP = new Set("a an the it is are was were be been being to of in on for and or with".split(" "));
const EAT_FORMS = new Set(["ate", "eaten", "eating"]);
const pairKey = (a, b) => `${a}\u0000${b}`;
const pairOrder = (a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
const showWord = parts => parts.join("");

export function wordTokens(text){
  return String(text ?? "").match(TOKEN_RE) || [];
}

export function characterTokens(text){
  return wordTokens(text).map(token => Array.from(token));
}

export function preprocess(text, options = {}){
  let output = String(text ?? "");
  const steps = [];
  const apply = (key, label, enabled, transform) => {
    if(!enabled) return;
    const input = output;
    output = transform(output);
    steps.push({key, label, input, output});
  };
  apply("lower", "Küçük harf", options.lower !== false, value => value.toLocaleLowerCase("tr"));
  apply("punct", "Noktalama işaretlerini çıkar", !!options.punct, value => value.replace(/\p{P}+/gu, " "));
  apply("accents", "Aksan işaretlerini çıkar", !!options.accents, value => value.normalize("NFD").replace(/\p{M}+/gu, ""));
  apply("stop", "Stop word'leri çıkar", !!options.stop, value => wordTokens(value).filter(token => !EN_STOP.has(token.toLowerCase())).join(" "));
  apply("stem", "Slayttaki İngilizce örneği kökle", !!options.stem, value =>
    wordTokens(value).map(token => EAT_FORMS.has(token.toLowerCase()) ? "eat" : token).join(" "));
  return {text:output, steps};
}

export function splitBPE(tokens){
  const frequencies = new Map();
  for(const token of tokens || []){
    const word = String(token ?? "");
    if(word) frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }
  return [...frequencies].map(([word, count]) => ({word, count, parts:Array.from(word)}));
}

export function createBPETrainer(corpusTokens){
  const words = splitBPE(corpusTokens);
  const vocab = new Set(words.flatMap(item => item.parts));
  const merges = [];
  let finished = false;

  function step(){
    if(finished) return null;
    const counts = new Map();
    for(const item of words){
      for(let i = 0; i + 1 < item.parts.length; i++){
        const key = pairKey(item.parts[i], item.parts[i + 1]);
        const entry = counts.get(key);
        if(entry) entry.count += item.count;
        else counts.set(key, {pair:[item.parts[i], item.parts[i + 1]], count:item.count});
      }
    }
    const candidates = [...counts.values()].sort((a, b) => b.count - a.count || pairOrder(a.pair, b.pair));
    const best = candidates[0];
    if(!best || best.count <= 0){ finished = true; return null; }

    const changes = [];
    let changedWordCount = 0;
    const joined = best.pair.join("");
    for(const item of words){
      const oldParts = item.parts;
      const nextParts = [];
      for(let i = 0; i < oldParts.length;){
        if(oldParts[i] === best.pair[0] && oldParts[i + 1] === best.pair[1]){
          nextParts.push(joined);
          i += 2;
        }else nextParts.push(oldParts[i++]);
      }
      if(nextParts.length !== oldParts.length){
        changedWordCount++;
        if(changes.length < 80) changes.push({word:item.word, count:item.count, before:oldParts.slice(), after:nextParts.slice()});
        item.parts = nextParts;
      }
    }
    merges.push(best.pair.slice());
    vocab.add(joined);
    return {
      pair:best.pair.slice(),
      count:best.count,
      vocabSnapshot:[...vocab].sort(),
      changes,
      changedWordCount
    };
  }

  return {
    step,
    get merges(){ return merges.map(pair => pair.slice()); },
    get vocab(){ return [...vocab].sort(); },
    get words(){ return words.map(item => ({word:item.word, count:item.count, parts:item.parts.slice()})); }
  };
}

export function trainBPE(corpusTokens, numMerges){
  const trainer = createBPETrainer(corpusTokens);
  const steps = [];
  const limit = Math.max(0, Math.min(500, Math.floor(Number(numMerges) || 0)));
  for(let i = 0; i < limit; i++){
    const result = trainer.step();
    if(!result) break;
    steps.push(result);
  }
  return {merges:trainer.merges, vocab:trainer.vocab, steps};
}

export function encodeBPE(word, merges, vocab = null){
  let parts = Array.from(String(word ?? ""));
  if(vocab){
    const known = vocab instanceof Set ? vocab : new Set(vocab);
    parts = parts.map(char => known.has(char) ? char : "<UNK>");
  }
  for(const pair of merges || []){
    if(!Array.isArray(pair) || pair.length !== 2) continue;
    const [left, right] = pair, merged = left + right, next = [];
    for(let i = 0; i < parts.length;){
      if(parts[i] === left && parts[i + 1] === right){ next.push(merged); i += 2; }
      else next.push(parts[i++]);
    }
    parts = next;
  }
  return parts;
}

export function encodeBPEText(text, merges, vocab = null){
  const chunks = String(text ?? "").match(/\s+|[\p{L}\p{M}\p{N}]+|[^\s]/gu) || [];
  return chunks.flatMap(chunk => /^\s+$/u.test(chunk) ? [chunk] : encodeBPE(chunk, merges, vocab));
}

export function decodeBPE(tokens){
  return (tokens || []).join("");
}
export const decode = decodeBPE;

export function stats(tokenGroups, vocab = null){
  const groups = Array.isArray(tokenGroups?.[0]) ? tokenGroups : (tokenGroups || []).map(token => [token]);
  const flat = groups.flat();
  const known = vocab == null ? null : vocab instanceof Set ? vocab : new Set(vocab);
  const unknown = known ? flat.filter(token => !known.has(token)).length : 0;
  return {
    tokenCount:flat.length,
    typeCount:new Set(flat).size,
    avgPerWord:groups.length ? flat.length / groups.length : 0,
    unkCount:unknown,
    unkRate:flat.length ? unknown / flat.length : 0
  };
}
