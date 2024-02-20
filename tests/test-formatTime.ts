import { formatTime } from '../src/ui/formatTime';

describe('formatTime', () => {
  test('should work', () => {
    expect(formatTime(1356)).toBe('00:01');
    expect(formatTime(5356 + 60_000)).toBe('01:05');
    expect(formatTime(5356 + 60_000 + 60 * 60 * 1000)).toBe('01:01:05');
    expect(formatTime(19001 + 4 * 60 * 1000 + 23 * 60 * 60 * 1000)).toBe('23:04:19');
    expect(formatTime(19001 + 23 * 60 * 60 * 1000)).toBe('23:00:19');
    expect(formatTime(19001 + 24 * 60 * 60 * 1000)).toBe('24:00:19');
    expect(formatTime(19001 + 124 * 60 * 60 * 1000)).toBe('124:00:19');
  });
});
