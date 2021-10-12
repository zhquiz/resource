// @ts-check

import fs from 'fs'
import path from 'path'

export function absPath(...fileparts: string[]) {
  return path.resolve(ROOTDIR, ...fileparts)
}

export function ensureDir(dirname: string) {
  dirname = absPath(dirname)

  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true })
    return dirname
  }
  return null
}

export function ensureDirForFilename(filename: string) {
  return ensureDir(path.dirname(filename))
}

export const ROOTDIR = path.join(__dirname, '..')

export async function runMain<T = any>(main: () => Promise<T>) {
  return main().catch((e) => {
    if (typeof e !== 'string') {
      console.error(e)
    }
    throw e
  })
}
