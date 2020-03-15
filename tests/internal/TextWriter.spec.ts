import TextWriter from '../../src/internal/TextWriter';

describe('TextWriter', () => {
  it('should be empty initially', () => {
    const writer = new TextWriter();
    expect(writer.getString()).toBe('');
  });

  describe('write', () => {
    it('should concat strings internally', () => {
      const writer = new TextWriter();
      writer.write('a');
      writer.write('b');
      writer.write('\0');
      writer.write('c');
      expect(writer.getString()).toBe('ab\0c');
    });
  });

  describe('chop', () => {
    it('should drop a char', () => {
      const writer = new TextWriter();
      writer.write('ab');
      writer.chop();
      writer.write('c');
      expect(writer.getString()).toBe('ac');
    });
  });

  describe('reset', () => {
    it('should forget previous state', () => {
      const writer = new TextWriter();
      writer.write('abc');
      writer.reset();
      writer.write('x');
      expect(writer.getString()).toBe('x');
    });
  });

  describe('buffer expansion', () => {
    it('should handle expanding its internal buffer', () => {
      const writer = new TextWriter();
      let expected = Buffer.alloc(Buffer.poolSize - 2, 'a').toString();
      writer.write(expected);
      expected += 'abc';
      writer.write('abc');
      expect(writer.getString()).toBe(expected);
    });
  });
});
