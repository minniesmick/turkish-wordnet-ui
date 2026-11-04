import assert from "node:assert/strict";
import {characterTokens, decodeBPE, encodeBPE, encodeBPEText, preprocess, stats, trainBPE, wordTokens} from "../static/js/tok.js";

const classic = ["hug", "hug", "hug", "hug", "hug", "hug", "hug", "hug", "hug", "hug",
  "pug", "pug", "pug", "pug", "pug",
  "pun", "pun", "pun", "pun", "pun", "pun", "pun", "pun", "pun", "pun", "pun", "pun",
  "bun", "bun", "bun", "bun",
  "hugs", "hugs", "hugs", "hugs", "hugs"];
const bpe = trainBPE(classic, 3);
assert.deepEqual(bpe.steps.map(step => [step.pair, step.count]), [
  [["u", "g"], 20],
  [["u", "n"], 16],
  [["h", "ug"], 15]
], "classic BPE merge counts and order are manually verified");
assert.deepEqual(encodeBPE("hugs", bpe.merges), ["hug", "s"]);
assert.equal(decodeBPE(encodeBPE("hugs", bpe.merges)), "hugs");
assert.deepEqual(encodeBPEText("hug hugs", bpe.merges, bpe.vocab), ["hug", " ", "hug", "s"]);
assert.equal(decodeBPE(encodeBPEText("hug hugs", bpe.merges, bpe.vocab)), "hug hugs", "sentence spaces are preserved between independently encoded words");
assert.deepEqual(encodeBPEText("hug x", bpe.merges, bpe.vocab), ["hug", " ", "<UNK>"], "unknown characters do not consume word boundaries");
assert.ok(bpe.steps.every(step => step.vocabSnapshot.includes(step.pair.join(""))));

assert.deepEqual(trainBPE(["ab", "cd"], 1).merges, [["a", "b"]], "equal counts use lexical pair order");
assert.deepEqual(trainBPE(["ab"], 0).steps, [], "zero merges leaves the corpus unmerged");
assert.equal(trainBPE(["a"], 50).steps.length, 0, "training stops when no pairs remain");
assert.deepEqual(wordTokens(""), []);
assert.deepEqual(characterTokens(""), []);
assert.deepEqual(wordTokens("a"), ["a"]);
assert.deepEqual(characterTokens("a"), [["a"]]);
assert.deepEqual(wordTokens("İı ÇĞÖŞÜ!"), ["İı", "ÇĞÖŞÜ", "!"]);
assert.deepEqual(characterTokens("ç"), [["ç"]]);

const lowered = preprocess("İIı ÇĞÖŞÜ, ate eating eaten", {lower:true});
assert.equal(lowered.text, "iıı çğöşü, ate eating eaten", "Turkish locale lowercasing preserves dotted and dotless i");
const normalized = preprocess("İIı ÇĞÖŞÜ", {lower:true, accents:true});
assert.equal(normalized.text, "iıı cgosu", "accent-mark stripping preserves dotless ı as a distinct character");
assert.equal(preprocess("A, the cat!", {lower:true, punct:true, stop:true}).text, "cat");
assert.equal(preprocess("ate eaten eating", {lower:true, stem:true}).text, "eat eat eat");
assert.equal(preprocess("").text, "", "empty text remains empty");

const measured = stats([["a", "b"], ["a"]], ["a"]);
assert.deepEqual(measured, {tokenCount:3, typeCount:2, avgPerWord:1.5, unkCount:1, unkRate:1/3});
assert.deepEqual(stats([]), {tokenCount:0, typeCount:0, avgPerWord:0, unkCount:0, unkRate:0});

const longWord = "ç".repeat(8192);
const longModel = trainBPE([longWord], 500);
assert.equal(decodeBPE(encodeBPE(longWord, longModel.merges)), longWord);
assert.ok(longModel.merges.length <= 500);

let seed = 451;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000; };
const alphabet = Array.from("abcçğışüİı");
for(let i = 0; i < 200; i++){
  const word = Array.from({length:1 + Math.floor(random() * 24)}, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
  assert.equal(decodeBPE(encodeBPE(word, bpe.merges)), word, `BPE round-trip ${i + 1}`);
}

console.log("Tokenization and BPE checks passed: classic merges, ties, Unicode, limits, stats, and 200 round-trips.");
