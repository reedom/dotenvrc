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
    const actual = expandValue('var=abc', 4, [], context);
    expect(actual).toBe('var=abc');
  });

  it('should replace $PWD with `context.cwd` value', () => {
    const expansion: AST_ParameterExpansion = {
      type: 'ParameterExpansion',
      parameter: 'PWD',
      loc: { start: 6, end: 9 },
    };
    const actual = expandValue('var=.,$PWD/xyz', 4, [expansion], context);
    expect(actual).toBe('var=.,/tmp/example/xyz');
  });

  it('should use `context.predefined` over other variables', () => {
    const expansion: AST_ParameterExpansion = {
      type: 'ParameterExpansion',
      parameter: 'HOST',
      loc: { start: 12, end: 16 },
    };
    const actual = expandValue('var=smile://$HOST/xyz', 4, [expansion], context);
    expect(actual).toBe('var=smile://x.predefined.example.com/xyz');
  });

  it('should use `context.exported` over `context.internal`', () => {
    const expansions: AST_ParameterExpansion[] = [
      {
        type: 'ParameterExpansion',
        parameter: 'HOST',
        loc: { start: 12, end: 16 },
      },
      {
        type: 'ParameterExpansion',
        parameter: 'PORT',
        loc: { start: 18, end: 22 },
      },
    ];
    const actual = expandValue('var=smile://$HOST:$PORT/', 4, expansions, context);
    expect(actual).toBe('var=smile://x.predefined.example.com:8080/');
  });

  it('should convert special expressions with backslashes`', () => {
    let actual = expandValue('var=|\\n\\r\\t\\v|', 4, [], context);
    expect(actual).toBe('var=|\n\r\t\v|');

    actual = expandValue('var=|\\a|', 4, [], context);
    expect(actual).toBe('var=|\x07|');

    actual = expandValue('var=|ab\\bc|', 4, [], context);
    expect(actual).toBe('var=|ac|');
  });

  it('should be safe to have `\\b`(backspace) in the head of text', () => {
    const actual = expandValue('var=\\bc|', 4, [], context);
    expect(actual).toBe('var=c|');
  });

  it('should leave characters with a backslash', () => {
    const actual = expandValue('var=|\\\\,\\$PWD|', 4, [], context);
    expect(actual).toBe('var=|\\,$PWD|');
  });

  it('should understand \\xXX expression', () => {
    let actual = expandValue('var=|\\x411\\x622|', 4, [], context);
    expect(actual).toBe('var=|A1b2|');
    actual = expandValue('var=|\\x9g\\xg\\x', 4, [], context);
    expect(actual).toBe('var=|\x09g\x00g\x00');
  });

  it('should understand \\uXXXX expression', () => {
    let actual = expandValue('var=|\\u2620|', 4,[], context);
    expect(actual).toBe('var=|☠|');

    actual = expandValue('var=|\\u26201|', 4, [], context);
    expect(actual).toBe('var=|☠1|');

    actual = expandValue('var=|\\u|', 4, [], context);
    expect(actual).toBe('var=|\x00|');

    actual = expandValue('var=|\\u0|', 4, [], context);
    expect(actual).toBe('var=|\x00|');
  });

  it('should understand \\UXXXXXXXX expression', () => {
    let actual = expandValue('var=|\\U0001f602|', 4, [], context);
    expect(actual).toBe('var=|😂|');

    actual = expandValue('var=|\\U0001f6021|', 4, [], context);
    expect(actual).toBe('var=|😂1|');
  });
});
