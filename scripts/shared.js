// @ts-check

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import S from 'jsonschema-definer'

/**
 *
 * @param {string[]} fileparts
 * @returns {string}
 */
export function absPath(...fileparts) {
  return path.join(ROOTDIR, ...fileparts)
}

/**
 *
 * @param {string} filename
 * @returns {string | null}
 */
export function ensureDirForFilename(filename) {
  const dirname = absPath(filename, '..')

  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true })
    return dirname
  }
  return null
}

export const sEntry = S.shape({
  type: S.string().enum('character', 'vocabulary', 'sentence'),
  entry: S.list(S.string()).minItems(1),
  reading: S.list(S.string()).minItems(1),
  translation: S.list(S.string()).minItems(1),
  tag: S.list(S.string()),
  frequency: S.number().optional(),
  level: S.number().optional(),
  hLevel: S.integer().minimum(1)
})

export const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)

export const ROOTDIR = path.join(__dirname, '..')
