import { getSql } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ตารางเดิมจากแอปก่อนหน้า: transactions(id, created_at, type, amount, balance, note)
// type = 'SET_BALANCE' (ตั้งยอดคงเหลือ) | 'ADJUST' (รับเข้า/จ่ายออก, amount เป็นบวก=เข้า ลบ=ออก)

// อ่านรายการทั้งหมด (ใหม่สุดก่อน)
export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, created_at, type, amount, balance, note
      FROM transactions
      ORDER BY created_at DESC, id DESC
      LIMIT 1000`;
    return Response.json({ ok: true, transactions: rows });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// เพิ่มรายการใหม่ — server คำนวณยอดคงเหลือใหม่จากรายการล่าสุดในฐานข้อมูล
export async function POST(request) {
  try {
    const body = await request.json();
    const kind = body.kind; // 'checkpoint' | 'in' | 'out'
    const amount = parseFloat(body.amount);
    const note = (body.reason || '').toString().slice(0, 500);

    if (!['checkpoint', 'in', 'out'].includes(kind) || isNaN(amount)) {
      return Response.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const sql = getSql();

    // ยอดคงเหลือล่าสุด
    const last = await sql`
      SELECT balance FROM transactions ORDER BY created_at DESC, id DESC LIMIT 1`;
    const currentBalance = last.length ? parseFloat(last[0].balance) : 0;

    let dbType;
    let dbAmount; // ค่าที่เก็บในคอลัมน์ amount
    let newBalance;

    if (kind === 'checkpoint') {
      dbType = 'SET_BALANCE';
      dbAmount = amount;
      newBalance = amount;
    } else if (kind === 'in') {
      dbType = 'ADJUST';
      dbAmount = Math.abs(amount);
      newBalance = currentBalance + Math.abs(amount);
    } else {
      dbType = 'ADJUST';
      dbAmount = -Math.abs(amount);
      newBalance = currentBalance - Math.abs(amount);
    }

    let inserted;
    try {
      // ให้ฐานข้อมูลกำหนด id เอง (คอลัมน์ id เป็น serial/identity)
      inserted = await sql`
        INSERT INTO transactions (created_at, type, amount, balance, note)
        VALUES (now(), ${dbType}, ${dbAmount}, ${newBalance}, ${note})
        RETURNING id, created_at, type, amount, balance, note`;
    } catch (e) {
      // เผื่อกรณี id ไม่มี default ให้คำนวณ id ถัดไปเอง
      const next = await sql`SELECT COALESCE(MAX(id), 0) + 1 AS next FROM transactions`;
      const nextId = next[0].next;
      inserted = await sql`
        INSERT INTO transactions (id, created_at, type, amount, balance, note)
        VALUES (${nextId}, now(), ${dbType}, ${dbAmount}, ${newBalance}, ${note})
        RETURNING id, created_at, type, amount, balance, note`;
    }

    return Response.json({ ok: true, row: inserted[0], balance: newBalance });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// ลบรายการตาม id
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id'), 10);
    if (isNaN(id)) {
      return Response.json({ ok: false, error: 'ต้องระบุ id' }, { status: 400 });
    }
    const sql = getSql();
    await sql`DELETE FROM transactions WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
