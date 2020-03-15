import { createTextReader } from '../../src/internal/TextReader';

describe('TextReader', () => {
  const text = '0123456789abcdef';

  describe('initial state', () => {
    const reader = createTextReader(text);
    it('should be empty initially', () => {
      expect(reader.eof()).toBeFalsy();
      expect(reader.readBy(0)).toBe('');
    });
  });

  describe('skip and readBy', () => {
    it('should skip correct distance', () => {
      const reader = createTextReader(text);
      expect(reader.readBy(3)).toBe(text.slice(0, 3));
      expect(reader.readBy(6)).toBe(text.slice(3, 6));
      reader.skip(3);
      expect(reader.readBy(12)).toBe(text.slice(9, 12));
      expect(reader.readBy(text.length)).toBe(text.slice(12));
    });

    it('should not rewind', () => {
      const reader = createTextReader(text);
      reader.skip(3);
      reader.skip(-3);
      expect(reader.readBy(6)).toBe(text.slice(3, 6));
    });

    it('should reach to end', () => {
      let reader = createTextReader(text);
      reader.skip(text.length - 1);
      expect(reader.readBy(text.length)).toBe(text[text.length - 1]);

      reader = createTextReader(text);
      expect(reader.readBy(text.length - 1)).toBe(text.slice(0, text.length - 1));
      expect(reader.readBy(text.length)).toBe(text[text.length - 1]);

      expect(reader.readBy(text.length + 1)).toBe('');
    });
  });

  describe('skipTo', () => {
    it('should skip', () => {
      const reader = createTextReader(text);
      reader.skipTo(3);
      expect(reader.readBy(6)).toBe(text.slice(3, 6));
    });

    it('should not rewind', () => {
      const reader = createTextReader(text);
      reader.skipTo(3);
      reader.skipTo(-3);
      expect(reader.readBy(6)).toBe(text.slice(3, 6));
    });

    it('should not go beyond end', () => {
      const reader = createTextReader(text);
      reader.skipTo(text.length + 10);
      expect(reader.eof()).toBeTruthy();
      expect(reader.readBy(text.length)).toBe('');
    });
  });

  describe('eol state', () => {
    it('should indicate eof', () => {
      const reader = createTextReader(text);
      reader.skip(text.length - 1);
      expect(reader.eof()).toBeFalsy();
      reader.skip(1);
      expect(reader.eof()).toBeTruthy();
    });
  });
});
