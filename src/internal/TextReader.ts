/**
 * A text reader.
 *
 * It internally holds a text pointer `pos`. It seeks for forward direction only.
 */
export interface TextReader {
  /** Return true if `pos` has reached to the end of the text. */
  eof: () => boolean;
  /** Skip(forward) `pos` by number of `delta` characters. */
  skip: (delta: number) => void;
  /** Skip(forward) `pos` to `newPos`. */
  skipTo: (newPos: number) => void;
  /** Read the text partially from `pos` to `end`(`end` not included) */
  readBy: (end: number) => string;
}

export function createTextReader(text: string): TextReader {
  let pos = 0;

  return {
    eof: () => pos === text.length,
    skip: (delta: number): void => {
      pos += Math.max(0, Math.min(delta, text.length - pos));
    },
    skipTo: (newPos: number): void => {
      pos = Math.max(pos, Math.min(newPos, text.length));
    },
    readBy: (end: number): string => {
      if (end <= pos) return '';
      const endPos = Math.min(end, text.length);
      const str = text.slice(pos, endPos);
      pos = endPos;
      return str;
    },
  };
}

/**
 * A text scanner.
 *
 * It internally holds a text pointer `pos`. It seeks for forward direction only.
 */
export interface TextScanner {
  /** Return true if `pos` has reached to the end of the text. */
  eof: () => boolean;
  /** Return `pos`. */
  pos: () => number;
  /** advance `pos` number of `delta` or one character(s). */
  advance: (delta?: number) => void;
  /** advance `pos` to `newPos`. */
  advanceTo: (newPos: number) => void;
  /** Read a character at `pos` in `text` */
  getChar: () => string;
}

export function createTextScanner(text: string): TextScanner {
  let pos = 0;

  return {
    eof: () => pos === text.length,
    pos: () => pos,
    advance: (delta?: number): void => {
      pos += Math.max(0, Math.min(delta || 1, text.length - pos));
    },
    advanceTo: (newPos: number): void => {
      pos = Math.max(pos, Math.min(newPos, text.length));
    },
    getChar: (): string => text[pos],
  };
}
