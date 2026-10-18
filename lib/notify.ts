/** Telegram al restaurante */
export async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false, reason: 'telegram_not_configured' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: 'HTML',
      }),
    });
    return { ok: r.ok };
  } catch {
    return { ok: false, reason: 'telegram_error' };
  }
}

/** WhatsApp Cloud API (opcional). Si no hay token, no envía. */
export async function notifyWhatsApp(toDigits: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { ok: false, reason: 'whatsapp_api_not_configured' };

  const to = toDigits.replace(/\D/g, '');
  try {
    const r = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, body };
  } catch {
    return { ok: false, reason: 'whatsapp_error' };
  }
}

export function waMeLink(whatsapp: string, text: string) {
  const n = whatsapp.replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function formatOrderMessage(opts: {
  restaurant: string;
  orderNumber: number | string;
  customerName: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  address: string;
  statusLabel: string;
}) {
  const lines = opts.items.map((i) => `• ${i.qty}x ${i.name} — R$ ${(i.qty * i.price).toFixed(2)}`);
  return (
    `Olá, ${opts.customerName}! 👋\n` +
    `*${opts.restaurant}* — Pedido #${opts.orderNumber}\n` +
    `Status: *${opts.statusLabel}*\n\n` +
    lines.join('\n') +
    `\n\nSubtotal: R$ ${opts.subtotal.toFixed(2)}` +
    `\nEntrega: R$ ${opts.deliveryFee.toFixed(2)}` +
    `\n*Total: R$ ${opts.total.toFixed(2)}*` +
    `\n\n📍 ${opts.address}`
  );
}
