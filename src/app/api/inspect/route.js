import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ชั่วคราว: ตรวจว่าเชื่อม Neon DB ได้ไหม และมีตาราง/ข้อมูลเดิมอะไรอยู่บ้าง
export async function GET() {
  const conn =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED;

  if (!conn) {
    return Response.json({ ok: false, error: 'no connection string env var found' }, { status: 500 });
  }

  try {
    const sql = neon(conn);
    // รายชื่อตารางใน public schema
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name`;

    const details = [];
    for (const t of tables) {
      const name = t.table_name;
      const cols = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${name}
        ORDER BY ordinal_position`;
      let count = null;
      let sample = null;
      try {
        const c = await sql(`SELECT COUNT(*)::int AS n FROM "${name}"`);
        count = c[0]?.n ?? null;
        const s = await sql(`SELECT * FROM "${name}" LIMIT 1`);
        sample = s[0] ?? null;
      } catch (e) {
        count = `err: ${e.message}`;
      }
      details.push({ table: name, columns: cols, rowCount: count, sampleRow: sample });
    }

    return Response.json({ ok: true, whichEnv: process.env.DATABASE_URL ? 'DATABASE_URL' : 'other', tableCount: tables.length, tables: details });
  } catch (e) {
    return Response.json({ ok: false, error: e.message, name: e.name }, { status: 500 });
  }
}
