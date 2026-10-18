'use client';
import { useCallback, useEffect, useState } from 'react';

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_whatsapp: string;
  address_text: string;
  items: any;
  total: number;
  payment_method: string;
  status: string;
  notes?: string;
  created_at: string;
};

type MenuItem = {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: string | number;
  active: boolean;
};

type Category = { id: number; name: string };

const STATUS: { key: string; label: string }[] = [
  { key: 'new', label: 'Novo' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'ready', label: 'Pronto' },
  { key: 'delivering', label: 'Saiu p/ entrega' },
  { key: 'delivered', label: 'Entregue' },
  { key: 'cancelled', label: 'Cancelado' },
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

  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    try {
      const s = sessionStorage.getItem('rest_admin_secret') || '';
      if (s) {
        setSecret(s);
        setSaved(true);
      }
    } catch { /* ignore */ }
  }, []);

  const headers = useCallback(
    () => ({ 'x-admin-secret': secret.trim(), 'Content-Type': 'application/json' }),
    [secret]
  );

  const loadOrders = useCallback(async () => {
    const r = await fetch('/api/admin/orders', { headers: { 'x-admin-secret': secret.trim() } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Erro');
    setOrders(d.orders || []);
  }, [secret]);

  const loadMenu = useCallback(async () => {
    const r = await fetch('/api/admin/menu', { headers: { 'x-admin-secret': secret.trim() } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Erro');
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

  function login(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.setItem('rest_admin_secret', secret.trim());
    } catch { /* ignore */ }
    setSaved(true);
  }

  async function setStatus(id: string, status: string) {
    setError('');
    try {
      const r = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ id, status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro');
      if (d.customerWhatsAppLink) {
        setWaLinks((m) => ({ ...m, [id]: d.customerWhatsAppLink }));
      }
      setNotice(`Status → ${status}`);
      await loadOrders();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          action: 'upsert_item',
          name: newName,
          price: Number(newPrice),
          description: newDesc,
          category_id: newCat ? Number(newCat) : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNewName('');
      setNewPrice('');
      setNewDesc('');
      await loadMenu();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function toggleItem(id: number, active: boolean) {
    await fetch('/api/admin/menu', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'toggle_item', id, active }),
    });
    await loadMenu();
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/admin/menu', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'add_category', name: newCatName }),
    });
    setNewCatName('');
    await loadMenu();
  }

  if (!saved) {
    return (
      <main className="admin-wrap">
        <form className="admin-login" onSubmit={login}>
          <h1>Admin Delivery</h1>
          <input
            type="password"
            placeholder="OPERATOR_SECRET"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
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
      <div className="nav">
        <strong>Admin · Delivery</strong>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className="btn" onClick={refresh}>
            Atualizar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              sessionStorage.removeItem('rest_admin_secret');
              setSaved(false);
            }}
          >
            Sair
          </button>
        </div>
      </div>

      <div className="chips">
        <button type="button" className={`chip ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
          Pedidos
        </button>
        <button type="button" className={`chip ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
          Cardápio
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

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
              <small className="muted">
                {o.customer_whatsapp} · {o.payment_method} · R$ {Number(o.total).toFixed(2)}
              </small>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                {lines.map((l: any, i: number) => (
                  <div key={i}>
                    {l.qty}x {l.name}
                  </div>
                ))}
              </div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>
                📍 {o.address_text}
              </div>
              {o.notes && <div className="muted">Obs: {o.notes}</div>}
              <div className="admin-btns">
                {STATUS.map((s) => (
                  <button key={s.key} type="button" className="btn" onClick={() => setStatus(o.id, s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
              {waLinks[o.id] && (
                <a href={waLinks[o.id]} target="_blank" rel="noreferrer" className="btn primary" style={{ marginTop: '0.4rem', display: 'inline-block' }}>
                  Abrir WhatsApp do cliente
                </a>
              )}
            </div>
          );
        })}

      {tab === 'menu' && (
        <>
          <form className="panel" onSubmit={addCategory}>
            <h2>Nova categoria</h2>
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome" required />
            <button type="submit" className="btn primary">
              Adicionar categoria
            </button>
          </form>
          <form className="panel" onSubmit={addItem}>
            <h2>Novo item</h2>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do prato" required />
            <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="Preço R$" type="number" step="0.01" required />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição" />
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn primary">
              Salvar item
            </button>
          </form>
          {items.map((it) => (
            <div key={it.id} className="admin-card">
              <strong>
                {it.name} — R$ {Number(it.price).toFixed(2)}
              </strong>
              <div className="muted">{it.active ? 'Ativo' : 'Inativo'}</div>
              <button type="button" className="btn" onClick={() => toggleItem(it.id, !it.active)}>
                {it.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
