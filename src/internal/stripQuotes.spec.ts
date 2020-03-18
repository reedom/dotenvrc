// describe('stripQuotes', () => {
//   it('should recognize double quotes', () => {
//     const reader = new TextReader('"abc"');
//     expect(reader.getQuoteType()).toBe('double');
//     reader.advance(10);
//     expect(reader.readByPos()).toBe('abc');
//   });
//
//   it('should recognize single quotes', () => {
//     const reader = new TextReader("'abc'");
//     expect(reader.getQuoteType()).toBe('single');
//     reader.advance(10);
//     expect(reader.readByPos()).toBe('abc');
//   });
//
//   it('does not care whether text is quoted precisely', () => {
//     // Since the line is syntactically broken at all.
//     const reader = new TextReader("'abc");
//     expect(reader.getQuoteType()).toBe('single');
//     reader.advance(10);
//     expect(reader.readByPos()).toBe('ab');
//   });
//
// });
