import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { formatOrderMessage, notifyTelegram, notifyWhatsApp, waMeLink } from '@/lib/notify';

function authed(req: NextRequest) {
  const secret = process.env.OPERATOR_SECRET || '';
  return !!secret && (req.headers.get('x-admin-secret') || '') === secret;
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo',
  preparing: 'Preparando',
  ready: 'Pronto para retirar / sair',
  delivering: 'Saiu para entrega',
  delivered: 'Entregue / Retirado',
  cancelled: 'Cancelado',
};

export async function GET(req: NextRequest) {
  try {
    if (!authed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    await ensureSchema();
    const db = sql();
    const rows = await db`
      SELECT id, order_number, customer_name, customer_whatsapp, address_text, fulfillment,
             items, subtotal::float8, delivery_fee::float8, total::float8,
             payment_method, status, notes, created_at
      FROM orders ORDER BY created_at DESC LIMIT 100
    `;
    return NextResponse.json({ success: true, orders: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!authed(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    await ensureSchema();
    const b = await req.json();
    const id = String(b.id || '');
    const status = String(b.status || '');
    if (!id || !STATUS_LABEL[status]) {
      return NextResponse.json({ error: 'ID ou status inválido' }, { status: 400 });
    }
    const db = sql();
    const rows = await db`
      UPDATE orders SET status = ${status}, updated_at = now()
      WHERE id = ${id}::uuid RETURNING *
    `;
    const order = rows[0];
    if (!order) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
    const restaurant = process.env.RESTAURANT_NAME || 'Sabor & Fogo';
    let statusLabel = STATUS_LABEL[status];
    if (status === 'ready' && order.fulfillment === 'pickup') {
      statusLabel = 'Pronto para retirar no restaurante';
    }

    const msg = formatOrderMessage({
      restaurant,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      items,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee),
      total: Number(order.total),
      address: order.address_text || 'Retirada',
      statusLabel,
    });

    if (['ready', 'delivering', 'delivered'].includes(status)) {
      await notifyWhatsApp(order.customer_whatsapp, msg);
    }
    await notifyTelegram(`#${order.order_number} → <b>${statusLabel}</b>`);

    return NextResponse.json({
      success: true,
      order: { id: order.id, status },
      customerWhatsAppLink: waMeLink(order.customer_whatsapp, msg),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
