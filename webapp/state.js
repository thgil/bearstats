// Minimal reactive state. Subscribers receive the full state + a list of keys that changed.
export function createState(initial = {}) {
  const state = { ...initial };
  const subs = new Set();

  function get(key) {
    return state[key];
  }

  function set(patch) {
    const changed = [];
    for (const [k, v] of Object.entries(patch)) {
      if (state[k] !== v) {
        state[k] = v;
        changed.push(k);
      }
    }
    if (changed.length === 0) return;
    for (const fn of subs) fn(state, changed);
  }

  function subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  }

  return { get, set, subscribe };
}
