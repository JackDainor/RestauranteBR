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
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await db`
    CREATE TABLE IF NOT EXISTS orders (
      id uuid PRIMARY KEY,
      order_number serial,
      customer_id uuid REFERENCES customers(id),
      customer_name text NOT NULL,
      customer_whatsapp text NOT NULL,
      address_text text NOT NULL,
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

  // Seed default categories if empty
  const cats = await db`SELECT id FROM menu_categories LIMIT 1`;
  if (!cats.length) {
    await db`INSERT INTO menu_categories (name, sort_order) VALUES
      ('Lanches', 1),
      ('Bebidas', 2),
      ('Porções', 3),
      ('Sobremesas', 4)`;
    const c = await db`SELECT id, name FROM menu_categories ORDER BY sort_order`;
    const map: Record<string, number> = {};
    for (const row of c as any[]) map[row.name] = row.id;
    await db`
      INSERT INTO menu_items (category_id, name, description, price, sort_order) VALUES
      (${map['Lanches']}, 'X-Burger', 'Pão, burger 180g, queijo, alface, tomate', 28.00, 1),
      (${map['Lanches']}, 'X-Bacon', 'Burger, queijo, bacon crocante', 32.00, 2),
      (${map['Lanches']}, 'X-Tudo', 'Completo com ovo, bacon, salada', 36.00, 3),
      (${map['Bebidas']}, 'Refrigerante 350ml', 'Lata', 7.00, 1),
      (${map['Bebidas']}, 'Suco natural 500ml', 'Laranja ou limão', 12.00, 2),
      (${map['Porções']}, 'Batata frita G', 'Porção generosa', 22.00, 1),
      (${map['Sobremesas']}, 'Brownie', 'Com calda de chocolate', 14.00, 1)
    `;
  }
}
