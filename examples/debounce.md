# Debounce

**Task:** "Add debounce to a search input in vanilla JavaScript."

## Without LLM_Tails — 116 lines

The agent creates three versions: a basic debounce utility, an "enhanced" version with loading state, and an "advanced" version with cancel and immediate options. Plus a full HTML/CSS template and a feature comparison table.

```javascript
// Version 1: basic debounce utility function
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
// ... + handleSearch + debouncedSearch + event listener (48 lines)

// Version 2: "Enhanced" with loading state
// ... + loadingIndicator + displayResults (40 lines)

// Version 3: "Advanced" with cancel & immediate options
function debounce(func, delay, options = {}) { /* ... */ }
// ... + cancel method + blur handler (28 lines)
```

Plus HTML template, CSS styling, and a feature comparison table.

**116 lines total.**

## With LLM_Tails — 10 lines

**Pillar 2 (ladder):** `setTimeout` + `clearTimeout` IS the debounce. Rung 3: stdlib does it.

**Pillar 3 (no hallucination):** No invented "enhanced" API. `[verified]` — `clearTimeout`/`setTimeout` are standard Web API.

**Pillar 4 (consistency):** Matches the existing event listener pattern in the codebase.

```javascript
const searchInput = document.querySelector('input[type="search"]');
let debounceTimer;

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetch(`/api/search?q=${encodeURIComponent(e.target.value)}`)
      .then(r => r.json())
      .then(data => console.log(data)); // replace with your render
  }, 300);
});
```

→ skipped: debounce utility, class wrapper, config object. Add a utility when needed on 3+ inputs.

**116 → 10 lines**, same model, same prompt.
