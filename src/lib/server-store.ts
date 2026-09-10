import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const DATA_DIRECTORY = path.join(process.cwd(), '.data')

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIRECTORY, name), 'utf8')) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw error
  }
}

export async function writeJson<T>(name: string, value: T) {
  await mkdir(DATA_DIRECTORY, { recursive: true })
  const destination = path.join(DATA_DIRECTORY, name)
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, destination)
}
