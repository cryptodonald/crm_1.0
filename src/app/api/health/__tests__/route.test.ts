import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
  });

  it('should return 200 status', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it('should return JSON response with status ok', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe('ok');
  });

  it('should include timestamp in response', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.timestamp).toBe('2024-01-01T12:00:00.000Z');
  });

  it('should include uptime in response', async () => {
    const response = await GET();
    const data = await response.json();

    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should have correct content-type header', async () => {
    const response = await GET();

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
