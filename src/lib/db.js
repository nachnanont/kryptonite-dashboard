import { neon } from '@neondatabase/serverless';

// ใช้ connection string ของ Neon ที่ Vercel ฉีดเข้ามาให้ (pooled)
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED;

export function getSql() {
  if (!connectionString) {
    throw new Error('ไม่พบ connection string ของฐานข้อมูล (DATABASE_URL)');
  }
  return neon(connectionString);
}
