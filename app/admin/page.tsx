'use client';
import { useCallback, useEffect, useState } from 'react';

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_whatsapp: string;
  address_text: string;
  fulfillment?: string;
  items: any;
  total: number;
  payment_method: string;
  status: string;
  notes?: string;
};

type MenuItem = {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: string | number;
  active: boolean;
  sold_out: boolean;
};

type Category = { id: number; name: string };

const STATUS = [
  { key: 'new', label: 'Novo' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'ready', label: 'Pronto' },
  { key: 'delivering', label: 'Saiu entrega' },
  { key: 'delivered', label: 'Entregue/Retirado' },
  { key: 'cancelled', label: 'Cancelar' },
];

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [waLinks, setWaLinks] = useState<Record<string, string>>({});
  const [priceEdits, setPriceEdits] = useState<Record<number, string>>({});

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    try {
      const s = sessionStorage.getItem('rest_pro_admin') || '';
      if (s) {
        setSecret(s);
        setSaved(true);
      }
    } catch { /* */ }
  }, []);

  const h = useCallback(
    () => ({ 'x-admin-secret': secret.trim(), 'Content-Type': 'application/json' }),
    [secret]
  );

  const loadOrders = useCallback(async () => {
    const r = await fetch('/api/admin/orders', { headers: { 'x-admin-secret': secret.trim() } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setOrders(d.orders || []);
  }, [secret]);

  const loadMenu = useCallback(async () => {
    const r = await fetch('/api/admin/menu', { headers: { 'x-admin-secret': secret.trim() } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setItems(d.items || []);
    setCategories(d.categories || []);
  }, [secret]);

  const refresh = useCallback(async () => {
    setError('');
    try {
      if (tab === 'orders') await loadOrders();
      else await loadMenu();
      setNotice('Atualizado');
    } catch (e: any) {
      setError(e.message);
    }
  }, [tab, loadOrders, loadMenu]);

  useEffect(() => {
    if (saved && secret) refresh();
  }, [saved, secret, tab]); // eslint-disable-line

  async function setStatus(id: string, status: string) {
    try {
      const r = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ id, status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.customerWhatsAppLink) setWaLinks((m) => ({ ...m, [id]: d.customerWhatsAppLink }));
      setNotice(`Status atualizado · abra WhatsApp do cliente se precisar`);
      await loadOrders();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function flags(id: number, patch: Record<string, unknown>) {
    await fetch('/api/admin/menu', {
      method: 'POST',
      headers: h(),
      body: JSON.stringify({ action: 'set_flags', id, ...patch }),
    });
    await loadMenu();
  }

  async function savePrice(id: number) {
    const p = Number(priceEdits[id]);
    if (!(p >= 0)) return;
    await flags(id, { price: p });
    setNotice('Preço atualizado');
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: h(),
      body: JSON.stringify({
        action: 'upsert_item',
        name: newName,
        price: Number(newPrice),
        description: newDesc,
        category_id: newCat ? Number(newCat) : null,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error);
      return;
    }
    setNewName('');
    setNewPrice('');
    setNewDesc('');
    await loadMenu();
  }

  if (!saved) {
    return (
      <main className="admin-wrap">
        <form
          className="admin-login"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem('rest_pro_admin', secret.trim());
            setSaved(true);
          }}
        >
          <h1>Admin Delivery</h1>
          <input type="password" placeholder="OPERATOR_SECRET" value={secret} onChange={(e) => setSecret(e.target.value)} />
          <button type="submit" className="btn primary">
            Entrar
          </button>
          <a href="/">← Site</a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-wrap">
      <nav className="nav">
        <strong>Admin</strong>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className="btn" onClick={refresh}>
            Atualizar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              sessionStorage.removeItem('rest_pro_admin');
              setSaved(false);
            }}
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="chips">
        <button type="button" className={`chip ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          Pedidos
        </button>
        <button type="button" className={`chip ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
          Cardápio
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert ok">{notice}</div>}

      {tab === 'orders' &&
        orders.map((o) => {
          const lines = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
          return (
            <div key={o.id} className="admin-card">
              <div>
                <span className="st">{o.status}</span>
                <strong>
                  #{o.order_number} · {o.customer_name}
                </strong>
              </div>
              <div className="muted">
                {o.fulfillment === 'pickup' ? '🏍 Retirada' : '🚚 Delivery'} · {o.payment_method} · R${' '}
                {Number(o.total).toFixed(2)}
              </div>
              <div className="muted">{o.customer_whatsapp}</div>
              {lines.map((l: any, i: number) => (
                <div key={i} className="muted">
                  {l.qty}x {l.name}
                </div>
              ))}
              <div className="muted">📍 {o.address_text}</div>
              {o.notes && <div className="muted">Obs: {o.notes}</div>}
              <div className="admin-btns">
                {STATUS.map((s) => (
                  <button key={s.key} type="button" className="btn" onClick={() => setStatus(o.id, s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
              {waLinks[o.id] && (
                <a className="btn primary" href={waLinks[o.id]} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block' }}>
                  WhatsApp cliente
                </a>
              )}
              {!waLinks[o.id] && (
                <a
                  className="btn"
                  style={{ marginTop: 8, display: 'inline-block' }}
                  href={`https://wa.me/${String(o.customer_whatsapp).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir WhatsApp
                </a>
              )}
            </div>
          );
        })}

      {tab === 'menu' && (
        <>
          <form className="sheet" onSubmit={async (e) => {
            e.preventDefault();
            await fetch('/api/admin/menu', {
              method: 'POST',
              headers: h(),
              body: JSON.stringify({ action: 'add_category', name: newCatName }),
            });
            setNewCatName('');
            await loadMenu();
          }}>
            <h2>Nova categoria</h2>
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required placeholder="Ex: Sobremesas" />
            <button type="submit" className="btn primary">
              Adicionar
            </button>
          </form>

          <form className="sheet" onSubmit={addItem}>
            <h2>Novo prato</h2>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="Nome" />
            <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required type="number" step="0.01" placeholder="Preço R$" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição" />
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)}>
              <option value="">Categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn primary">
              Salvar prato
            </button>
          </form>

          {items.map((it) => (
            <div key={it.id} className="admin-card">
              <strong>
                {it.name} {!it.active && '(oculto)'} {it.sold_out && '· ESGOTADO'}
              </strong>
              <div className="muted">R$ {Number(it.price).toFixed(2)}</div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: 6 }}>
                <input
                  style={{ maxWidth: 100 }}
                  type="number"
                  step="0.01"
                  placeholder="Novo preço"
                  value={priceEdits[it.id] ?? ''}
                  onChange={(e) => setPriceEdits((m) => ({ ...m, [it.id]: e.target.value }))}
                />
                <button type="button" className="btn" onClick={() => savePrice(it.id)}>
                  Salvar preço
                </button>
              </div>
              <div className="admin-btns">
                <button type="button" className="btn" onClick={() => flags(it.id, { sold_out: !it.sold_out })}>
                  {it.sold_out ? 'Tirar esgotado' : 'Marcar esgotado'}
                </button>
                <button type="button" className="btn" onClick={() => flags(it.id, { active: !it.active })}>
                  {it.active ? 'Ocultar do menu' : 'Mostrar no menu'}
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
