import { NextResponse } from 'next/server';
import { ensureSchema, getSql } from '@/lib/db';
export const runtime = 'nodejs';
export async function GET() {
  try { await ensureSchema(); const sql = getSql(); const rows = await sql`SELECT id,name,description,category,price::float AS price,image,available FROM menu_items ORDER BY category,name`; return NextResponse.json({items:rows}); }
  catch (e) { console.error('menu GET', e); return NextResponse.json({error:'Não foi possível carregar o cardápio. Configure DATABASE_URL.'},{status:503}); }
}
