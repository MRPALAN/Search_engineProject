// search.js
// Ranks documents against a query using TF-IDF weighted cosine similarity,
// and generates a highlighted snippet for each result.

const { tokenize } = require("./tokenizer");

function search(index, rawQuery, { limit = 10 } = {}) {
  const start = process.hrtime.bigint();

  const queryTerms = tokenize(rawQuery);
  if (queryTerms.length === 0) {
    return { results: [], tookMs: 0, queryTerms: [] };
  }

  // Build query term-frequency vector.
  const queryTf = new Map();
  for (const term of queryTerms) {
    queryTf.set(term, (queryTf.get(term) || 0) + 1);
  }

  // Query vector weights (tf * idf) and its magnitude.
  const queryWeights = new Map();
  let queryNormSq = 0;
  for (const [term, tf] of queryTf) {
    const weight = tf * index.idf(term);
    queryWeights.set(term, weight);
    queryNormSq += weight * weight;
  }
  const queryNorm = Math.sqrt(queryNormSq) || 1;

  // Accumulate dot products per candidate document (only docs containing >=1 query term).
  const dotProducts = new Map(); // docId -> score accumulator

  for (const [term, queryWeight] of queryWeights) {
    const postings = index.invertedIndex.get(term);
    if (!postings) continue;
    const idf = index.idf(term);

    for (const [docId, tf] of postings) {
      const docWeight = tf * idf;
      const contribution = docWeight * queryWeight;
      dotProducts.set(docId, (dotProducts.get(docId) || 0) + contribution);
    }
  }

  const scored = [];
  for (const [docId, dot] of dotProducts) {
    const docNorm = index.docVectorNorms.get(docId) || 1;
    const cosineSim = dot / (docNorm * queryNorm);
    scored.push({ docId, score: cosineSim });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  const results = top.map(({ docId, score }) => {
    const doc = index.documents.get(docId);
    return {
      id: doc.id,
      title: doc.title,
      url: doc.url,
      category: doc.category,
      score: Number(score.toFixed(4)),
      snippet: buildSnippet(doc.content, queryTerms),
    };
  });

  const end = process.hrtime.bigint();
  const tookMs = Number(end - start) / 1e6;

  return { results, tookMs: Number(tookMs.toFixed(2)), queryTerms };
}

/**
 * Builds a short highlighted excerpt around the first sentence that contains
 * a query term, similar to how a search engine shows result snippets.
 */
function buildSnippet(content, queryTerms, maxLen = 220) {
  const sentences = content.split(/(?<=[.!?])\s+/);
  const stemmedQueryTerms = new Set(queryTerms);

  let bestSentence = sentences[0];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if ([...stemmedQueryTerms].some((t) => lower.includes(t))) {
      bestSentence = sentence;
      break;
    }
  }

  let snippet = bestSentence.trim();
  if (snippet.length > maxLen) {
    snippet = snippet.slice(0, maxLen).trim() + "...";
  }

  return snippet;
}

module.exports = { search };
