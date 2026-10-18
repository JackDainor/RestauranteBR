import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { formatOrderMessage, notifyTelegram, notifyWhatsApp, waMeLink } from '@/lib/notify';

function normWa(w: string) {
  return w.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const b = await req.json();
    const name = String(b.customerName || '').trim();
    const whatsapp = normWa(String(b.customerWhatsapp || ''));
    const addressText = String(b.addressText || '').trim();
    const notes = String(b.notes || '').trim();
    const paymentMethod = String(b.paymentMethod || 'pix');
    const items = Array.isArray(b.items) ? b.items : [];

    if (!name || whatsapp.length < 10 || !addressText || !items.length) {
      return NextResponse.json({ error: 'Dados incompletos do pedido' }, { status: 400 });
    }

    type Line = { id: number; name: string; qty: number; price: number };
    const lines: Line[] = items.map((i: any) => ({
      id: Number(i.id),
      name: String(i.name),
      qty: Math.max(1, Number(i.qty) || 1),
      price: Number(i.price) || 0,
    }));

    const subtotal = lines.reduce((s, i) => s + i.qty * i.price, 0);
    const deliveryFee = Number(process.env.DELIVERY_FEE || 6);
    const minOrder = Number(process.env.MIN_ORDER || 20);
    if (subtotal < minOrder) {
      return NextResponse.json(
        { error: `Pedido mínimo de R$ ${minOrder.toFixed(2)} (sem taxa de entrega)` },
        { status: 400 }
      );
    }
    const total = subtotal + deliveryFee;

    const db = sql();
    // upsert customer lightly
    let customerId: string | null = null;
    const existing = await db`SELECT id FROM customers WHERE whatsapp = ${whatsapp} LIMIT 1`;
    if (existing[0]) customerId = existing[0].id;

    const id = randomUUID();
    const rows = await db`
      INSERT INTO orders (
        id, customer_id, customer_name, customer_whatsapp, address_text,
        items, subtotal, delivery_fee, total, payment_method, status, notes
      ) VALUES (
        ${id}::uuid,
        ${customerId}::uuid,
        ${name},
        ${whatsapp},
        ${addressText},
        ${JSON.stringify(lines)}::jsonb,
        ${subtotal},
        ${deliveryFee},
        ${total},
        ${paymentMethod},
        'new',
        ${notes || null}
      )
      RETURNING id, order_number, status, total, created_at
    `;
    const order = rows[0];
    const restaurant = process.env.RESTAURANT_NAME || 'Meu Restaurante';

    const telegramText =
      `🍽 <b>Novo pedido #${order.order_number}</b>\n` +
      `${name} · ${whatsapp}\n` +
      lines.map((i) => `${i.qty}x ${i.name}`).join('\n') +
      `\nTotal: R$ ${total.toFixed(2)} (${paymentMethod})\n` +
      `📍 ${addressText}`;

    await notifyTelegram(telegramText);

    const clientMsg = formatOrderMessage({
      restaurant,
      orderNumber: order.order_number,
      customerName: name,
      items: lines,
      subtotal,
      deliveryFee,
      total,
      address: addressText,
      statusLabel: 'Recebido — em breve preparamos',
    });

    const waApi = await notifyWhatsApp(whatsapp, clientMsg);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.order_number,
        total,
        status: order.status,
      },
      customerWhatsAppLink: waMeLink(whatsapp, clientMsg),
      whatsappApiSent: waApi.ok,
      pixKey: process.env.PIX_KEY || null,
      pixQrUrl: process.env.PIX_QR_URL || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao criar pedido' }, { status: 500 });
  }
}
