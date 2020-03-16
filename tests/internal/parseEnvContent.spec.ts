import { EnvContentParserOptions, parseEnvContent } from '../../src/internal/parseEnvContent';

describe('parseEnvContent', () => {
  const optExternalOnly: EnvContentParserOptions = {
    cwd: '/tmp/example',
    exportedOnly: true,
    predefined: { HOST: 'x.predefined.example.com', PWD: '/tmp/predefined' },
  };

  it('', () => {
    const code = `export PORT=80`;
    const actual = parseEnvContent(code, optExternalOnly);
    expect(actual).toEqual({PORT: '80'});
  });

  it('', () => {
    const code = `
    PORT=80
    export URL=smile://$HOST:$PORT/
    `;
    const expected = {URL: `smile://${optExternalOnly.predefined!.HOST}:80/`};
    const actual = parseEnvContent(code, optExternalOnly);
    expect(actual).toEqual(expected);
  });
});
