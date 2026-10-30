import { createClient } from '@libsql/client'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN env vars.')
  process.exit(1)
}

const sql = readFileSync(join(root, 'schema.sql'), 'utf8')
const client = createClient({ url, authToken })

try {
  await client.executeMultiple(sql)
  console.log('Schema applied.')

  // Idempotent upgrade for DBs created before the `structured` column existed.
  try {
    await client.execute('ALTER TABLE chats ADD COLUMN structured TEXT')
    console.log('Added chats.structured column.')
  } catch (e) {
    if (!String(e.message).includes('duplicate column')) console.log('Note:', e.message)
  }

  const tables = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','chats','user_preferences','api_keys') ORDER BY name`
  )
  console.log('Tables present:', tables.rows.map((r) => r.name).join(', '))
} catch (err) {
  console.error('Migration failed:', err)
  process.exit(1)
} finally {
  client.close()
}
