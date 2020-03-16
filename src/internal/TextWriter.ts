export default class TextWriter {
  private buffer: Buffer = Buffer.alloc(Buffer.poolSize);
  private wrote: number = 0;

  write(str: string): void {
    if (this.buffer.length < this.wrote + str.length) {
      this.expandBuffer(this.wrote + str.length);
    }
    this.wrote += this.buffer.write(str, this.wrote);
  }

  length(): number {
    return this.wrote;
  }

  chop() {
    if (0 < this.wrote) this.wrote--;
  }

  getString(): string {
    return this.buffer.toString('utf8', 0, this.wrote);
  }

  reset() {
    this.wrote = 0;
  }

  private expandBuffer(atLeast: number) {
    const newBuffer = Buffer.alloc(Math.max(this.buffer.length * 1.5, atLeast));
    this.buffer.copy(newBuffer);
    this.buffer = newBuffer;
  }
}
