# API Client

**Task:** "Create an API client for our user service."

## Without LLM_Tails — ~80 lines

The agent builds a full abstraction layer it invented:

```javascript
class ApiClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
    this.headers = { 'Content-Type': 'application/json', ...options.headers };
  }

  async request(method, path, body = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    // ... retry logic, error class, interceptors
  }

  async get(path) { return this.request('GET', path); }
  async post(path, body) { return this.request('POST', path, body); }
  async put(path, body) { return this.request('PUT', path, body); }
  async delete(path) { return this.request('DELETE', path); }
}

class UserService extends ApiClient {
  constructor() { super('/api'); }
  async getUser(id) { return this.get(`/users/${id}`); }
  async createUser(data) { return this.post('/users', data); }
  // ... more methods
}

// Custom error class
class ApiError extends Error { /* ... */ }
```

Problems:
- **Hallucination risk:** Invented `AbortController` timeout pattern may not match the project's existing error handling
- **Over-engineering:** Factory pattern, custom error class, retry logic — none requested
- **Consistency:** Doesn't check how the codebase already makes API calls

## With LLM_Tails — ~15 lines

**Pillar 1 (understand first):** Grep the codebase for existing fetch/API patterns. Found: the project already uses `fetch` directly with a shared `API_BASE` constant.

**Pillar 2 (ladder):** Rung 4 — `fetch` is the native platform feature. No wrapper needed.

**Pillar 3 (no hallucination):** `[verified]` — `fetch` API exists. `[verified]` — project uses `API_BASE` from `src/config.js`.

**Pillar 4 (consistency):** Match existing `fetch` usage pattern from `src/services/posts.js`.

```javascript
// src/services/users.js
import { API_BASE } from '../config.js';

export async function getUser(id) {
  const res = await fetch(`${API_BASE}/users/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch user ${id}: ${res.status}`);
  return res.json();
}

export async function createUser(data) {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create user: ${res.status}`);
  return res.json();
}
```

→ skipped: ApiClient class, retry logic, interceptors, custom error class. Add when a second service needs the same boilerplate — then extract a shared helper, not a class hierarchy.

`tails: no retry logic, add per-endpoint if idempotency is guaranteed`
