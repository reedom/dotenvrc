import ProcessEnv = NodeJS.ProcessEnv;
import { AST_ParameterExpansion } from 'bash-parser';
import {
  TextReader,
  createTextReader,
  TextScanner,
  createTextScanner,
} from '#/internal/TextReader';
import TextWriter from '#/internal/TextWriter';

export interface ExpandValueContext {
  cwd: string;
  predefined: ProcessEnv;
  exported: ProcessEnv;
  internal: ProcessEnv;
  temporal: ProcessEnv;
  writer: TextWriter;
}

export function createContext({
  cwd,
  predefined = {},
  exported = {},
  internal = {},
  temporal = {},
}: {
  cwd: string;
  predefined?: ProcessEnv;
  exported?: ProcessEnv;
  internal?: ProcessEnv;
  temporal?: ProcessEnv;
}): ExpandValueContext {
  return {
    cwd,
    predefined,
    exported,
    internal,
    temporal,
    writer: new TextWriter(),
  };
}

interface ExpandValueState {
  text: string;
  valueHeadPos: number;
  scanner: TextScanner;
  reader: TextReader;
  quote: QuoteType;
}

export function expandValue(
  text: string,
  valueHeadPos: number,
  paramExpansions: AST_ParameterExpansion[] | null,
  context: ExpandValueContext,
): string {
  const scanner = createTextScanner(text);
  const reader = createTextReader(text);
  const state: ExpandValueState = { text: text, valueHeadPos, scanner, reader, quote: false };
  context.writer.reset();

  const handleParam = createParamHandler(paramExpansions, state, context);
  const handleQuote = createQuoteHandler(state, context);
  const handleBackslash = createBackslashHandler(state, context);

  while (!scanner.eof()) {
    if (handleParam() || handleQuote() || handleBackslash()) continue;
    scanner.advance();
  }

  context.writer.write(reader.readBy(text.length));
  return context.writer.getString();
}

export function solveParamExpansion(param: string, context: ExpandValueContext): string {
  if (param === 'PWD') {
    return context.cwd;
  }
  if (Object.prototype.hasOwnProperty.call(context.predefined, param)) {
    return context.predefined[param]!;
  }
  if (Object.prototype.hasOwnProperty.call(context.exported, param)) {
    return context.exported[param]!;
  }
  if (Object.prototype.hasOwnProperty.call(context.internal, param)) {
    return context.internal[param]!;
  }
  if (Object.prototype.hasOwnProperty.call(context.temporal, param)) {
    return context.internal[param]!;
  }
  return '';
}

export function createParamHandler(
  paramExpansions: AST_ParameterExpansion[] | null,
  { reader, scanner }: ExpandValueState,
  context: ExpandValueContext,
): () => boolean {
  const iterExpansion = paramExpansionReader(paramExpansions || []);
  let paramExpansion = iterExpansion.next();
  let nextParamExpansionPos = paramExpansion.done ? -1 : paramExpansion.value.loc.start;

  const { writer } = context;

  return (): boolean => {
    if (scanner.pos() !== nextParamExpansionPos) return false;

    writer.write(reader.readBy(scanner.pos()));
    writer.write(solveParamExpansion(paramExpansion.value.parameter, context));
    scanner.advanceTo(paramExpansion.value.loc.end + 1);
    reader.skipTo(paramExpansion.value.loc.end + 1);

    paramExpansion = iterExpansion.next();
    nextParamExpansionPos = paramExpansion.done ? -1 : paramExpansion.value.loc.start;
    return true;
  };
}

export function createQuoteHandler(
  state: ExpandValueState,
  { writer }: ExpandValueContext,
): () => boolean {
  const { reader, scanner } = state;

  const quoteTypeOf = (char: string): QuoteType => {
    if (char === '"' || char === "'") return char;
    return false;
  };

  return (): boolean => {
    const ch = scanner.getChar();
    const current = quoteTypeOf(ch);

    if (state.quote) {
      // The current value is quoted. We're looking for a paired closing quote char.
      if (state.quote !== current) return false;
      // Now it's closing.
      state.quote = false;
    } else {
      // The current value is out of quote. If the current char is a quote, then it starts.
      if (!current) return false;
      // Now it's opening.
      state.quote = current;
    }

    // Sync reader and writer.
    writer.write(reader.readBy(scanner.pos()));
    // Skip the current quotation char.
    reader.skip(1);
    scanner.advance();
    return true;
  };
}

export function createBackslashHandler(
  { text, valueHeadPos, reader, scanner }: ExpandValueState,
  { writer }: ExpandValueContext,
): () => boolean {
  return (): boolean => {
    if (scanner.getChar() !== '\\') return false;
    scanner.advance();
    // If it's EOL, just leave it.
    if (scanner.eof()) return false;

    writer.write(reader.readBy(scanner.pos() - 1));

    const ch = scanner.getChar();
    scanner.advance();
    reader.skip(2);

    switch (ch) {
      case 'a': // bell
        writer.write(String.fromCodePoint(0x07));
        return true;
      case 'b': // backspace
        if (valueHeadPos < writer.length()){
          writer.chop();
        }
        return true;
      case 'n': // newline
        writer.write('\n');
        return true;
      case 'r': // carriage return
        writer.write('\r');
        return true;
      case 't': // tab
        writer.write('\t');
        return true;
      case 'v': // vertical tab
        writer.write('\v');
        return true;
      case 'x': {
        // hex code
        const { digits, val } = readHexDigits(text, scanner.pos(), 2);
        writer.write(String.fromCharCode(val));
        scanner.advance(digits);
        reader.skip(digits);
        return true;
      }
      case 'u':
      case 'U': {
        // unicode
        const { digits, val } = readHexDigits(text, scanner.pos(), ch === 'u' ? 4 : 8);
        if (digits === 0) {
          writer.write('\x00');
        } else {
          try {
            writer.write(String.fromCodePoint(val));
          } catch (err) {
            writer.write('■'); // tofu, the character I'm familiar with on this situation.
          }
        }
        scanner.advance(digits);
        reader.skip(digits);
        return true;
      }
      default:
        writer.write(ch);
        return true;
    }
  };
}

export function* paramExpansionReader(
  list: AST_ParameterExpansion[],
): Generator<AST_ParameterExpansion> {
  for (let i = 0; i < list.length; ++i) {
    yield list[i];
  }
}

const hexDigits: { [char: string]: true } = {
  '0': true,
  '1': true,
  '2': true,
  '3': true,
  '4': true,
  '5': true,
  '6': true,
  '7': true,
  '8': true,
  '9': true,
  a: true,
  b: true,
  c: true,
  d: true,
  e: true,
  f: true,
  A: true,
  B: true,
  C: true,
  D: true,
  E: true,
  F: true,
};

export function readHexDigits(
  text: string,
  i: number,
  maxDigits: number,
): { digits: number; val: number } {
  const beg = i;
  const limit = Math.min(i + maxDigits, text.length);
  while (i < limit && hexDigits[text[i]]) {
    ++i;
  }
  const digits = i - beg;
  const val = parseInt(text.slice(beg, i), 16);
  return { digits, val };
}
