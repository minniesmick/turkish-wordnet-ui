<h1 align="center">Turkish WordNet · PropBank · FrameNet UI</h1>

<p align="center">
<a href="README.md"><img alt="English" src="https://img.shields.io/badge/English-active-2b3bd6?style=for-the-badge"></a> <a href="README.tr.md"><img alt="Türkçe" src="https://img.shields.io/badge/T%C3%BCrk%C3%A7e-oku-6b7280?style=for-the-badge"></a>
</p>

<p align="center">
<a href="https://www.mef.edu.tr/"><img alt="MEF University" src="https://img.shields.io/badge/MEF%20University-COMP%20451-b42318?style=for-the-badge"></a>
<a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/code-MIT-2b3bd6?style=for-the-badge"></a>
<a href="data/README.md"><img alt="Data licenses" src="https://img.shields.io/badge/data-CC%20BY--SA%204.0%20%2B%20others-6b7280?style=for-the-badge"></a>
</p>

> **Made for studying.** This repository was built as a study aid for **COMP 451 – Introduction to Natural Language Processing** at **MEF University** (Fall 2026). It is a student project, not official course material, and is not affiliated with the university.

A local, dependency-free web app (Python 3 standard library + vanilla JS) for exploring the lexical-semantics resources from the course: Turkish and English WordNet, PropBank, FrameNet and VerbNet, with similarity measures, word sense disambiguation and a concept map.

<p align="center">
  <img src="docs/screenshots/graph.png" width="49%" alt="Concept map">
  <img src="docs/screenshots/search.png" width="49%" alt="Dictionary and side sheet">
</p>
<p align="center"><img src="docs/screenshots/graph-dark.png" width="98%" alt="Dark theme"></p>

## Quick start

```bash
git clone https://github.com/minniesmick/turkish-wordnet-ui
cd turkish-wordnet-ui
python3 server.py        # then open http://127.0.0.1:8770
```

The data (about 116 MB) is already in `data/`. The first start takes a few seconds while it loads into memory. No `pip install` needed.

## Data sources

All data is open source. The files are included in `data/`; click a button to open the original.

<p>
<a href="https://github.com/StarlangSoftware/TurkishWordNet"><img alt="KeNet" src="https://img.shields.io/badge/KeNet-TurkishWordNet-2b3bd6?style=for-the-badge&logo=github&logoColor=white"></a>
<a href="https://github.com/StarlangSoftware/TurkishPropBank"><img alt="TRopBank" src="https://img.shields.io/badge/TRopBank-TurkishPropBank-2b3bd6?style=for-the-badge&logo=github&logoColor=white"></a>
<a href="https://github.com/StarlangSoftware/TurkishFrameNet"><img alt="Turkish FrameNet" src="https://img.shields.io/badge/Turkish%20FrameNet-TurkishFrameNet-2b3bd6?style=for-the-badge&logo=github&logoColor=white"></a>
<a href="https://github.com/propbank/propbank-frames"><img alt="PropBank" src="https://img.shields.io/badge/PropBank-propbank--frames-2b3bd6?style=for-the-badge&logo=github&logoColor=white"></a>
<a href="https://github.com/nltk/nltk_data"><img alt="NLTK" src="https://img.shields.io/badge/NLTK-nltk_data-2b3bd6?style=for-the-badge&logo=github&logoColor=white"></a>
<a href="https://framenet.icsi.berkeley.edu/"><img alt="FrameNet" src="https://img.shields.io/badge/FrameNet-ICSI%20Berkeley-0d1220?style=for-the-badge"></a>
<a href="https://wordnet.princeton.edu/"><img alt="WordNet" src="https://img.shields.io/badge/WordNet-Princeton-0d1220?style=for-the-badge"></a>
<a href="https://verbs.colorado.edu/verbnet/"><img alt="VerbNet" src="https://img.shields.io/badge/VerbNet-CU%20Boulder-0d1220?style=for-the-badge"></a>
<a href="https://propbank.github.io/"><img alt="PropBank" src="https://img.shields.io/badge/PropBank-propbank.github.io-0d1220?style=for-the-badge"></a>
</p>

Per-file sources, licenses and re-download commands: **[data/README.md](data/README.md)**.

## What is inside

| Tab | What it does |
|---|---|
| **Search** | Word, definition, example and ID search in KeNet (Turkish), Princeton WordNet 3.1 and the 1998 dictionary. Click a sense and the others fade while a side sheet opens (definition, hierarchy, relations, translation, roles, notes). |
| **Map** | The concept's hierarchy and links as a relational tree. Click a node to highlight its path and see the relation, distance and similarity (path, Wu-Palmer, Lin) to the centre. Double-click to re-centre. Siblings, line-style filters, **Diagram / Tree** views. |
| **Similarity** | Relation between two words (synonym, antonym, hypernym, hyponym, common ancestor) with path, Wu-Palmer, and information-content measures (Resnik, Lin, Jiang-Conrath) for English. |
| **WSD** | Simplified and extended **Lesk**, and a supervised **Naive Bayes** classifier trained on SemCor and SENSEVAL-2 with 5-fold cross-validation, compared with the most-frequent-sense baseline. |
| **Roles** | PropBank rolesets, Turkish PropBank (TRopBank), VerbNet 3.3, a rule-based Turkish sentence labeller (case suffixes to ARG0/ARG1) and a role quiz. |
| **Frames** | FrameNet 1.7 and Turkish FrameNet: frames, frame elements, lexical units with annotated examples, frame relations. |
| **Morphology** | Analyse a Turkish word into morphemes (`okul+Noun+A3sg+P1sg+Nom`) with the real [Zemberek](https://github.com/ahmetaa/zemberek-nlp) analyser (Apache 2.0, optional: put `zemberek-full.jar` into `lib/` and have a JDK), or with a small built-in rule engine; disambiguate a whole sentence; build a word from stem + suffixes; real BOUN analyses next to it. Student mode adds rule traces, Oflazer finite-state-machine paths in the course's `From State a-State b` format, tag glossary and practice (COMP 451 Lecture 2). |
| **Parsing** | Write a CFG or PCFG (rules with `[probability]`), type a sentence: the CKY chart fills cell by cell, every parse tree is drawn as SVG, PCFG picks the most probable tree and reports sentence probability (COMP 451 Lecture 3, InClass 2 and 3). Runs in the browser. |
| **Dependency** | Pick a sentence from UD Turkish-BOUN (test set, 979 sentences) or paste CoNLL-U: dependency arcs and a head-dependent tree are drawn, tree properties (single root, connected, single-headed, acyclic, projective) are checked, relations are explained, labels can be hidden for self-practice (COMP 451 Lecture 3, InClass 4). |
| **Corpus** | Word and n-gram frequency lists, Zipf plot, type/token ratio and keyword-in-context (KWIC) lines on the UD Turkish-BOUN treebank (lemma / UPOS aware) or Brown sentences (SemCor) (COMP 451 Lecture 5). |
| **N-gram** | Counts and probabilities from your own text, BOUN or Brown: unigram / bigram / trigram tables, next-word prediction, step-by-step sentence probability and perplexity, **Laplace, backoff and interpolation** smoothing, **UNK** for unseen words, random sentence generation, a held-out perplexity comparison and **PMI** collocations / similar-context words (Lecture 5). |
| **Lesson** | Lecture concepts (homonymy, polysemy, hypernymy, ...) as ready-made queries, plus quizzes generated from the data. |

**Two modes.** The *Tool* / *Öğrenci (Student)* switch in the top bar separates plain use from studying. Tool mode only gives results; Student mode adds course links, formulas, step-by-step explanations, rule traces, practice and quizzes (and the Lesson tab). Teaching UI is tagged `.stu` and hidden by CSS in Tool mode.

Extras: **⌘K** command palette, favourites / notes / trail saved in the browser (no account), Markdown export, presentation mode (`P`), keyboard shortcuts (`?`), light/dark theme (`?theme=dark`), and a shareable URL for every view.

Design direction: *İki Renkli Sözlük* (a two-colour dictionary): cool paper, blue-black ink, a single ultramarine accent, categories told apart by line style instead of colour. See [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md).

## Project layout

```
server.py            stdlib HTTP server + JSON API
static/              index.html, css/app.css, js/*.js (ES modules, no build step), fonts/
data/                lexical resources (see data/README.md)
lib/                 optional, git-ignored: zemberek-full.jar (+ compiled bridge)
scripts/             build_srl.py (PropBank/FrameNet), build_nltk.py (SemCor, SENSEVAL, VerbNet, ...)
TODO.md              what is planned next
```

## License

Code: [MIT](LICENSE). Data: each source keeps its own license, listed in [data/README.md](data/README.md). Fonts (Schibsted Grotesk, Spectral, JetBrains Mono): SIL Open Font License 1.1.
