const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  const client = new Client({
    connectionString: process.env.PG_CONN,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  const mode = process.argv[2]
  if (mode === 'check') {
    const tables = await client.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
    )
    console.log('Tables in public schema:')
    if (tables.rows.length === 0) {
      console.log('  (none)')
    } else {
      tables.rows.forEach((r) => console.log('  -', r.table_name))
    }
    const pubs = await client.query('select pubname from pg_publication')
    console.log('Publications:', pubs.rows.map((r) => r.pubname).join(', '))
  }

  if (mode === 'apply') {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8')
    await client.query(sql)
    console.log('Schema applied successfully.')
  }

  if (mode === 'migrate') {
    const file = process.argv[3] || 'migration_poster.sql'
    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', file), 'utf8')
    await client.query(sql)
    console.log(`Migration ${file} applied successfully.`)
  }

  if (mode === 'realtime') {
    // Ensure events + rsvps tables are in the realtime publication
    const pubName = 'supabase_realtime'
    const pubs = await client.query("select pubname from pg_publication where pubname = $1", [pubName])
    if (pubs.rows.length === 0) {
      await client.query(`create publication ${pubName}`)
      console.log(`Created publication ${pubName}`)
    }
    await client.query(`alter publication ${pubName} add table public.events`)
    await client.query(`alter publication ${pubName} add table public.rsvps`)
    console.log('Realtime enabled for events + rsvps')
  }

  await client.end()
}

main().catch((e) => {
  console.error('ERROR:', e.message)
  process.exit(1)
})