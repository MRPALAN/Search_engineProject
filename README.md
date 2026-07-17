# grepr — a full-stack search engine

A search engine built from first principles: a custom **inverted index**, **TF-IDF** term weighting, and **cosine similarity** ranking on the backend, served through a REST API and a live-search frontend. No Elasticsearch, no Algolia — the ranking math is all yours to explain in an interview.

## Why this project is a good portfolio piece

Most portfolio projects are CRUD apps. This one proves you understand:
- **Algorithms & data structures** — inverted index, hash maps, vector math (this is the part interviewers actually probe)
- **Information retrieval fundamentals** — TF-IDF, cosine similarity, tokenization, stemming, stopword filtering
- **Backend API design** — a clean REST API (`/api/search`, `/api/stats`, `/api/suggest`) built on Express
- **Frontend engineering** — debounced live search, keyboard shortcuts, XSS-safe rendering, responsive design
- **Systems thinking** — you can talk about how this would scale (sharding the index, adding a real crawler, caching hot queries, moving ranking to a background service)

## Architecture

```
┌─────────────┐      GET /api/search?q=...      ┌──────────────────┐
│  Frontend   │ ───────────────────────────────▶ │   Express API    │
│ (vanilla JS)│ ◀─────────────────────────────── │   server.js      │
└─────────────┘         JSON results             └────────┬─────────┘
                                                            │
                                          ┌─────────────────┴─────────────────┐
                                          │                                   │
                                 ┌────────▼────────┐                ┌────────▼────────┐
                                 │  indexer.js      │                │  search.js       │
                                 │  builds inverted  │                │  TF-IDF cosine   │
                                 │  index at startup │                │  ranking at      │
                                 │                    │                │  query time      │
                                 └────────┬───────────┘                └──────────────────┘
                                          │
                                 ┌────────▼────────┐
                                 │ tokenizer.js     │
                                 │ lowercase, strip │
                                 │ punctuation,     │
                                 │ stopwords, stem  │
                                 └──────────────────┘
```

**How a query is scored:**
1. Query text is tokenized the same way documents were (lowercased, stopwords removed, lightly stemmed).
2. Each query term's weight is `termFrequency × inverseDocumentFrequency` — rare, distinctive words count more than common ones.
3. For every document sharing at least one query term, we compute the **dot product** of the query vector and the document's precomputed TF-IDF vector.
4. Dividing by both vector magnitudes gives **cosine similarity** — a 0–1 score independent of document length, so a long article doesn't automatically outrank a short one just by containing more words.
5. Results are sorted by score and returned with a highlighted snippet.

## Project structure

```
search-engine-project/
├── server.js            # Express app + API routes
├── src/
│   ├── tokenizer.js      # text -> clean tokens (stopwords, stemming)
│   ├── indexer.js        # builds the inverted index + TF-IDF vectors
│   └── search.js         # query-time ranking + snippet generation
├── data/
│   └── documents.json    # sample corpus (40 programming/CS docs)
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js            # live search, debouncing, rendering
└── package.json
```

## Running it locally

```bash
npm install
npm start
# open http://localhost:3000
```

Press `/` anywhere on the page to jump into the search box.

## API reference

| Endpoint | Description |
|---|---|
| `GET /api/search?q=<query>&limit=<n>` | Returns ranked results with scores, snippets, and query time |
| `GET /api/stats` | Index size stats (doc count, term count, avg doc length) |
| `GET /api/suggest?q=<prefix>` | Basic title-prefix autocomplete |

## Extending it (good next steps if you want to go deeper)

- **Real crawler**: `src/tokenizer.js` and `src/indexer.js` don't care where documents come from — swap `data/documents.json` for pages fetched with a crawler (e.g. `axios` + `cheerio`) respecting `robots.txt`.
- **Persistence**: index is rebuilt in memory on every restart; move it to SQLite or Postgres with a `tsvector` column for a production-shaped version.
- **Phrase queries & filters**: extend postings lists to store term positions for `"exact phrase"` search, and add category/date filters.
- **Pagination**: `/api/search` currently returns a flat top-N; add `offset` support.
- **Learning-to-rank**: replace pure TF-IDF with a signal blend (title match boost, freshness, click-through data) — this is the natural next thing to bring up in an interview once you've explained the current ranking.

## Talking about this in an interview / on your resume

Suggested resume bullet:
> Built a full-stack search engine (Node.js/Express + vanilla JS) implementing a custom inverted index and TF-IDF/cosine-similarity ranking from scratch, with a live-search UI and sub-5ms query latency over a 40-document corpus.

Be ready to explain, on a whiteboard:
- Why cosine similarity instead of raw dot product (length normalization)
- Why IDF is log-scaled (diminishing returns on rarity)
- Time complexity of a query: `O(terms × avg postings list length)`, not `O(all documents)` — this is *why* inverted indexes exist
- What you'd change to handle 10 million documents instead of 40 (sharding the index, a proper crawler, a real database instead of in-memory `Map`s)
