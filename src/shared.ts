// @ts-check

import fs from 'fs'
import path from 'path'

import S from 'jsonschema-definer'

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

export const sType = S.string().enum('character', 'vocabulary', 'sentence')

export const sEntry = S.shape({
  type: sType,
  entry: S.list(S.string()).minItems(1).uniqueItems(),
  reading: S.list(S.string()).minItems(1).uniqueItems(),
  english: S.list(S.string()).uniqueItems(),
  tag: S.list(S.string()).uniqueItems(),
  frequency: S.number().optional(),
  level: S.number().optional(),
  hLevel: S.integer().minimum(1)
})

export const sHan = S.string().custom((s) => /^\p{sc=Han}$/u.test(s))

export const sRadical = S.shape({
  entry: sHan,
  sub: S.list(sHan).uniqueItems(),
  sup: S.list(sHan).uniqueItems(),
  var: S.list(sHan).uniqueItems()
})

export const ROOTDIR = path.join(__dirname, '..')

export async function runMain<T = any>(main: () => Promise<T>) {
  return main().catch((e) => {
    if (typeof e !== 'string') {
      console.error(e)
    }
    throw e
  })
}
