import { sql } from '@/lib/db';

export async function ensureSchema() {
  const db = sql();

  await db`
    CREATE TABLE IF NOT EXISTS customers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      whatsapp text NOT NULL UNIQUE,
      name text NOT NULL,
      cep text,
      street text,
      number text,
      complement text,
      neighborhood text,
      city text,
      state text,
      reference text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id serial PRIMARY KEY,
      name text NOT NULL,
      sort_order int NOT NULL DEFAULT 0,
      active boolean NOT NULL DEFAULT true
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS menu_items (
      id serial PRIMARY KEY,
      category_id int REFERENCES menu_categories(id) ON DELETE SET NULL,
      name text NOT NULL,
      description text,
      price numeric NOT NULL,
      image_url text,
      active boolean NOT NULL DEFAULT true,
      sold_out boolean NOT NULL DEFAULT false,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await db`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sold_out boolean NOT NULL DEFAULT false`;

  await db`
    CREATE TABLE IF NOT EXISTS orders (
      id uuid PRIMARY KEY,
      order_number serial,
      customer_id uuid REFERENCES customers(id),
      customer_name text NOT NULL,
      customer_whatsapp text NOT NULL,
      address_text text,
      fulfillment text NOT NULL DEFAULT 'delivery',
      items jsonb NOT NULL,
      subtotal numeric NOT NULL,
      delivery_fee numeric NOT NULL DEFAULT 0,
      total numeric NOT NULL,
      payment_method text NOT NULL DEFAULT 'pix',
      status text NOT NULL DEFAULT 'new',
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await db`ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment text NOT NULL DEFAULT 'delivery'`;
  await db`ALTER TABLE orders ALTER COLUMN address_text DROP NOT NULL`;

  const cats = await db`SELECT id FROM menu_categories LIMIT 1`;
  if (!cats.length) {
    await db`INSERT INTO menu_categories (name, sort_order) VALUES
      ('Pratos', 1),
      ('Frango', 2),
      ('Bebidas', 3)`;
    const c = await db`SELECT id, name FROM menu_categories ORDER BY sort_order`;
    const m: Record<string, number> = {};
    for (const row of c as any[]) m[row.name] = row.id;
    await db`
      INSERT INTO menu_items (category_id, name, description, price, sort_order) VALUES
      (${m['Pratos']}, 'Pique Macho', 'Carne, salsicha, ovo, batata frita e molhos — porção generosa', 48.90, 1),
      (${m['Pratos']}, 'Pique Macho Família', 'Porção grande para compartilhar', 79.90, 2),
      (${m['Frango']}, 'Pollo al Spiedo', 'Frango no espeto, crocante por fora e suculento', 42.90, 1),
      (${m['Frango']}, 'Pollo Broaster', 'Frango empanado crocante estilo broaster', 39.90, 2),
      (${m['Frango']}, 'Pollo al Horno', 'Frango assado no forno com tempero da casa', 41.90, 3),
      (${m['Frango']}, '1/4 Pollo + Batata', 'Quarto de frango com porção de batata', 28.90, 4),
      (${m['Bebidas']}, 'Coca-Cola Lata 350ml', 'Gelada', 7.00, 1),
      (${m['Bebidas']}, 'Coca-Cola 2L', 'Garrafa 2 litros', 14.00, 2),
      (${m['Bebidas']}, 'Fanta Lata 350ml', 'Laranja gelada', 7.00, 3),
      (${m['Bebidas']}, 'Fanta 2L', 'Garrafa 2 litros', 13.00, 4),
      (${m['Bebidas']}, 'Sprite Lata 350ml', 'Limão gelada', 7.00, 5),
      (${m['Bebidas']}, 'Sprite 2L', 'Garrafa 2 litros', 13.00, 6)
    `;
  }
}
