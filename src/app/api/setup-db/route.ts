import { NextRequest, NextResponse } from 'next/server'
import { getMigrationSQL } from '@/lib/db-init'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const setupSecret = process.env.SETUP_SECRET || 'oracle-setup-2025'

  if (secret !== setupSecret) {
    return NextResponse.json({ error: 'Non autorisé. Ajoutez ?secret=oracle-setup-2025' }, { status: 401 })
  }

  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL

  if (!postgresUrl) {
    return NextResponse.json({
      status: 'needs_manual_setup',
      message: 'POSTGRES_URL non définie. Exécutez le SQL manuellement dans Supabase.',
      steps: [
        '1. Ouvrez https://supabase.com/dashboard/project/jnyomioesinzwuwtmort/sql/new',
        '2. Copiez le SQL ci-dessous',
        '3. Cliquez "Run"',
        '4. (Optionnel) Ajoutez POSTGRES_URL dans Vercel et rappellez cet endpoint pour validation',
      ],
      sql: getMigrationSQL(),
    }, { status: 200 })
  }

  try {
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: postgresUrl,
      ssl: { rejectUnauthorized: false },
    })
    await client.connect()
    await client.query(getMigrationSQL())
    await client.end()

    return NextResponse.json({
      status: 'success',
      message: '✅ Tables créées avec succès via POSTGRES_URL',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      status: 'error',
      error: msg,
      fallback: 'Exécutez le SQL manuellement dans Supabase Dashboard > SQL Editor',
      sql: getMigrationSQL(),
    }, { status: 500 })
  }
}
