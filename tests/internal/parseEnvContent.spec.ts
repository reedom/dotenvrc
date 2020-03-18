import { EnvContentParserOptions, parseEnvContent } from '../../src/internal/parseEnvContent';

describe('parseEnvContent', () => {
  const optExportedOnly = (): EnvContentParserOptions => ({
    cwd: '/tmp/example',
    exportedOnly: true,
    predefined: { HOST: 'x.predefined.example.com', PWD: '/tmp/predefined' },
  });

  const optAll = (): EnvContentParserOptions => ({
    cwd: '/tmp/example',
    exportedOnly: false,
    predefined: { HOST: 'x.predefined.example.com', PWD: '/tmp/predefined' },
  });

  //
  // `export`'s basic

  it('should parse a simple export definition', () => {
    const code = `export PORT=80`;
    const actual = parseEnvContent(code, optExportedOnly());
    expect(actual).toEqual({PORT: '80'});
  });

  it('should resolve variable references', () => {
    const code = `
    PORT=80 PATH=/top
    export URL1=smile://$HOST:$PORT$PATH
    export URL2=smile://\${HOST}:\${PORT}$PATH
    # export URL3=smile://\${HOST}:\\
\${PORT}\\
\$PATH
    `;
    const expected = {
      URL1: 'smile://x.predefined.example.com:80/top',
      URL2: 'smile://x.predefined.example.com:80/top',
      // URL3: 'smile://x.predefined.example.com:80/top',
    };
    const actual = parseEnvContent(code, optExportedOnly());
    expect(actual).toEqual(expected);
  });

  it('should return internal variables, too if it is required', () => {
    const code = `
    NAME="Jack"
    GREETING="Hi, \${NAME}"
    export GREETING
    export GIVEN=$NAME
    `;
    const expected = {
      NAME: 'Jack',
      GIVEN: 'Jack',
      GREETING: 'Hi, Jack'
    };
    const actual = parseEnvContent(code, optAll());
    expect(actual).toEqual(expected);
  });

  it('should handle quoted text(1)', () => {
    // eslint-disable-next-line no-useless-escape
    const code = `
    export VAR1='foo " bar'
    export VAR2="foo ' bar"
    export VAR3="\\"foo bar\\""
    export VAR4=$VAR3
    export VAR5="\${VAR3}"
    export VAR6='$VAR3'
    export VAR7='$VAR3'"$VAR3"$VAR3
    `;
    const expected = {
      VAR1: 'foo " bar',
      VAR2: `foo ' bar`,
      VAR3: `"foo bar"`,
      VAR4: `"foo bar"`,
      VAR5: `"foo bar"`,
      VAR6: '$VAR3',
      VAR7: '$VAR3"foo bar""foo bar"',
    };
    const actual = parseEnvContent(code, optExportedOnly());
    expect(actual).toEqual(expected);
  });

  //
  // `export -n`

  it('should unset from exporting by "export -n"', () => {
    const code = `
    export PORT=80
    export NAME=jack
    export -n PORT
    `;
    const expected = {NAME: 'jack'};
    const actual = parseEnvContent(code, optExportedOnly());
    expect(actual).toEqual(expected);
  });

  it('should treat -n plus assignment "export -n VAR=val"', () => {
    const code = `
    export NAME=jack
    export -n NAME=john
    export GIVEN=$NAME
    `;
    const expected = {GIVEN: 'john'};
    const actual = parseEnvContent(code, optExportedOnly());
    expect(actual).toEqual(expected);
  });

  //
  // `export` in uncomfortable situation

  it('should do nothing if exporting variable does not exist', () => {
    const code = `
    export VAR1
    `;
    const expected = {};
    const actual = parseEnvContent(code, optExportedOnly());
    expect(actual).toEqual(expected);
  });

  it('should resolve temporary variables after exporting', () => {
    // This is pretty counterintuitive.
    const code = `
    name=jack
    name=ann export name GREETING1="Hello, \${name}"
    export GREETING2="Hi, $name"
    `;
    const expected = {
      GREETING1: 'Hello, jack',
      GREETING2: 'Hi, ann',
      name: 'ann'
    };
    const actual = parseEnvContent(code, optExportedOnly());
    expect(actual).toEqual(expected);
  });
});
