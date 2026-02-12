const axios = require('axios');
const { Cache } = require('./cache');

const DEFAULT_BASE_URL = 'https://api.weatherservice.example.com/v1';
const DEFAULT_TIMEOUT = 10000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class WeatherClient {
  /**
   * @param {object} options
   * @param {string} [options.apiKey]
   * @param {string} [options.baseURL]
   * @param {number} [options.timeout]
   * @param {boolean} [options.enableCache]
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || '';
    this.enableCache = options.enableCache !== false;
    this.cache = new Cache();

    // Create axios instance with baseURL and timeout — standard 0.27.x pattern
    this.http = axios.create({
      baseURL: options.baseURL || DEFAULT_BASE_URL,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    // Request interceptor to add timestamp
    this.http.interceptors.request.use((config) => {
      config.metadata = { startTime: Date.now() };
      return config;
    });

    // Response interceptor to log duration
    this.http.interceptors.response.use((response) => {
      const duration = Date.now() - response.config.metadata.startTime;
      response.duration = duration;
      return response;
    });
  }

  /**
   * Fetch current weather for a city.
   * @param {string} city - City name (e.g. "London")
   * @returns {Promise<object>} Weather data
   */
  async fetchWeather(city) {
    if (!city || typeof city !== 'string') {
      throw new Error('City name is required and must be a string');
    }

    const cacheKey = `weather:${city.toLowerCase()}`;

    if (this.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await this.http.get('/weather', {
        params: { q: city, units: 'metric' },
      });

      const data = response.data;

      if (this.enableCache) {
        this.cache.set(cacheKey, data, CACHE_TTL);
      }

      return data;
    } catch (error) {
      // OLD axios 0.27.x pattern: check error.message for cancel detection
      // In axios 1.x this should be error.code === 'ERR_CANCELED'
      if (error.message === 'canceled') {
        throw new Error('Request was canceled by the user');
      }

      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new Error(`City "${city}" not found`);
        }
        if (status === 401) {
          throw new Error('Invalid API key');
        }
        if (status === 429) {
          throw new Error('Rate limit exceeded, please try again later');
        }
        throw new Error(`Weather API error: ${status} ${error.response.statusText}`);
      }

      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timed out after ${DEFAULT_TIMEOUT}ms`);
      }

      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Fetch weather forecast for a city.
   * @param {string} city - City name
   * @param {number} [days=5] - Number of forecast days (1-14)
   * @returns {Promise<Array>} Array of daily forecasts
   */
  async fetchForecast(city, days = 5) {
    if (!city || typeof city !== 'string') {
      throw new Error('City name is required and must be a string');
    }

    if (days < 1 || days > 14) {
      throw new Error('Days must be between 1 and 14');
    }

    const cacheKey = `forecast:${city.toLowerCase()}:${days}`;

    if (this.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await this.http.get('/forecast', {
        params: { q: city, days, units: 'metric' },
      });

      const forecasts = response.data.list || response.data;

      if (this.enableCache) {
        this.cache.set(cacheKey, forecasts, CACHE_TTL);
      }

      return forecasts;
    } catch (error) {
      // OLD axios 0.27.x cancel check pattern
      if (error.message === 'canceled') {
        throw new Error('Request was canceled by the user');
      }

      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new Error(`City "${city}" not found`);
        }
        throw new Error(`Forecast API error: ${status} ${error.response.statusText}`);
      }

      throw new Error(`Network error: ${error.message}`);
    }
  }

  /**
   * Clear the internal cache.
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { WeatherClient };
