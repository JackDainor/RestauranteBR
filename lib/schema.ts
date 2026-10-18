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

  // migrate sold_out if table existed without it
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
      ('Hambúrgueres', 1),
      ('Pizzas', 2),
      ('Bebidas', 3),
      ('Acompanhamentos', 4)`;
    const c = await db`SELECT id, name FROM menu_categories ORDER BY sort_order`;
    const m: Record<string, number> = {};
    for (const row of c as any[]) m[row.name] = row.id;
    await db`
      INSERT INTO menu_items (category_id, name, description, price, sort_order) VALUES
      (${m['Hambúrgueres']}, 'Classic Burger', 'Blend 180g, queijo, alface, tomate, molho da casa', 29.90, 1),
      (${m['Hambúrgueres']}, 'Bacon Smash', 'Dois smashes, cheddar e bacon crocante', 34.90, 2),
      (${m['Hambúrgueres']}, 'Burger BBQ', 'Blend, onion rings e barbecue', 36.90, 3),
      (${m['Pizzas']}, 'Mussarela G', 'Molho, mussarela e orégano', 49.90, 1),
      (${m['Pizzas']}, 'Calabresa G', 'Calabresa fatiada e cebola', 54.90, 2),
      (${m['Pizzas']}, 'Frango c/ Catupiry G', 'Frango desfiado e catupiry', 59.90, 3),
      (${m['Bebidas']}, 'Refrigerante Lata', '350ml', 7.00, 1),
      (${m['Bebidas']}, 'Refrigerante 2L', 'Diversos sabores', 14.00, 2),
      (${m['Bebidas']}, 'Suco Natural', 'Laranja ou limão 500ml', 12.00, 3),
      (${m['Acompanhamentos']}, 'Batata Frita G', 'Crocante com tempero', 22.00, 1),
      (${m['Acompanhamentos']}, 'Onion Rings', 'Anéis empanados', 24.00, 2)
    `;
  }
}
