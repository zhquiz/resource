// @ts-check

import fs from 'fs'

import sqlite3 from 'better-sqlite3'
import fg from 'fast-glob'
import yaml from 'js-yaml'

import { S, absPath, ensureDirForFilename, runMain, sEntry } from './shared'

export const sLibraryRaw = S.shape({
  id: S.string().format('uuid'),
  createdAt: S.string().format('date-time').optional(),
  updatedAt: S.string().format('date-time').optional(),
  isShared: S.boolean().optional(),
  title: S.string(),
  entries: S.list(
    S.anyOf(
      S.string(),
      sEntry.partial().required('entry').additionalProperties(true)
    )
  ).minItems(1),
  type: S.string().enum('character', 'vocabulary', 'sentence').optional(),
  description: S.string().optional(),
  tag: S.list(S.string()).optional()
}).additionalProperties(true)

export const sLibrary = sLibraryRaw
  .required('createdAt', 'updatedAt', 'isShared', 'type', 'description', 'tag')
  .prop(
    'entries',
    sEntry.partial().required('entry').additionalProperties(true)
  )

export async function populate(filename = absPath('out/library.db')) {
  process.chdir(absPath('library'))

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
  INSERT OR REPLACE INTO "entry" ("data") VALUES (@data);
  `)

  const now = new Date().toString()

  for (const filename of await fg(['**/*.yaml'])) {
    console.log(filename)

    const rs = S.list(sLibrary).ensure(
      /** @type {any} */ (yaml.load(fs.readFileSync(filename, 'utf-8')))
    )

    db.transaction(() => {
      rs.map((r) => {
        stmt.run({
          data: JSON.stringify(
            sLibrary.ensure({
              createdAt: now,
              updatedAt: now,
              isShared: false,
              type: 'vocabulary',
              description: '',
              tag: [],
              ...r,
              entries: r.entries.map((r0) =>
                typeof r0 === 'string'
                  ? {
                      entry: [r0]
                    }
                  : r0
              )
            })
          )
        })
      })
    })()
  }

  db.close()
}

runMain(import.meta.url, async () => {
  await populate()
})
