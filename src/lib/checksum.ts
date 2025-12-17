import type { ChecksumAlgo } from './types';

// CRC32 lookup table
const crc32Table: number[] = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crc32Table[i] = c;
}

export function crc32(str: string): string {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc = crc32Table[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function computeChecksum(
  data: string,
  algo: ChecksumAlgo
): Promise<string> {
  if (algo === 'crc32') {
    return crc32(data);
  }
  return sha256(data);
}

