// tokenizer.js
// Turns raw text into a clean list of index-ready tokens:
// lowercase -> strip punctuation -> split on whitespace -> remove stopwords -> light stemming

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "he", "in", "is", "it", "its", "of", "on", "that", "the", "to", "was",
  "were", "will", "with", "this", "these", "those", "or", "but", "not",
  "can", "than", "then", "so", "such", "into", "if", "which", "while",
  "their", "each", "other", "also", "often", "using", "used", "use",
  "when", "where", "how", "what", "any", "all", "more", "most", "some"
]);

/**
 * Very light suffix-stripping stemmer. Not linguistically perfect,
 * but good enough to unify plurals / verb forms for search matching
 * (e.g. "indexes" / "indexing" / "indexed" -> "index").
 */
function stem(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokenize(text, { removeStopwords = true, applyStemming = true } = {}) {
  if (!text) return [];

  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation
    .split(/\s+/)
    .filter(Boolean);

  return raw
    .filter((w) => !removeStopwords || !STOPWORDS.has(w))
    .map((w) => (applyStemming ? stem(w) : w))
    .filter((w) => w.length > 1);
}

module.exports = { tokenize, stem, STOPWORDS };
