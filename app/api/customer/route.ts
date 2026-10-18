import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

function normWa(w: string) {
  return w.replace(/\D/g, '');
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const wa = normWa(req.nextUrl.searchParams.get('whatsapp') || '');
    if (wa.length < 10) {
      return NextResponse.json({ error: 'WhatsApp inválido' }, { status: 400 });
    }
    const db = sql();
    const rows = await db`SELECT * FROM customers WHERE whatsapp = ${wa} LIMIT 1`;
    if (!rows[0]) return NextResponse.json({ success: true, customer: null });
    return NextResponse.json({ success: true, customer: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const b = await req.json();
    const whatsapp = normWa(String(b.whatsapp || ''));
    const name = String(b.name || '').trim();
    if (whatsapp.length < 10 || !name) {
      return NextResponse.json({ error: 'Nome e WhatsApp são obrigatórios' }, { status: 400 });
    }
    const cep = String(b.cep || '').replace(/\D/g, '');
    const street = String(b.street || '').trim();
    const number = String(b.number || '').trim();
    const complement = String(b.complement || '').trim();
    const neighborhood = String(b.neighborhood || '').trim();
    const city = String(b.city || '').trim();
    const state = String(b.state || '').trim().toUpperCase().slice(0, 2);
    const reference = String(b.reference || '').trim();

    const db = sql();
    const rows = await db`
      INSERT INTO customers (
        whatsapp, name, cep, street, number, complement, neighborhood, city, state, reference, updated_at
      ) VALUES (
        ${whatsapp}, ${name}, ${cep}, ${street}, ${number}, ${complement},
        ${neighborhood}, ${city}, ${state}, ${reference}, now()
      )
      ON CONFLICT (whatsapp) DO UPDATE SET
        name = EXCLUDED.name,
        cep = EXCLUDED.cep,
        street = EXCLUDED.street,
        number = EXCLUDED.number,
        complement = EXCLUDED.complement,
        neighborhood = EXCLUDED.neighborhood,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        reference = EXCLUDED.reference,
        updated_at = now()
      RETURNING *
    `;
    return NextResponse.json({ success: true, customer: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
