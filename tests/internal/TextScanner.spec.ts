import { createTextScanner } from '../../src/internal/TextReader';

describe('TextScanner', () => {
  const text = '0123456789abcdef';

  describe('initial state', () => {
    const scanner = createTextScanner(text);
    it('should be empty initially', () => {
      expect(scanner.eof()).toBeFalsy();
      expect(scanner.pos()).toBe(0);
      expect(scanner.getChar()).toBe(text[0]);
    });
  });

  describe('advance, pos, getChar, eof', () => {
    it('should advance in correct distance', () => {
      const scanner = createTextScanner(text);
      scanner.advance();
      expect(scanner.pos()).toBe(1);
      expect(scanner.getChar()).toBe(text[1]);
      scanner.advance(3);
      expect(scanner.pos()).toBe(4);

      scanner.advance(text.length - scanner.pos() - 1);
      expect(scanner.pos()).toBe(text.length - 1);
      expect(scanner.eof()).toBeFalsy();

      scanner.advance();
      expect(scanner.pos()).toBe(text.length);
      expect(scanner.eof()).toBeTruthy();
      // Do not go further.
      scanner.advance();
      expect(scanner.pos()).toBe(text.length);
      expect(scanner.eof()).toBeTruthy();
    });

    it('should not rewind', () => {
      const scanner = createTextScanner(text);
      scanner.advance(3);
      scanner.advance(-3);
      expect(scanner.pos()).toBe(3);
    });
  });

  describe('advanceTo', () => {
    it('should skip', () => {
      const scanner = createTextScanner(text);
      scanner.advanceTo(3);
      expect(scanner.pos()).toBe(3);
    });

    it('should not rewind', () => {
      const scanner = createTextScanner(text);
      scanner.advanceTo(3);
      scanner.advanceTo(-3);
      expect(scanner.pos()).toBe(3);
    });

    it('should not go beyond end', () => {
      const scanner = createTextScanner(text);
      scanner.advanceTo(text.length + 10);
      expect(scanner.eof()).toBeTruthy();
      expect(scanner.pos()).toBe(text.length);
    });
  });
});
