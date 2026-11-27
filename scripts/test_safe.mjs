import assert from "node:assert/strict";
import {clampNumber, restore} from "../static/js/safe.js";

assert.equal(clampNumber("999999", 1, 60, 5), 60);
assert.equal(clampNumber("-5", 1, 60, 5), 1);
assert.equal(clampNumber("", 1, 60, 5), 5);
assert.equal(clampNumber("abc", NaN, NaN, 7), 7);
assert.equal(clampNumber("0.25", 0, 1, 0.5), 0.25);

const base = {n:2, text:"a", lower:false, lam:{}, list:[]};
assert.deepEqual(restore(base, null), base);
assert.deepEqual(restore(base, {n:999999, text:5, lower:true, lam:{"2":[1, 0]}, list:{}, extra:1}, {n:[1, 3]}),
  {n:3, text:"a", lower:true, lam:{"2":[1, 0]}, list:[]});
assert.equal(restore(base, {n:NaN}).n, 2);

console.log("safe: ok");
