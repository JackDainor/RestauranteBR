# Restaurante Delivery (Brasil)

Next.js + Vercel + Neon.

## Funcionalidades
- Cardápio público com carrinho
- Cliente: nome, WhatsApp, endereço (salvo por WhatsApp)
- 2ª compra: confirmar ou editar endereço
- Pedido → Telegram ao restaurante
- Status no admin → mensagem WhatsApp ao cliente (API se configurada, ou link wa.me)
- Pix (chave/QR por variáveis) ou dinheiro na entrega
- Admin: pedidos + editar cardápio

## Variáveis Vercel
Ver `.env.example`

## URLs
- Site: /
- Admin: /admin (senha = OPERATOR_SECRET)
