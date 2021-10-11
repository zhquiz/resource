// @ts-check

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// @ts-ignore
import cjs from './commonjs.cjs'

/**
 * @type {{
 *  S: import('jsonschema-definer').default
 * }}
 */
export const { S } = cjs

/**
 *
 * @param {string[]} fileparts
 * @returns {string}
 */
export function absPath(...fileparts) {
  return path.resolve(ROOTDIR, ...fileparts)
}

/**
 *
 * @param {string} dirname
 * @returns {string | null}
 */
export function ensureDir(dirname) {
  dirname = absPath(dirname)

  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true })
    return dirname
  }
  return null
}

/**
 *
 * @param {string} filename
 * @returns {string | null}
 */
export function ensureDirForFilename(filename) {
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

export const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)

export const ROOTDIR = path.join(__dirname, '..')

/**
 *
 * @param {string} import_meta_url `import.meta.url`
 * @param {() => Promise<any>} main
 * @returns
 */
export async function runMain(import_meta_url, main) {
  const __file__ = fileURLToPath(import_meta_url)
  if (__file__ === path.resolve(process.cwd(), process.argv[1])) {
    return main().catch((e) => {
      if (typeof e !== 'string') {
        console.error(e)
      }
      throw e
    })
  }
}
