import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { DATA_DIRECTORY, readJson, writeJson } from '@/lib/server-store'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

type UploadRecord = {
  hash: string
  mediaType: string
  originalName: string
  size: number
  storedAt: string
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPEG and WebP images are accepted' }, { status: 415 })
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 5 MB' }, { status: 413 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const hash = createHash('sha256').update(bytes).digest('hex')
    const uploadDirectory = path.join(DATA_DIRECTORY, 'uploads')
    await mkdir(uploadDirectory, { recursive: true })
    try {
      await writeFile(path.join(uploadDirectory, hash), bytes, { flag: 'wx' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }

    const uploads = await readJson<Record<string, UploadRecord>>('uploads.json', {})
    uploads[hash] = {
      hash,
      mediaType: file.type,
      originalName: file.name.slice(0, 160),
      size: file.size,
      storedAt: new Date().toISOString(),
    }
    await writeJson('uploads.json', uploads)

    return NextResponse.json({ hash, url: `/api/uploads/${hash}`, mediaType: file.type, size: file.size })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 })
  }
}
