// indexer.js
// Builds an in-memory inverted index over a document collection, with
// precomputed TF-IDF weight vectors per document for fast ranking at query time.

const { tokenize } = require("./tokenizer");

class Index {
  constructor() {
    this.documents = new Map();       // id -> { title, url, category, content }
    this.invertedIndex = new Map();   // term -> Map(docId -> termFrequency)
    this.docVectorNorms = new Map();  // id -> precomputed TF-IDF vector magnitude
    this.docLengths = new Map();      // id -> token count (for stats/debugging)
    this.totalDocs = 0;
  }

  /** Ingests a list of {id, title, url, category, content} documents. */
  build(docs) {
    this.totalDocs = docs.length;

    for (const doc of docs) {
      this.documents.set(doc.id, doc);

      // Weight the title more heavily than body by tokenizing it twice.
      const tokens = [
        ...tokenize(doc.title),
        ...tokenize(doc.title),
        ...tokenize(doc.content),
      ];
      this.docLengths.set(doc.id, tokens.length);

      const termFreq = new Map();
      for (const term of tokens) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      }

      for (const [term, freq] of termFreq) {
        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, new Map());
        }
        this.invertedIndex.get(term).set(doc.id, freq);
      }
    }

    this._computeDocVectorNorms();
    return this;
  }

  /** idf(t) = ln( N / (1 + docsContainingTerm) ) + 1  — smoothed inverse document frequency */
  idf(term) {
    const postings = this.invertedIndex.get(term);
    const df = postings ? postings.size : 0;
    return Math.log(this.totalDocs / (1 + df)) + 1;
  }

  /** Precompute each document's TF-IDF vector magnitude, used to normalize cosine similarity. */
  _computeDocVectorNorms() {
    for (const docId of this.documents.keys()) {
      let sumSquares = 0;
      for (const [term, postings] of this.invertedIndex) {
        const tf = postings.get(docId);
        if (tf) {
          const weight = tf * this.idf(term);
          sumSquares += weight * weight;
        }
      }
      this.docVectorNorms.set(docId, Math.sqrt(sumSquares) || 1);
    }
  }

  stats() {
    return {
      totalDocuments: this.totalDocs,
      totalTerms: this.invertedIndex.size,
      avgDocLength: Math.round(
        [...this.docLengths.values()].reduce((a, b) => a + b, 0) / this.totalDocs
      ),
    };
  }
}

module.exports = { Index };
