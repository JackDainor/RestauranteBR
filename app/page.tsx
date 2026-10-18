'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Cat = { id: number; name: string };
type Item = {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
  sold_out?: boolean;
};
type CartLine = { id: number; name: string; price: number; qty: number };
type Customer = {
  name: string;
  whatsapp: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
};
type Step = 'menu' | 'cart' | 'checkout' | 'done';

const emptyCustomer = (): Customer => ({
  name: '',
  whatsapp: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  reference: '',
});

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [restaurant, setRestaurant] = useState('Sabor & Fogo');
  const [categories, setCategories] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [catId, setCatId] = useState<number | 'all'>('all');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [step, setStep] = useState<Step>('menu');
  const [deliveryFee, setDeliveryFee] = useState(8);
  const [minOrder, setMinOrder] = useState(25);
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [pixQrUrl, setPixQrUrl] = useState<string | null>(null);
  const [cardNote, setCardNote] = useState('Cartão na entrega');

  const [customer, setCustomer] = useState<Customer>(emptyCustomer());
  const [known, setKnown] = useState(false);
  const [editAddr, setEditAddr] = useState(true);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('delivery');
  const [payment, setPayment] = useState<'pix' | 'card' | 'cash'>('pix');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ n: number; total: number; wa?: string } | null>(null);

  useEffect(() => {
    try {
      const t = (localStorage.getItem('rest_theme') as 'light' | 'dark') || 'light';
      setTheme(t);
      document.documentElement.setAttribute('data-theme', t);
    } catch {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('rest_theme', next);
    } catch { /* */ }
  }

  const loadMenu = useCallback(async () => {
    const r = await fetch('/api/menu');
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Erro ao carregar');
    setRestaurant(d.restaurant || 'Sabor & Fogo');
    setCategories(d.categories || []);
    setItems(d.items || []);
    setDeliveryFee(Number(d.deliveryFee) || 8);
    setMinOrder(Number(d.minOrder) || 25);
    setPixKey(d.pixKey);
    setPixQrUrl(d.pixQrUrl);
    setCardNote(d.cardNote || 'Cartão na entrega');
  }, []);

  useEffect(() => {
    loadMenu().catch((e) => setError(e.message));
  }, [loadMenu]);

  const filtered = useMemo(() => {
    let list = items;
    if (catId !== 'all') list = list.filter((i) => i.category_id === catId);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(s) || (i.description || '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [items, catId, q]);

  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const fee = fulfillment === 'delivery' && cart.length ? deliveryFee : 0;
  const total = subtotal + fee;
  const count = cart.reduce((s, l) => s + l.qty, 0);

  function add(item: Item) {
    if (item.sold_out) return;
    setCart((prev) => {
      const f = prev.find((x) => x.id === item.id);
      if (f) return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function qty(id: number, d: number) {
    setCart((prev) => prev.map((x) => (x.id === id ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0));
  }

  function addr(c: Customer) {
    return [
      c.street && c.number ? `${c.street}, ${c.number}` : c.street,
      c.complement,
      c.neighborhood,
      c.city && c.state ? `${c.city}-${c.state}` : c.city,
      c.cep ? `CEP ${c.cep}` : '',
      c.reference ? `Ref: ${c.reference}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
  }

  async function lookupWa() {
    setError('');
    const wa = customer.whatsapp.replace(/\D/g, '');
    if (wa.length < 10) {
      setError('WhatsApp com DDD inválido');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/customer?whatsapp=${wa}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.customer) {
        setCustomer({
          name: d.customer.name || '',
          whatsapp: d.customer.whatsapp || wa,
          cep: d.customer.cep || '',
          street: d.customer.street || '',
          number: d.customer.number || '',
          complement: d.customer.complement || '',
          neighborhood: d.customer.neighborhood || '',
          city: d.customer.city || '',
          state: d.customer.state || 'SP',
          reference: d.customer.reference || '',
        });
        setKnown(true);
        setEditAddr(false);
      } else {
        setKnown(false);
        setEditAddr(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveCustomer() {
    setError('');
    if (!customer.name.trim() || customer.whatsapp.replace(/\D/g, '').length < 10) {
      setError('Nome e WhatsApp obrigatórios');
      return false;
    }
    if (fulfillment === 'delivery' && (!customer.street.trim() || !customer.number.trim())) {
      setError('Rua e número obrigatórios para delivery');
      return false;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setKnown(true);
      setEditAddr(false);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder() {
    setError('');
    if (subtotal < minOrder) {
      setError(`Pedido mínimo R$ ${minOrder.toFixed(2)}`);
      return;
    }
    if (editAddr || !known) {
      const ok = await saveCustomer();
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          addressText: fulfillment === 'delivery' ? addr(customer) : '',
          fulfillment,
          items: cart,
          paymentMethod: payment,
          notes,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Erro');
      setDone({ n: d.order.orderNumber, total: d.order.total, wa: d.customerWhatsAppLink });
      setCart([]);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div className="wrap">
        <nav className="nav">
          <div className="brand">
            <div className="brand-icon">S</div>
            <div>
              {restaurant}
              <small>DELIVERY · RETIRADA</small>
            </div>
          </div>
          <div className="nav-actions">
            <button type="button" className="theme-btn" onClick={toggleTheme} title="Tema">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button type="button" className="nav-cart" onClick={() => setStep(count ? 'cart' : 'menu')}>
              Carrinho <b>{count}</b>
            </button>
          </div>
        </nav>

        {step === 'menu' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">CARDÁPIO QUENTE</div>
                <h1>
                  Pique macho,
                  <br />
                  frango e <em>sabor</em>
                </h1>
                <p>
                  Pollo al spiedo, broaster, ao forno e bebidas geladas. Peça delivery ou retire no balcão —
                  guardamos seu endereço pelo WhatsApp.
                </p>
                <button type="button" className="primary" onClick={() => document.getElementById('cardapio')?.scrollIntoView({ behavior: 'smooth' })}>
                  Ver cardápio <span>→</span>
                </button>
              </div>
              <div className="hero-art" aria-hidden>
                <div className="sun" />
                <div className="floating float-a">🌭</div>
                <div className="floating float-b">🍟</div>
                <div className="floating float-c">🥚</div>
                <div className="floating float-d">🌶️</div>
                <div className="plate">
                  <div className="plate-inner">🍲</div>
                </div>
                <div className="art-label">Pique macho</div>
              </div>
            </section>

            <section className="section" id="cardapio">
              <div className="section-head">
                <div>
                  <div className="eyebrow" style={{ color: 'var(--green)' }}>
                    MENU
                  </div>
                  <h2>Escolha seu prato</h2>
                </div>
                <p>Taxa delivery R$ {deliveryFee.toFixed(2)} · Mínimo R$ {minOrder.toFixed(2)}</p>
              </div>

              {error && <div className="alert error">{error}</div>}

              <div className="search-row">
                <input placeholder="Buscar: pique, pollo, coca…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="chips">
                <button type="button" className={`chip ${catId === 'all' ? 'active' : ''}`} onClick={() => setCatId('all')}>
                  Todos
                </button>
                {categories.map((c) => (
                  <button key={c.id} type="button" className={`chip ${catId === c.id ? 'active' : ''}`} onClick={() => setCatId(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="grid">
                {filtered.map((item) => (
                  <article key={item.id} className={`card ${item.sold_out ? 'sold' : ''}`}>
                    {item.sold_out && <span className="badge-out">ESGOTADO</span>}
                    <h3>{item.name}</h3>
                    {item.description && <p className="desc">{item.description}</p>}
                    <div className="card-foot">
                      <span className="price">R$ {Number(item.price).toFixed(2)}</span>
                      <button type="button" className="primary" disabled={!!item.sold_out} onClick={() => add(item)} style={{ padding: '10px 14px' }}>
                        +
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {step === 'cart' && (
          <div className="cart-panel">
            <h2>Carrinho</h2>
            {cart.map((l) => (
              <div key={l.id} className="line">
                <span>
                  {l.name} × {l.qty}
                </span>
                <span>
                  <button type="button" className="btn" onClick={() => qty(l.id, -1)}>−</button>{' '}
                  <button type="button" className="btn" onClick={() => qty(l.id, 1)}>+</button>{' '}
                  R$ {(l.qty * l.price).toFixed(2)}
                </span>
              </div>
            ))}
            <p className="muted">Subtotal R$ {subtotal.toFixed(2)}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={() => setStep('menu')}>Continuar</button>
              <button type="button" className="primary" disabled={!cart.length} onClick={() => setStep('checkout')}>
                Finalizar →
              </button>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="sheet">
            <div className="eyebrow" style={{ color: 'var(--green)' }}>CHECKOUT</div>
            <h2>Seus dados</h2>
            {error && <div className="alert error">{error}</div>}

            <div className="mode-row">
              <button type="button" className={`mode-btn ${fulfillment === 'delivery' ? 'active' : ''}`} onClick={() => setFulfillment('delivery')}>
                🚚 Delivery
                <small>+ R$ {deliveryFee.toFixed(2)}</small>
              </button>
              <button type="button" className={`mode-btn ${fulfillment === 'pickup' ? 'active' : ''}`} onClick={() => setFulfillment('pickup')}>
                🏍 Retirada
                <small>Sem taxa</small>
              </button>
            </div>

            <label>
              WhatsApp (DDD)
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={customer.whatsapp} onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })} placeholder="11999999999" />
                <button type="button" className="btn" disabled={busy} onClick={lookupWa}>Buscar</button>
              </div>
            </label>

            {known && !editAddr && (
              <div className="alert ok">
                Olá, <strong>{customer.name}</strong>
                {fulfillment === 'delivery' && (
                  <>
                    <br />
                    {addr(customer)}
                  </>
                )}
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn" onClick={() => setEditAddr(true)}>Editar</button>
                </div>
              </div>
            )}

            {(editAddr || !known) && (
              <>
                <label>
                  Nome
                  <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                </label>
                {fulfillment === 'delivery' && (
                  <>
                    <div className="row2">
                      <label>CEP<input value={customer.cep} onChange={(e) => setCustomer({ ...customer, cep: e.target.value })} /></label>
                      <label>Número<input value={customer.number} onChange={(e) => setCustomer({ ...customer, number: e.target.value })} /></label>
                    </div>
                    <label>Rua<input value={customer.street} onChange={(e) => setCustomer({ ...customer, street: e.target.value })} /></label>
                    <label>Complemento<input value={customer.complement} onChange={(e) => setCustomer({ ...customer, complement: e.target.value })} /></label>
                    <div className="row2">
                      <label>Bairro<input value={customer.neighborhood} onChange={(e) => setCustomer({ ...customer, neighborhood: e.target.value })} /></label>
                      <label>Cidade<input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} /></label>
                    </div>
                    <div className="row2">
                      <label>UF<input value={customer.state} maxLength={2} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} /></label>
                      <label>Referência<input value={customer.reference} onChange={(e) => setCustomer({ ...customer, reference: e.target.value })} /></label>
                    </div>
                  </>
                )}
              </>
            )}

            <label>
              Pagamento
              <select value={payment} onChange={(e) => setPayment(e.target.value as any)}>
                <option value="pix">PIX / Chave PIX</option>
                <option value="card">Cartão crédito ou débito</option>
                <option value="cash">Dinheiro</option>
              </select>
            </label>
            {payment === 'card' && <p className="muted">{cardNote}</p>}
            <label>
              Observações
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sem cebola, troco…" />
            </label>

            <div className="line"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
            <div className="line"><span>{fulfillment === 'delivery' ? 'Entrega' : 'Retirada'}</span><span>R$ {fee.toFixed(2)}</span></div>
            <div className="line"><strong>Total</strong><strong>R$ {total.toFixed(2)}</strong></div>

            <button type="button" className="primary" style={{ width: '100%', marginTop: 12, justify: 'flex' }} disabled={busy} onClick={placeOrder}>
              {busy ? 'Enviando…' : 'Confirmar pedido →'}
            </button>
            <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => setStep('cart')}>Voltar</button>
          </div>
        )}

        {step === 'done' && done && (
          <div className="sheet">
            <h2>Pedido #{done.n} recebido</h2>
            <p>Total <strong>R$ {Number(done.total).toFixed(2)}</strong></p>
            {payment === 'pix' && (
              <div>
                <p className="muted">Pague com Pix:</p>
                {pixQrUrl && <img src={pixQrUrl} alt="QR Pix" style={{ maxWidth: 200, borderRadius: 12 }} />}
                {pixKey && <p>Chave: <strong>{pixKey}</strong></p>}
              </div>
            )}
            <p className="muted">
              {fulfillment === 'pickup'
                ? 'Avisaremos no WhatsApp quando estiver pronto para retirar.'
                : 'Acompanhe o status pelo WhatsApp.'}
            </p>
            {done.wa && (
              <a className="primary" href={done.wa} target="_blank" rel="noreferrer" style={{ display: 'inline-flex' }}>
                Abrir WhatsApp
              </a>
            )}
            <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => { setDone(null); setStep('menu'); }}>
              Novo pedido
            </button>
          </div>
        )}

        <footer className="footer">
          <span>© {new Date().getFullYear()} {restaurant}</span>
          <a href="/admin">Área do restaurante ↗</a>
        </footer>
      </div>
    </main>
  );
}
