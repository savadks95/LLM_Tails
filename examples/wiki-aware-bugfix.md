# Wiki-Aware Bugfix

**Task:** "Users report they can't log in after changing their password."

## Without LLM_Tails

The agent jumps straight to the login handler, sees the password comparison, and patches it:

```javascript
// src/auth/login.js — agent's fix
async function login(email, password) {
  const user = await db.users.findByEmail(email);
  if (!user) throw new AuthError('Invalid credentials');

  // Agent adds: "maybe the hash isn't being compared correctly"
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw new AuthError('Invalid credentials');

  // Agent adds: clear any cached sessions (speculative)
  await redis.del(`sessions:${user.id}`);

  return generateToken(user);
}
```

Problems:
- Didn't trace callers — the `changePassword` function is the actual bug source
- Added speculative cache clearing that may break existing sessions
- Didn't check if the project even uses Redis

## With LLM_Tails

**Pillar 1 (understand first):**
1. Read `wiki/index.md` → found `wiki/entities/auth.md` describing the auth flow
2. Wiki says: "Password changes go through `changePassword()` in `src/auth/password.js`, which calls `hashPassword()` and updates the DB"
3. Grep for `changePassword` callers → found the route handler and the settings page
4. Read `changePassword()` → found the bug:

```javascript
// src/auth/password.js — THE ACTUAL BUG
async function changePassword(userId, newPassword) {
  // Bug: stores plaintext instead of hash
  await db.users.update(userId, { passwordHash: newPassword });
}
```

**Pillar 2 (ladder):** Root-cause fix, one line:

```javascript
async function changePassword(userId, newPassword) {
  const hashed = await hashPassword(newPassword);
  await db.users.update(userId, { passwordHash: hashed });
}
```

**Pillar 3 (no hallucination):** `[verified]` — `hashPassword` exists in `src/auth/utils.js:L12`. `[verified]` — `db.users.update` signature confirmed in `src/db/users.js:L45`.

**Pillar 4 (consistency):** Matches the pattern used in `createUser()` which already calls `hashPassword()`.

→ skipped: session clearing, login handler changes, speculative fixes. The login handler was never broken — `changePassword` was storing plaintext.

Wiki update: appended to `wiki/entities/auth.md`:
```
## Bug: plaintext password storage in changePassword (fixed YYYY-MM-DD)
`changePassword()` was not hashing the new password before storing.
Root cause: missing `hashPassword()` call. See src/auth/password.js.
```

**This is the key LLM_Tails difference: Pillar 1 (read the wiki, trace the flow) prevented a wrong fix. The agent found the root cause instead of patching the symptom.**
