import assert from "node:assert/strict";

globalThis.location = {search: "", pathname: "/"};
const [{LECTURES}, {VIEWS}] = await Promise.all([
  import("../static/js/lessons.js"),
  import("../static/js/core.js")
]);

const questions = new Set();
for (const [lectureNumber, course] of Object.entries(LECTURES)) {
  for (const [index, section] of course.sections.entries()) {
    const label = `Lecture ${lectureNumber}, section ${index + 1}`;
    assert.ok(section.gut, `${label} has a source label`);
    assert.ok(section.h.trim(), `${label} has a heading`);
    assert.ok(section.p.length >= 1, `${label} has at least one paragraph`);
    for (const paragraph of section.p) assert.ok(paragraph.trim(), `${label} has non-empty text`);
    for (const [, action] of section.chips || []) {
      if (action.v) assert.ok(VIEWS.includes(action.v), `${label} links to a known view`);
    }
  }
  for (const [index, [question, choices, answer, explanation]] of course.quiz.entries()) {
    const label = `Lecture ${lectureNumber}, question ${index + 1}`;
    assert.ok(question.trim(), `${label} is non-empty`);
    assert.ok(choices.length >= 3 && choices.length <= 5, `${label} has three to five choices`);
    assert.ok(Number.isInteger(answer) && answer >= 0 && answer < choices.length, `${label} has a valid answer`);
    assert.ok(explanation.trim(), `${label} has an explanation`);
    assert.ok(!questions.has(question), `${label} is unique`);
    questions.add(question);
  }
}

const lecture = LECTURES[6];
assert.ok(lecture, "Lecture 6 is registered");
assert.equal(lecture.sections.length, 28, "Lecture 6 has 28 sections");
assert.equal(lecture.quiz.length, 42, "Lecture 6 has 42 quiz questions");

for (const [index, section] of lecture.sections.entries()) {
  assert.match(section.gut, /^DL-[1-7] · slayt \d+/, `section ${index + 1} has a source`);
}

const questionSources = new Map();
for (const [index, [question, choices, answer, explanation]] of lecture.quiz.entries()) {
  assert.match(explanation, /\(DL-[1-7], slayt \d+/, `question ${index + 1} cites a slide`);

  const source = explanation.match(/\(DL-(\d), slayt \d+/)?.[1];
  assert.ok(source, `question ${index + 1} identifies its PDF`);
  questionSources.set(source, (questionSources.get(source) || 0) + 1);
}

assert.deepEqual(
  [...questionSources.entries()].sort(([a], [b]) => Number(a) - Number(b)),
  Array.from({length: 7}, (_, index) => [String(index + 1), 6]),
  "each of the seven PDFs contributes six questions"
);
console.log("Lecture 6: 28 sourced sections and 42 sourced quiz questions passed.");
