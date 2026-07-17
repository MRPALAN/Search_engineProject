const input = document.getElementById("search-input");
const resultsEl = document.getElementById("results");
const metaEl = document.getElementById("search-meta");
const emptyState = document.getElementById("empty-state");
const statsEl = document.getElementById("index-stats");
const chipRow = document.getElementById("example-chips");

const EXAMPLE_QUERIES = [
  "binary search tree",
  "tf-idf ranking",
  "docker containers",
  "sql injection",
  "react hooks",
  "load balancing",
];

let debounceTimer = null;

// --- Index stats in the top bar ---
fetch("/api/stats")
  .then((r) => r.json())
  .then((s) => {
    statsEl.textContent = `${s.totalDocuments} docs · ${s.totalTerms} terms indexed`;
  })
  .catch(() => {
    statsEl.textContent = "index unavailable";
  });

// --- Example query chips ---
EXAMPLE_QUERIES.forEach((q) => {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.textContent = q;
  chip.addEventListener("click", () => {
    input.value = q;
    runSearch(q);
    input.focus();
  });
  chipRow.appendChild(chip);
});

// --- Live search ---
input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = input.value.trim();
  if (!q) {
    resultsEl.innerHTML = "";
    metaEl.textContent = "";
    emptyState.classList.add("visible");
    return;
  }
  debounceTimer = setTimeout(() => runSearch(q), 150);
});

// Keyboard shortcut: "/" focuses search from anywhere
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
  }
});

async function runSearch(query) {
  emptyState.classList.remove("visible");
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  render(data);
}

function render(data) {
  const { results, tookMs, total, queryTerms } = data;

  metaEl.textContent = total > 0 ? `${total} results · ${tookMs}ms` : `0 results · ${tookMs}ms`;

  if (results.length === 0) {
    resultsEl.innerHTML = "";
    emptyState.classList.add("visible");
    emptyState.querySelector("p").textContent = "No matches. Try a different term.";
    return;
  }

  resultsEl.innerHTML = results
    .map(
      (r, i) => `
    <li class="result" onclick="window.open('${r.url}', '_blank')">
      <div class="result-rank">${String(i + 1).padStart(2, "0")}</div>
      <div>
        <p class="result-title">${escapeHtml(r.title)}</p>
        <p class="result-url">${escapeHtml(r.url)}</p>
        <p class="result-snippet">${highlight(escapeHtml(r.snippet), queryTerms)}</p>
        <div class="result-footer">
          <span class="result-category">${escapeHtml(r.category)}</span>
          <span class="result-score">score ${r.score}</span>
        </div>
      </div>
    </li>
  `
    )
    .join("");
}

function highlight(text, terms) {
  if (!terms || terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi");
  return text.replace(pattern, "<mark>$1</mark>");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
