import { neon } from '@neondatabase/serverless';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada');
  return neon(url);
}

export async function ensureSchema() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, whatsapp TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL, price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    image TEXT NOT NULL DEFAULT '', available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, customer_id BIGINT REFERENCES customers(id), customer_name TEXT NOT NULL,
    whatsapp TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', fulfillment TEXT NOT NULL,
    payment_method TEXT NOT NULL, pix_key TEXT NOT NULL DEFAULT '', items JSONB NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL, delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL, status TEXT NOT NULL DEFAULT 'Recebido',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  const count = await sql`SELECT COUNT(*)::int AS n FROM menu_items`;
  if (Number(count[0]?.n ?? 0) === 0) {
    const items = [
      ['burger-classic','X-Burger Clássico','Hambúrguer artesanal, queijo, alface e molho da casa.','Hambúrgueres',24.9,'🍔',true],
      ['burger-bacon','X-Bacon Supremo','Queijo derretido, bacon crocante e molho especial.','Hambúrgueres',31.9,'🥓',true],
      ['burger-double','Duplo Smash','Dois discos smash, cheddar e cebola caramelizada.','Hambúrgueres',35.9,'🍔',true],
      ['pizza-marg','Pizza Margherita','Muçarela, tomate fresco, manjericão e molho artesanal.','Pizzas',39.9,'🍕',true],
      ['pizza-calab','Pizza Calabresa','Calabresa fatiada, cebola e muçarela.','Pizzas',44.9,'🍕',true],
      ['pizza-four','Pizza Quatro Queijos','Muçarela, provolone, parmesão e gorgonzola.','Pizzas',49.9,'🧀',true],
      ['fries','Batata Frita Crocante','Porção dourada com sal da casa.','Acompanhamentos',14.9,'🍟',true],
      ['nuggets','Nuggets (8 unidades)','Crocantes por fora e macios por dentro.','Acompanhamentos',16.9,'🍗',true],
      ['soda','Refrigerante Lata','350 ml, consulte os sabores disponíveis.','Bebidas',6.5,'🥤',true],
      ['juice','Suco Natural','Suco gelado do dia.','Bebidas',9.9,'🧃',true],
      ['combo','Combo Brasa','X-Burger, batata frita e refrigerante.','Combos',36.9,'🍔',true]
    ];
    for (const i of items) await sql`INSERT INTO menu_items (id,name,description,category,price,image,available) VALUES (${i[0]},${i[1]},${i[2]},${i[3]},${i[4]},${i[5]},${i[6]}) ON CONFLICT (id) DO NOTHING`;
  }
}
