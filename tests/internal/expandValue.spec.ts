import { createContext, expandValue } from '../../src/internal/expandValue';
import { AST_ParameterExpansion } from 'bash-parser';

describe('expandValue', () => {
  const context = createContext({
    cwd: '/tmp/example',
    predefined: { HOST: 'x.predefined.example.com', PWD: '/tmp/predefined' },
    exported: { HOST: 'x.exported.example.com', PORT: '8080' },
    internal: { HOST: 'x.internal.example.com', PORT: '9000' },
  });

  it('should extract a simple export line', () => {
    const actual = expandValue('abc', [], context);
    expect(actual).toBe('abc');
  });

  it('should not affect backslashes processing by quoting', () => {
    let actual = expandValue('"abc\\ndef"', [], context);
    expect(actual).toBe('abc\ndef');

    actual = expandValue("'abc\\ndef'", [], context);
    expect(actual).toBe('abc\ndef');
  });

  it('should replace $PWD with `context.cwd` value', () => {
    const expansion: AST_ParameterExpansion = {
      type: 'ParameterExpansion',
      parameter: 'PWD',
      loc: { start: 2, end: 5 },
    };
    const actual = expandValue('.,$PWD/xyz', [expansion], context);
    expect(actual).toBe('.,/tmp/example/xyz');
  });

  it('should use `context.predefined` over other variables', () => {
    const expansion: AST_ParameterExpansion = {
      type: 'ParameterExpansion',
      parameter: 'HOST',
      loc: { start: 8, end: 12 },
    };
    const actual = expandValue('smile://$HOST/xyz', [expansion], context);
    expect(actual).toBe('smile://x.predefined.example.com/xyz');
  });

  it('should use `context.exported` over `context.internal`', () => {
    const expansions: AST_ParameterExpansion[] = [
      {
        type: 'ParameterExpansion',
        parameter: 'HOST',
        loc: { start: 8, end: 12 },
      },
      {
        type: 'ParameterExpansion',
        parameter: 'PORT',
        loc: { start: 14, end: 18 },
      },
    ];
    const actual = expandValue('smile://$HOST:$PORT/', expansions, context);
    expect(actual).toBe('smile://x.predefined.example.com:8080/');
  });

  it('should convert special expressions with backslashes`', () => {
    let actual = expandValue('|\\n\\r\\t\\v|', [], context);
    expect(actual).toBe('|\n\r\t\v|');

    actual = expandValue('|\\a|', [], context);
    expect(actual).toBe('|\x07|');

    actual = expandValue('|ab\\bc|', [], context);
    expect(actual).toBe('|ac|');
  });

  it('should be safe to have `\\b`(backspace) in the head of text', () => {
    const actual = expandValue('\\bc|', [], context);
    expect(actual).toBe('c|');
  });

  it('should leave characters with a backslash', () => {
    const actual = expandValue('|\\\\,\\$PWD|', [], context);
    expect(actual).toBe('|\\,$PWD|');
  });

  it('should understand \\xXX expression', () => {
    let actual = expandValue('|\\x411\\x622|', [], context);
    expect(actual).toBe('|A1b2|');
    actual = expandValue('|\\x9g\\xg\\x', [], context);
    expect(actual).toBe('|\x09g\x00g\x00');
  });

  it('should understand \\uXXXX expression', () => {
    let actual = expandValue('|\\u2620|', [], context);
    expect(actual).toBe('|☠|');

    actual = expandValue('|\\u26201|', [], context);
    expect(actual).toBe('|☠1|');

    actual = expandValue('|\\u|', [], context);
    expect(actual).toBe('|\x00|');

    actual = expandValue('|\\u0|', [], context);
    expect(actual).toBe('|\x00|');
  });

  it('should understand \\UXXXXXXXX expression', () => {
    let actual = expandValue('|\\U0001f602|', [], context);
    expect(actual).toBe('|😂|');

    actual = expandValue('|\\U0001f6021|', [], context);
    expect(actual).toBe('|😂1|');
  });
});
