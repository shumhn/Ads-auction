import { Keypair, PublicKey } from '@solana/web3.js'
import type { BidSession } from './claimspot-program'

const DB_NAME = 'atrium-bid-sessions'
const STORE_NAME = 'sessions'

type EncryptedSession = {
  version: 1
  authority: string
  token: string
  signer: string
  expiresAt: number
  createSignature: string
  iv: Uint8Array
  ciphertext: ArrayBuffer
  key: CryptoKey
}

function storageKey(authority: PublicKey, program: PublicKey, endpoint: string) {
  return `${program.toBase58()}:${endpoint}:${authority.toBase58()}`
}

function sessionContext(session: Pick<EncryptedSession, 'authority' | 'token' | 'signer' | 'expiresAt'>) {
  return new TextEncoder().encode(JSON.stringify([session.authority, session.token, session.signer, session.expiresAt]))
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readRecord(key: string): Promise<EncryptedSession | undefined> {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve(request.result as EncryptedSession | undefined)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function writeRecord(key: string, value: EncryptedSession | null): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      if (value) store.put(value, key)
      else store.delete(key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function saveBidSession(session: BidSession, program: PublicKey, endpoint: string): Promise<void> {
  // A non-extractable key is structured-cloned into IndexedDB. Never put the
  // signing key in localStorage or persist its unencrypted bytes.
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const metadata = {
    authority: session.authority.toBase58(),
    token: session.token.toBase58(),
    signer: session.signer.publicKey.toBase58(),
    expiresAt: session.expiresAt,
  }
  const secret = new Uint8Array(session.signer.secretKey)
  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: sessionContext(metadata) },
      key,
      secret,
    )
    await writeRecord(storageKey(session.authority, program, endpoint), {
      version: 1,
      ...metadata,
      createSignature: session.createSignature,
      iv,
      ciphertext,
      key,
    })
  } finally {
    secret.fill(0)
  }
}

export async function loadBidSession(authority: PublicKey, program: PublicKey, endpoint: string) {
  const key = storageKey(authority, program, endpoint)
  const record = await readRecord(key)
  if (!record) return null
  try {
    if (
      record.version !== 1 ||
      record.authority !== authority.toBase58() ||
      !Number.isSafeInteger(record.expiresAt) ||
      record.expiresAt <= Math.floor(Date.now() / 1000) + 15
    ) {
      await writeRecord(key, null)
      return null
    }
    const plaintext = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: Uint8Array.from(record.iv), additionalData: sessionContext(record) },
        record.key,
        record.ciphertext,
      ),
    )
    try {
      // web3.js retains the supplied Uint8Array by reference. Give the
      // Keypair its own copy before wiping the decrypted working buffer;
      // otherwise every restored session produces an invalid signature.
      const signer = Keypair.fromSecretKey(Uint8Array.from(plaintext))
      if (signer.publicKey.toBase58() !== record.signer) throw new Error('Session signer mismatch')
      return {
        signer,
        token: new PublicKey(record.token),
        authority,
        expiresAt: record.expiresAt,
        createSignature: record.createSignature,
      } satisfies BidSession
    } finally {
      plaintext.fill(0)
    }
  } catch {
    await writeRecord(key, null)
    return null
  }
}

export async function clearBidSession(authority: PublicKey, program: PublicKey, endpoint: string): Promise<void> {
  await writeRecord(storageKey(authority, program, endpoint), null)
}
