import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.AIRTABLE_API_KEY = 'test-key';
process.env.AIRTABLE_BASE_ID = 'test-base';
process.env.GITHUB_TOKEN = 'test-token';
process.env.GITHUB_WEBHOOK_SECRET = 'test-secret';
process.env.GOOGLE_PLACES_API_KEY = 'test-places-key';
process.env.VERCEL_BLOB_READ_WRITE_TOKEN = 'test-blob-token';
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock fetch globally
global.fetch = vi.fn();
