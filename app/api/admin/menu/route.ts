import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

function authed(req: NextRequest) {
  const secret = process.env.OPERATOR_SECRET || '';
  if (!secret) return false;
  return (req.headers.get('x-admin-secret') || '') === secret;
}

export async function GET(req: NextRequest) {
  try {
    if (!authed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    await ensureSchema();
    const db = sql();
    const categories = await db`SELECT * FROM menu_categories ORDER BY sort_order, id`;
    const items = await db`SELECT * FROM menu_items ORDER BY sort_order, id`;
    return NextResponse.json({ success: true, categories, items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    await ensureSchema();
    const b = await req.json();
    const action = String(b.action || '');
    const db = sql();

    if (action === 'upsert_item') {
      const id = b.id ? Number(b.id) : null;
      const name = String(b.name || '').trim();
      const price = Number(b.price);
      if (!name || !(price >= 0)) {
        return NextResponse.json({ error: 'Nome e preço obrigatórios' }, { status: 400 });
      }
      if (id) {
        await db`
          UPDATE menu_items SET
            name = ${name},
            description = ${String(b.description || '')},
            price = ${price},
            category_id = ${b.category_id ? Number(b.category_id) : null},
            image_url = ${b.image_url || null},
            active = ${b.active !== false},
            sort_order = ${Number(b.sort_order) || 0}
          WHERE id = ${id}
        `;
      } else {
        await db`
          INSERT INTO menu_items (category_id, name, description, price, image_url, active, sort_order)
          VALUES (
            ${b.category_id ? Number(b.category_id) : null},
            ${name},
            ${String(b.description || '')},
            ${price},
            ${b.image_url || null},
            ${b.active !== false},
            ${Number(b.sort_order) || 0}
          )
        `;
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_item') {
      const id = Number(b.id);
      await db`UPDATE menu_items SET active = ${Boolean(b.active)} WHERE id = ${id}`;
      return NextResponse.json({ success: true });
    }

    if (action === 'add_category') {
      const name = String(b.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
      await db`INSERT INTO menu_categories (name, sort_order) VALUES (${name}, ${Number(b.sort_order) || 99})`;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
