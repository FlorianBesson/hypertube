const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const INFO_HASH_BYTES = 20;

export interface MagnetLink {
  infoHash: Buffer;
  trackers: string[];
}

function decodeBase32(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of input.toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error('Invalid magnet link: malformed base32 info hash');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(bytes);
}

function parseInfoHash(exactTopic: string): Buffer {
  const encodedHash = exactTopic.replace(/^urn:btih:/i, '');

  if (/^[a-fA-F0-9]{40}$/.test(encodedHash)) {
    return Buffer.from(encodedHash.toLowerCase(), 'hex');
  }
  if (/^[a-zA-Z2-7]{32}$/.test(encodedHash)) {
    return decodeBase32(encodedHash);
  }
  throw new Error('Invalid magnet link: unsupported info hash encoding');
}

export function parseMagnetUri(uri: string): MagnetLink {
  const parameters = new URLSearchParams(uri.slice(uri.indexOf('?') + 1));

  const exactTopic = parameters.getAll('xt').find((topic) => topic.toLowerCase().startsWith('urn:btih:'));
  if (!exactTopic) {
    throw new Error('Invalid magnet link: missing "xt=urn:btih:" parameter');
  }

  const infoHash = parseInfoHash(exactTopic);
  if (infoHash.length !== INFO_HASH_BYTES) {
    throw new Error('Invalid magnet link: info hash is not 20 bytes');
  }

  return { infoHash, trackers: parameters.getAll('tr') };
}
