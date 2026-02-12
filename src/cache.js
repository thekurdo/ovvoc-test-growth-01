/**
 * Simple in-memory cache with TTL support.
 * No external dependencies.
 */
class Cache {
  constructor() {
    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this._store = new Map();
  }

  /**
   * Get a cached value by key. Returns undefined if not found or expired.
   * @param {string} key
   * @returns {any|undefined}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache with a TTL.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Check if a key exists and is not expired.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this._store.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all entries from the cache.
   */
  clear() {
    this._store.clear();
  }

  /**
   * Get the number of entries currently in the cache (including possibly expired).
   * @returns {number}
   */
  get size() {
    return this._store.size;
  }
}

module.exports = { Cache };
