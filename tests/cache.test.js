const { Cache } = require('../src/cache');

describe('Cache', () => {
  let cache;

  beforeEach(() => {
    cache = new Cache();
  });

  test('set and get a value within TTL', () => {
    cache.set('weather:london', { temp: 15 }, 60000);

    const result = cache.get('weather:london');
    expect(result).toEqual({ temp: 15 });
  });

  test('has returns true for non-expired key', () => {
    cache.set('forecast:paris', [1, 2, 3], 60000);

    expect(cache.has('forecast:paris')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  test('get returns undefined for expired entry', async () => {
    cache.set('short-lived', 'hello', 1); // 1ms TTL

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 20));

    expect(cache.get('short-lived')).toBeUndefined();
    expect(cache.has('short-lived')).toBe(false);
  });

  test('clear removes all entries', () => {
    cache.set('a', 1, 60000);
    cache.set('b', 2, 60000);
    cache.set('c', 3, 60000);

    expect(cache.size).toBe(3);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  test('overwriting a key updates the value and TTL', () => {
    cache.set('key', 'old-value', 60000);
    cache.set('key', 'new-value', 120000);

    expect(cache.get('key')).toBe('new-value');
    expect(cache.size).toBe(1);
  });
});
