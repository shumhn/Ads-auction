import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { DATA_DIRECTORY, readJson } from '@/lib/server-store'

type UploadRecord = { mediaType: string; originalName: string; size: number }

export async function GET(_: Request, context: { params: Promise<{ hash: string }> }) {
  const { hash } = await context.params
  if (!/^[a-f0-9]{64}$/.test(hash)) return NextResponse.json({ error: 'Invalid content hash' }, { status: 400 })
  try {
    const uploads = await readJson<Record<string, UploadRecord>>('uploads.json', {})
    const record = uploads[hash]
    if (!record) return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    const bytes = await readFile(path.join(DATA_DIRECTORY, 'uploads', hash))
    return new Response(bytes, {
      headers: {
        'Content-Type': record.mediaType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Unable to read upload' }, { status: 500 })
  }
}
