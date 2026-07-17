const express = require("express");
const path = require("path");
const fs = require("fs");

const { Index } = require("./src/indexer");
const { search } = require("./src/search");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Build the search index once at startup ---
const documents = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "documents.json"), "utf-8")
);
const index = new Index().build(documents);
console.log(`Indexed ${documents.length} documents:`, index.stats());

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// --- API routes ---

app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").trim();
  const limit = Math.min(parseInt(req.query.limit) || 10, 40);

  if (!q) {
    return res.json({ query: q, results: [], tookMs: 0, total: 0 });
  }

  const { results, tookMs, queryTerms } = search(index, q, { limit });

  res.json({
    query: q,
    queryTerms,
    results,
    total: results.length,
    tookMs,
  });
});

app.get("/api/stats", (req, res) => {
  res.json(index.stats());
});

app.get("/api/suggest", (req, res) => {
  // Lightweight autocomplete: returns document titles whose tokens start
  // with the query prefix. Not a full trie-based suggester, but demonstrates
  // the concept cheaply for a portfolio-scale corpus.
  const prefix = (req.query.q || "").trim().toLowerCase();
  if (!prefix) return res.json({ suggestions: [] });

  const suggestions = documents
    .filter((d) => d.title.toLowerCase().includes(prefix))
    .slice(0, 5)
    .map((d) => d.title);

  res.json({ suggestions });
});

app.listen(PORT, () => {
  console.log(`Search engine running at http://localhost:${PORT}`);
});
