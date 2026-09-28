// Minimal in-memory stand-in for browser.storage, enough for storage.js.

function area(initial) {
  let data = Object.assign({}, initial);
  const pick = (keys) => {
    if (keys === null || keys === undefined) return Object.assign({}, data);
    if (typeof keys === "string") keys = [keys];
    if (Array.isArray(keys)) {
      const out = {};
      keys.forEach((k) => {
        if (k in data) out[k] = structuredClone(data[k]);
      });
      return out;
    }
    // Object of defaults.
    const out = {};
    Object.keys(keys).forEach((k) => {
      out[k] = k in data ? structuredClone(data[k]) : keys[k];
    });
    return out;
  };
  return {
    get: async (keys) => pick(keys),
    set: async (items) => {
      Object.assign(data, structuredClone(items));
    },
    remove: async (keys) => {
      (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete data[k]);
    },
    dump: () => data,
  };
}

function install(local, sync) {
  globalThis.browser = { storage: { local: area(local), sync: area(sync) } };
  return globalThis.browser;
}

module.exports = { install };
