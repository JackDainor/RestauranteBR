import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';

export async function GET() {
  try {
    await ensureSchema();
    const db = sql();
    const categories = await db`
      SELECT id, name, sort_order FROM menu_categories WHERE active = true ORDER BY sort_order, id
    `;
    const items = await db`
      SELECT id, category_id, name, description, price::float8 AS price,
             image_url, sold_out, sort_order
      FROM menu_items WHERE active = true ORDER BY sort_order, id
    `;
    return NextResponse.json({
      success: true,
      categories,
      items,
      restaurant: process.env.RESTAURANT_NAME || 'Sabor & Fogo',
      deliveryFee: Number(process.env.DELIVERY_FEE || 8),
      minOrder: Number(process.env.MIN_ORDER || 25),
      pixKey: process.env.PIX_KEY || null,
      pixQrUrl: process.env.PIX_QR_URL || null,
      cardNote: process.env.CARD_NOTE || 'Cartão na entrega',
      restaurantWhatsapp: process.env.RESTAURANT_WHATSAPP || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro cardápio' }, { status: 500 });
  }
}
