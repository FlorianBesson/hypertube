export class Bitfield {
  private bytes: Buffer;

  constructor(bitCount: number = 0) {
    this.bytes = Buffer.alloc(Math.ceil(bitCount / 8));
  }

  public static fromBuffer(bytes: Buffer): Bitfield {
    const bitfield = new Bitfield();
    bitfield.bytes = Buffer.from(bytes);
    return bitfield;
  }

  public get(index: number): boolean {
    const byteIndex = index >> 3;
    if (byteIndex >= this.bytes.length) {
      return false;
    }
    return (this.bytes[byteIndex] & (0x80 >> (index & 7))) !== 0;
  }

  public set(index: number): void {
    const byteIndex = index >> 3;
    if (byteIndex >= this.bytes.length) {
      const grown = Buffer.alloc(byteIndex + 1);
      this.bytes.copy(grown);
      this.bytes = grown;
    }
    this.bytes[byteIndex] |= 0x80 >> (index & 7);
  }

  public countUpTo(bitCount: number): number {
    let total = 0;
    for (let index = 0; index < bitCount; index += 1) {
      if (this.get(index)) {
        total += 1;
      }
    }
    return total;
  }
}
