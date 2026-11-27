import assert from "node:assert/strict";
import {SLIDE_TREE, treeNext, greedy, beam, exact, truncate, sampleSeq} from "../static/js/decode.js";
import {mulberry32} from "../static/js/attn.js";

const next = treeNext(SLIDE_TREE), close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
let checks = 0;
const test = (name, fn) => { fn(); checks++; };

test("slide 30: greedy takes nice then woman", () => {
  const r = greedy(next, ["The"], 2);
  assert.deepEqual(r.seq, ["The", "nice", "woman"]);
  close(r.p, .2);
});
test("slide 31: beam of 2 finds dog has", () => {
  const r = beam(next, ["The"], 2, 2);
  assert.deepEqual(r.results.map(h => h.seq.join(" ")), ["The dog has", "The nice woman"]);
  close(r.results[0].p, .36);
  assert.equal(r.trace.length, 2);
  assert.equal(r.trace[1].candidates, 6);
});
test("beam of 1 is greedy", () => assert.deepEqual(beam(next, ["The"], 1, 2).results[0].seq, greedy(next, ["The"], 2).seq));
test("exact search finds the most probable sequence", () => {
  const r = exact(next, ["The"], 2);
  assert.deepEqual(r.seq, ["The", "dog", "has"]);
  close(r.p, .36);
});
test("exact search gives up beyond its budget", () => assert.equal(exact(next, ["The"], 2, 2), null));
test("a prefix with no continuation ends there", () => {
  assert.deepEqual(greedy(next, ["yok"], 3), {seq:["yok"], p:1});
  assert.deepEqual(beam(next, ["yok"], 3, 3).results, [{seq:["yok"], p:1}]);
});
test("top-k keeps k words and renormalises", () => {
  const r = truncate(next(["The"]), 2, 1);
  assert.deepEqual(r.map(o => o.w), ["nice", "dog"]);
  close(r[0].q, 5 / 9);
});
test("low temperature sharpens, high temperature flattens", () => {
  const list = next(["The"]);
  assert.ok(truncate(list, 3, .1)[0].q > .9);
  assert.ok(Math.abs(truncate(list, 3, 100)[0].q - 1 / 3) < .01);
  assert.ok(Number.isFinite(truncate(list, 3, 0)[0].q));
});
test("sampling with k = 1 is greedy, and a seed repeats itself", () => {
  const opt = k => ({k, temperature:1, steps:2, rnd:mulberry32(7)});
  assert.deepEqual(sampleSeq(next, ["The"], opt(1)).seq, ["The", "nice", "woman"]);
  assert.deepEqual(sampleSeq(next, ["The"], opt(3)), sampleSeq(next, ["The"], opt(3)));
});

console.log(`decode: ${checks} / ${checks}`);
