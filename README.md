# Sabor & Brasa — pedidos online

Aplicación Next.js para restaurante, en portugués de Brasil, preparada para GitHub + Vercel + Neon.

## Funciones
- Diseño responsive, animaciones ligeras, búsqueda y filtros por categoría.
- Catálogo y productos de ejemplo sembrados automáticamente en Neon.
- Carrito con cantidades y cálculo de subtotal, tarifa de entrega y total.
- Checkout con nombre, WhatsApp, dirección, delivery/retirada y selección de PIX, llave PIX, tarjeta de crédito/débito.
- El pedido se guarda en PostgreSQL y los datos del cliente se actualizan por WhatsApp para evitar duplicados.
- Panel `/admin` protegido por `ADMIN_PASSWORD`, gestión de pedidos/estados, alta de productos y marcar agotados.

## Instalación
1. Crear una base de datos en Neon.
2. En Vercel > Project > Settings > Environment Variables configurar:
   - `DATABASE_URL`: cadena de conexión de Neon con SSL.
   - `ADMIN_PASSWORD`: contraseña larga y única.
   - `NEXT_PUBLIC_RESTAURANT_NAME`: nombre del restaurante (opcional).
   - `NEXT_PUBLIC_WHATSAPP`: WhatsApp del restaurante (opcional, reservado para mejoras).
   - `NEXT_PUBLIC_PIX_KEY`: llave PIX a mostrar/configurar (opcional).
   - `NEXT_PUBLIC_DELIVERY_FEE`: tarifa de entrega en BRL (opcional, por defecto 5).
3. Push a GitHub y desplegar en Vercel. No hay migración manual: las tablas y productos demo se crean en la primera petición API.
4. Visitar `/admin` e ingresar el valor de `ADMIN_PASSWORD`.

Local: copiar `.env.example` a `.env.local`, completar valores, luego `npm install` y `npm run dev`.

## Importante sobre pagos
La selección PIX/cartão solo se registra en el pedido. **No procesa cobros ni confirma pagos.** Integra un proveedor de pagos brasileño (por ejemplo, Mercado Pago u otro habilitado para tu negocio) antes de aceptar pagos reales. No solicites ni almacenes números de tarjeta/CVV en esta aplicación.

## Seguridad y producción
- La contraseña admin viaja en el header de las solicitudes admin y no está expuesta como variable `NEXT_PUBLIC_`; aun así, para producción de alto tráfico recomendamos reemplazarla por autenticación real con sesión, hash, limitación de intentos y protección CSRF.
- Añadir rate limiting y validación de webhook si se integra un proveedor de pagos.
- Las tablas se crean desde la API con `CREATE TABLE IF NOT EXISTS`. Asegura que el rol de Neon tenga permisos DDL durante la inicialización.
- Los datos de perfil se guardan en `localStorage` para comodidad en el mismo dispositivo y en Neon al crear el pedido. Añade política de privacidad/consentimiento antes de uso comercial.
- Productos de ejemplo usan emojis, no fotografías licenciadas. Puedes cambiar el campo `image` desde el panel.
