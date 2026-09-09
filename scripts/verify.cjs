const { Client } = require('pg')
async function main() {
  const c = new Client({
    connectionString: process.env.PG_CONN,
    ssl: { rejectUnauthorized: false },
  })
  await c.connect()

  const tables = await c.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  )
  console.log('Tables:', tables.rows.map((r) => r.table_name).join(', '))

  const rls = await c.query(
    "select relname, relrowsecurity from pg_class where relname in ('events','rsvps')"
  )
  console.log('RLS enabled:', rls.rows.map((r) => `${r.relname}=${r.relrowsecurity}`).join(', '))

  const policies = await c.query(
    "select policyname, tablename from pg_policies where schemaname='public' order by tablename, policyname"
  )
  console.log('Policies:')
  policies.rows.forEach((r) => console.log('  -', r.tablename + ':', r.policyname))

  const pub = await c.query(
    "select schemaname, tablename from pg_publication_tables where pubname='supabase_realtime'"
  )
  console.log('Realtime publication:', pub.rows.map((r) => `${r.schemaname}.${r.tablename}`).join(', '))

  const slugIdx = await c.query(
    "select indexname from pg_indexes where tablename='events' and indexdef like '%slug%'"
  )
  console.log('Slug unique index:', slugIdx.rows.length > 0 ? 'present' : 'MISSING')

  await c.end()
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1) })