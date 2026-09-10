const U64_MAX = (1n << 64n) - 1n

export function encodeU64Le(value: bigint) {
  if (value < 0n || value > U64_MAX) {
    throw new RangeError('u64 value is outside the supported range')
  }

  const bytes = new Uint8Array(8)
  let remaining = value
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
  return bytes
}

export function encodeU16Le(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError('u16 value is outside the supported range')
  }

  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff)
}
