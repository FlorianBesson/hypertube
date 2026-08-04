export type BencodeValue = number | string | Buffer | BencodeValue[] | BencodeDictionary;

export interface BencodeDictionary {
  [key: string]: BencodeValue;
}

const TOKEN = {
  integer: 'i'.charCodeAt(0),
  list: 'l'.charCodeAt(0),
  dictionary: 'd'.charCodeAt(0),
  end: 'e'.charCodeAt(0),
  colon: ':'.charCodeAt(0),
};

class BencodeReader {
  public offset = 0;

  constructor(private readonly buffer: Buffer) {}

  public readValue(rawValuesByKey?: Map<string, Buffer>): BencodeValue {
    const token = this.buffer[this.offset];

    if (token === TOKEN.integer) {
      return this.readInteger();
    }
    if (token === TOKEN.list) {
      return this.readList();
    }
    if (token === TOKEN.dictionary) {
      return this.readDictionary(rawValuesByKey);
    }
    return this.readByteString();
  }

  private readInteger(): number {
    const end = this.buffer.indexOf(TOKEN.end, this.offset);
    if (end === -1) {
      throw new Error('Malformed bencode: unterminated integer');
    }
    const value = Number(this.buffer.toString('ascii', this.offset + 1, end));
    if (!Number.isFinite(value)) {
      throw new Error('Malformed bencode: invalid integer');
    }
    this.offset = end + 1;
    return value;
  }

  private readByteString(): Buffer {
    const separator = this.buffer.indexOf(TOKEN.colon, this.offset);
    if (separator === -1) {
      throw new Error('Malformed bencode: unterminated byte string length');
    }
    const length = Number(this.buffer.toString('ascii', this.offset, separator));
    if (!Number.isInteger(length) || length < 0) {
      throw new Error('Malformed bencode: invalid byte string length');
    }
    const start = separator + 1;
    const end = start + length;
    if (end > this.buffer.length) {
      throw new Error('Malformed bencode: byte string exceeds buffer');
    }
    this.offset = end;
    return this.buffer.subarray(start, end);
  }

  private readList(): BencodeValue[] {
    this.offset += 1;
    const values: BencodeValue[] = [];
    while (this.buffer[this.offset] !== TOKEN.end) {
      if (this.offset >= this.buffer.length) {
        throw new Error('Malformed bencode: unterminated list');
      }
      values.push(this.readValue());
    }
    this.offset += 1;
    return values;
  }

  private readDictionary(rawValuesByKey?: Map<string, Buffer>): BencodeDictionary {
    this.offset += 1;
    const dictionary: BencodeDictionary = {};
    while (this.buffer[this.offset] !== TOKEN.end) {
      if (this.offset >= this.buffer.length) {
        throw new Error('Malformed bencode: unterminated dictionary');
      }
      const key = this.readByteString().toString('utf8');
      const valueStart = this.offset;
      dictionary[key] = this.readValue();
      if (rawValuesByKey) {
        rawValuesByKey.set(key, this.buffer.subarray(valueStart, this.offset));
      }
    }
    this.offset += 1;
    return dictionary;
  }
}

export function decode(buffer: Buffer): BencodeValue {
  return new BencodeReader(buffer).readValue();
}

/**
 * Decodes a value and reports how many bytes it consumed, for payloads that append
 * raw data right after a bencoded header (BEP 9 metadata pieces).
 */
export function decodeWithLength(buffer: Buffer): { value: BencodeValue; length: number } {
  const reader = new BencodeReader(buffer);
  const value = reader.readValue();
  return { value, length: reader.offset };
}

/**
 * Decodes a dictionary while keeping each top-level value's original bytes, so the
 * `info` dictionary can be hashed exactly as it was encoded rather than re-serialized.
 */
export function decodeDictionaryWithRawValues(buffer: Buffer): {
  dictionary: BencodeDictionary;
  rawValuesByKey: Map<string, Buffer>;
} {
  const rawValuesByKey = new Map<string, Buffer>();
  const reader = new BencodeReader(buffer);
  const dictionary = reader.readValue(rawValuesByKey);
  if (typeof dictionary !== 'object' || dictionary === null || Array.isArray(dictionary) || Buffer.isBuffer(dictionary)) {
    throw new Error('Malformed bencode: expected a top-level dictionary');
  }
  return { dictionary, rawValuesByKey };
}

export function encode(value: BencodeValue): Buffer {
  if (typeof value === 'number') {
    return Buffer.from(`i${Math.trunc(value)}e`);
  }
  if (typeof value === 'string') {
    return encode(Buffer.from(value, 'utf8'));
  }
  if (Buffer.isBuffer(value)) {
    return Buffer.concat([Buffer.from(`${value.length}:`), value]);
  }
  if (Array.isArray(value)) {
    return Buffer.concat([Buffer.from('l'), ...value.map(encode), Buffer.from('e')]);
  }

  const parts = Object.keys(value)
    .sort()
    .map((key) => Buffer.concat([encode(key), encode(value[key])]));
  return Buffer.concat([Buffer.from('d'), ...parts, Buffer.from('e')]);
}

export function expectDictionary(value: BencodeValue | undefined, field: string): BencodeDictionary {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Buffer.isBuffer(value)) {
    throw new Error(`Malformed torrent data: "${field}" is not a dictionary`);
  }
  return value;
}

export function expectBuffer(value: BencodeValue | undefined, field: string): Buffer {
  if (!Buffer.isBuffer(value)) {
    throw new Error(`Malformed torrent data: "${field}" is not a byte string`);
  }
  return value;
}

export function expectInteger(value: BencodeValue | undefined, field: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Malformed torrent data: "${field}" is not an integer`);
  }
  return value;
}
