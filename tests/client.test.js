const axios = require('axios');
const { WeatherClient } = require('../src/client');

// Mock axios at module level
jest.mock('axios');

describe('WeatherClient', () => {
  let client;
  let mockAxiosInstance;

  beforeEach(() => {
    // Create a mock axios instance with interceptors
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    axios.create.mockReturnValue(mockAxiosInstance);

    client = new WeatherClient({
      apiKey: 'test-key-123',
      baseURL: 'https://api.test.com/v1',
      enableCache: false, // disable cache for most tests
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetchWeather returns weather data for a valid city', async () => {
    const mockData = {
      city: 'London',
      temperature: 15.2,
      humidity: 72,
      description: 'Partly cloudy',
    };

    mockAxiosInstance.get.mockResolvedValue({
      data: mockData,
      status: 200,
      config: { metadata: { startTime: Date.now() } },
    });

    const result = await client.fetchWeather('London');

    expect(result).toEqual(mockData);
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/weather', {
      params: { q: 'London', units: 'metric' },
    });
  });

  test('fetchWeather throws error for empty city name', async () => {
    await expect(client.fetchWeather('')).rejects.toThrow(
      'City name is required and must be a string'
    );

    await expect(client.fetchWeather(null)).rejects.toThrow(
      'City name is required and must be a string'
    );
  });

  test('fetchForecast returns array of daily forecasts', async () => {
    const mockForecasts = [
      { date: '2026-02-13', high: 12, low: 5, description: 'Sunny' },
      { date: '2026-02-14', high: 10, low: 3, description: 'Cloudy' },
      { date: '2026-02-15', high: 8, low: 2, description: 'Rain' },
    ];

    mockAxiosInstance.get.mockResolvedValue({
      data: { list: mockForecasts },
      status: 200,
      config: { metadata: { startTime: Date.now() } },
    });

    const result = await client.fetchForecast('Berlin', 3);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('date');
    expect(result[0]).toHaveProperty('high');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/forecast', {
      params: { q: 'Berlin', days: 3, units: 'metric' },
    });
  });

  test('fetchForecast throws for invalid days parameter', async () => {
    await expect(client.fetchForecast('Paris', 0)).rejects.toThrow(
      'Days must be between 1 and 14'
    );

    await expect(client.fetchForecast('Paris', 15)).rejects.toThrow(
      'Days must be between 1 and 14'
    );
  });

  test('fetchWeather handles 404 city not found', async () => {
    const error = new Error('Request failed with status code 404');
    error.response = { status: 404, statusText: 'Not Found' };
    mockAxiosInstance.get.mockRejectedValue(error);

    await expect(client.fetchWeather('Atlantis')).rejects.toThrow(
      'City "Atlantis" not found'
    );
  });

  test('fetchWeather handles canceled request (axios 0.27 pattern)', async () => {
    // In axios 0.27.x, canceled requests throw with message === 'canceled'
    // This is the OLD pattern — axios 1.x uses error.code === 'ERR_CANCELED'
    const error = new Error('canceled');
    mockAxiosInstance.get.mockRejectedValue(error);

    await expect(client.fetchWeather('Tokyo')).rejects.toThrow(
      'Request was canceled by the user'
    );
  });
});
