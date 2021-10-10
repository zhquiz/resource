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
const { S } = cjs

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

export const sEntry = S.shape({
  type: S.string().enum('character', 'vocabulary', 'sentence'),
  entry: S.list(S.string()).minItems(1).uniqueItems(),
  reading: S.list(S.string()).minItems(1).uniqueItems(),
  translation: S.list(S.string()).uniqueItems(),
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
