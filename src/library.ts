import fs from 'fs'

import { makePinyin } from '@zhquiz/zhlevel'
import sqlite3 from 'better-sqlite3'
import fg from 'fast-glob'
import yaml from 'js-yaml'
import S from 'jsonschema-definer'

import { absPath, ensureDirForFilename, sEntry, sType } from './shared'

export const sLibraryRaw = S.shape({
  id: S.string().format('uuid'),
  createdAt: S.anyOf(
    S.string().format('date-time'),
    S.instanceOf(Date)
  ).optional(),
  updatedAt: S.anyOf(
    S.string().format('date-time'),
    S.instanceOf(Date)
  ).optional(),
  isShared: S.boolean().optional(),
  title: S.string(),
  entries: S.list(
    S.anyOf(
      S.string(),
      S.shape({
        type: sType.optional(),
        entry: S.anyOf(
          S.string(),
          S.list(S.string()).minItems(1).uniqueItems()
        ),
        reading: S.anyOf(
          S.string(),
          S.list(S.string()).minItems(1).uniqueItems()
        ).optional(),
        english: S.anyOf(
          S.string(),
          S.list(S.string()).minItems(1).uniqueItems()
        ).optional(),
        translation: S.object()
          .additionalProperties(
            S.anyOf(S.string(), S.list(S.string()).minItems(1).uniqueItems())
          )
          .optional(),
        tag: S.list(S.string()).uniqueItems().optional()
      }).additionalProperties(true)
    )
  ).minItems(1),
  type: sType.optional(),
  description: S.string().optional(),
  tag: S.list(S.string()).optional()
}).additionalProperties(true)

export const sLibrary = S.shape({
  id: S.string().format('uuid'),
  createdAt: S.string().format('date-time'),
  updatedAt: S.string().format('date-time'),
  isShared: S.boolean(),
  title: S.string(),
  entries: S.list(
    sEntry.partial().required('entry').additionalProperties(true)
  ).minItems(1),
  type: sType,
  description: S.string(),
  tag: S.list(S.string())
}).additionalProperties(true)

export async function populate(filename: string) {
  process.chdir(absPath('assets/library'))

  ensureDirForFilename(filename)
  const db = sqlite3(filename)
  db.exec(/* sql */ `
  CREATE TABLE IF NOT EXISTS "library" (
    "data"      JSON NOT NULL CHECK (json_valid("data") AND substr("data",1,1) = '{'),
    "id"        TEXT NOT NULL AS (json_extract("data", '$.id')),
    UNIQUE ("id")
  );

  CREATE TABLE IF NOT EXISTS "schema" (
    "table"     TEXT NOT NULL,
    "column"    TEXT NOT NULL,
    "schema"    JSON NOT NULL CHECK (json_valid("schema") AND substr("schema",1,1)= '{'),
    PRIMARY KEY ("table", "column")
  );
  `)

  db.prepare(
    /* sql */ `
  INSERT OR REPLACE INTO "schema" ("table", "column", "schema")
  VALUES ('library', 'data', @schema);
  `
  ).run({
    schema: JSON.stringify(sLibraryRaw.valueOf())
  })

  const stmt = db.prepare(/* sql */ `
  INSERT OR REPLACE INTO "library" ("data") VALUES (@data);
  `)

  const now = new Date().toISOString()

  for (const filename of await fg(['**/*.yaml'])) {
    console.log(filename)

    const rs = S.list(sLibraryRaw).ensure(
      yaml.load(fs.readFileSync(filename, 'utf-8')) as any
    )

    const normalizeArray = (el?: string | string[]) => {
      if (!el) return []
      return Array.isArray(el) ? el : [el]
    }

    db.transaction(() => {
      rs.map((r) => {
        stmt.run({
          data: JSON.stringify(
            sLibrary.ensure({
              ...r,
              createdAt:
                r.createdAt instanceof Date
                  ? r.createdAt.toISOString()
                  : r.createdAt || now,
              updatedAt:
                r.updatedAt instanceof Date
                  ? r.updatedAt.toISOString()
                  : r.updatedAt || now,
              isShared: r.isShared || false,
              type: r.type || 'vocabulary',
              description: r.description || '',
              tag: r.tag || [],
              entries: r.entries.map((r0) => {
                if (typeof r0 === 'string') return { entry: [r0] }

                const entry = normalizeArray(r0.entry)

                return {
                  ...r0,
                  entry,
                  reading: r0.reading
                    ? normalizeArray(r0.reading)
                    : [makePinyin(entry[0]!)],
                  english: normalizeArray(r0.english),
                  translation: r0.translation
                    ? Object.fromEntries(
                        Object.keys(r0.translation).map((k) => [
                          k,
                          normalizeArray((r0.translation as any)[k])
                        ])
                      )
                    : undefined
                }
              })
            })
          )
        })
      })
    })()
  }

  db.close()
}
