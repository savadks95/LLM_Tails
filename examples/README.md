# Examples

Real before/after comparisons showing how LLM_Tails changes AI agent behavior across all four pillars.

Each example shows the same prompt given to the same model with and without LLM_Tails active.

| Example | Pillar demonstrated | Key difference |
|---------|-------------------|----------------|
| [Debounce](debounce.md) | Minimal code | 116 → 10 lines |
| [API client](api-client.md) | Minimal code + Anti-hallucination | No invented wrapper class, verified fetch API |
| [Wiki-aware bugfix](wiki-aware-bugfix.md) | Architecture awareness | Reads wiki before patching, fixes root cause |
