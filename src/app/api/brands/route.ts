import { createPublicKey, randomUUID, verify } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PublicKey } from '@solana/web3.js'
import { NextResponse } from 'next/server'
import { brandProfileMessage, BrandProfile } from '@/lib/brand-profile'
import { DATA_DIRECTORY, readJson } from '@/lib/server-store'

const MAX_AGE_MS = 5 * 60_000
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function validWallet(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return new PublicKey(value).toBase58() === value
  } catch {
    return false
  }
}

async function loadProfile(wallet: string): Promise<BrandProfile | null> {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIRECTORY, 'brands', `${wallet}.json`), 'utf8')) as BrandProfile
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('wallets') ?? ''
  const wallets = [...new Set(raw.split(',').filter(Boolean))]
  if (wallets.length > 30 || wallets.some((wallet) => !validWallet(wallet))) {
    return NextResponse.json({ error: 'Expected up to 30 valid wallet addresses' }, { status: 400 })
  }
  try {
    const rows = await Promise.all(wallets.map(async (wallet) => [wallet, await loadProfile(wallet)] as const))
    return NextResponse.json(
      { profiles: Object.fromEntries(rows.filter((row) => row[1])) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ error: 'Brand profiles could not be loaded' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Invalid brand profile body' }, { status: 400 })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { wallet, logoHash, timestamp, signature } = body
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (
    !validWallet(wallet) ||
    !name ||
    name.length > 60 ||
    /[\x00-\x1f\x7f]/.test(name) ||
    typeof logoHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(logoHash) ||
    typeof timestamp !== 'number' ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(Date.now() - timestamp) > MAX_AGE_MS ||
    typeof signature !== 'string' ||
    !/^[A-Za-z0-9+/]{86}==$/.test(signature)
  ) {
    return NextResponse.json({ error: 'Invalid brand profile or expired signature' }, { status: 400 })
  }
  try {
    const uploads = await readJson<Record<string, { mediaType: string }>>('uploads.json', {})
    if (!uploads[logoHash] || !['image/png', 'image/jpeg', 'image/webp'].includes(uploads[logoHash].mediaType)) {
      return NextResponse.json({ error: 'Upload a PNG, JPEG or WebP logo first' }, { status: 400 })
    }
    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(new PublicKey(wallet).toBytes())]),
      format: 'der',
      type: 'spki',
    })
    const message = brandProfileMessage(wallet, name, logoHash, timestamp)
    if (!verify(null, Buffer.from(message), publicKey, Buffer.from(signature, 'base64'))) {
      return NextResponse.json({ error: 'Wallet signature did not match this brand profile' }, { status: 401 })
    }
    const previous = await loadProfile(wallet)
    if (previous && timestamp <= previous.updatedAt) {
      return NextResponse.json(
        { error: 'This brand profile signature is older than the current profile' },
        { status: 409 },
      )
    }
    const profile: BrandProfile = { wallet, name, logoHash, updatedAt: timestamp }
    const directory = path.join(DATA_DIRECTORY, 'brands')
    await mkdir(directory, { recursive: true })
    const destination = path.join(directory, `${wallet}.json`)
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, JSON.stringify(profile), 'utf8')
    await rename(temporary, destination)
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ error: 'Brand profile could not be saved' }, { status: 500 })
  }
}
