'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Category = { id: number; name: string };
type Item = {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
};
type CartLine = { id: number; name: string; price: number; qty: number };
type Customer = {
  name: string;
  whatsapp: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
};

type Step = 'menu' | 'cart' | 'data' | 'confirm' | 'done';

export default function Home() {
  const [restaurant, setRestaurant] = useState('Delivery');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [catId, setCatId] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [step, setStep] = useState<Step>('menu');
  const [deliveryFee, setDeliveryFee] = useState(6);
  const [minOrder, setMinOrder] = useState(20);
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [pixQrUrl, setPixQrUrl] = useState<string | null>(null);

  const [waLookup, setWaLookup] = useState('');
  const [customer, setCustomer] = useState<Customer>({
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
  const [knownCustomer, setKnownCustomer] = useState(false);
  const [editAddress, setEditAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash'>('pix');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    orderNumber: number;
    total: number;
    waLink?: string;
  } | null>(null);

  const loadMenu = useCallback(async () => {
    const r = await fetch('/api/menu');
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Erro cardápio');
    setRestaurant(d.restaurant || 'Delivery');
    setCategories(d.categories || []);
    setItems(d.items || []);
    setDeliveryFee(Number(d.deliveryFee) || 6);
    setMinOrder(Number(d.minOrder) || 20);
    setPixKey(d.pixKey);
    setPixQrUrl(d.pixQrUrl);
  }, []);

  useEffect(() => {
    loadMenu().catch((e) => setError(e.message));
  }, [loadMenu]);

  const filtered = useMemo(
    () => (catId === 'all' ? items : items.filter((i) => i.category_id === catId)),
    [items, catId]
  );

  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const total = subtotal + (cart.length ? deliveryFee : 0);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  function addItem(item: Item) {
    setCart((prev) => {
      const f = prev.find((x) => x.id === item.id);
      if (f) return prev.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: x.qty + delta } : x))
        .filter((x) => x.qty > 0)
    );
  }

  function addressText(c: Customer) {
    const parts = [
      c.street && c.number ? `${c.street}, ${c.number}` : c.street,
      c.complement,
      c.neighborhood,
      c.city && c.state ? `${c.city} - ${c.state}` : c.city,
      c.cep ? `CEP ${c.cep}` : '',
      c.reference ? `Ref: ${c.reference}` : '',
    ].filter(Boolean);
    return parts.join(' · ');
  }

  async function lookupCustomer() {
    setError('');
    const wa = waLookup.replace(/\D/g, '');
    if (wa.length < 10) {
      setError('Informe um WhatsApp válido com DDD');
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
        setKnownCustomer(true);
        setEditAddress(false);
      } else {
        setCustomer((c) => ({ ...c, whatsapp: wa }));
        setKnownCustomer(false);
        setEditAddress(true);
      }
      setStep('data');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAndContinue() {
    setError('');
    if (!customer.name.trim() || customer.whatsapp.replace(/\D/g, '').length < 10) {
      setError('Nome e WhatsApp obrigatórios');
      return;
    }
    if (!customer.street?.trim() || !customer.number?.trim()) {
      setError('Rua e número são obrigatórios');
      return;
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
      setKnownCustomer(true);
      setEditAddress(false);
      setStep('confirm');
    } catch (e: any) {
      setError(e.message);
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
    setBusy(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          addressText: addressText(customer),
          items: cart,
          paymentMethod,
          notes,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || 'Erro ao pedir');
      setDone({
        orderNumber: d.order.orderNumber,
        total: d.order.total,
        waLink: d.customerWhatsAppLink,
      });
      setCart([]);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">
          {restaurant} <span>Delivery</span>
        </div>
        <a className="btn" href="/admin">
          Admin
        </a>
      </nav>

      {error && <div className="alert error">{error}</div>}

      {step === 'menu' && (
        <>
          <p className="muted">Cardápio · Taxa de entrega R$ {deliveryFee.toFixed(2)} · Mín. R$ {minOrder.toFixed(2)}</p>
          <div className="chips">
            <button type="button" className={`chip ${catId === 'all' ? 'active' : ''}`} onClick={() => setCatId('all')}>
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${catId === c.id ? 'active' : ''}`}
                onClick={() => setCatId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="menu-list">
            {filtered.map((item) => (
              <div key={item.id} className="menu-item">
                <div>
                  <h3>{item.name}</h3>
                  {item.description && <p>{item.description}</p>}
                  <div className="price">R$ {Number(item.price).toFixed(2)}</div>
                </div>
                <button type="button" className="btn primary" onClick={() => addItem(item)}>
                  +
                </button>
              </div>
            ))}
          </div>
          {cartCount > 0 && (
            <div className="cart-bar">
              <div className="cart-inner">
                <span>
                  {cartCount} itens · R$ {subtotal.toFixed(2)}
                </span>
                <button type="button" className="btn primary" onClick={() => setStep('cart')}>
                  Ver carrinho
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'cart' && (
        <div className="panel">
          <h2>Carrinho</h2>
          {cart.map((l) => (
            <div key={l.id} className="cart-line">
              <span>
                {l.name} × {l.qty}
              </span>
              <span>
                <button type="button" className="btn" onClick={() => changeQty(l.id, -1)}>
                  −
                </button>{' '}
                <button type="button" className="btn" onClick={() => changeQty(l.id, 1)}>
                  +
                </button>{' '}
                R$ {(l.qty * l.price).toFixed(2)}
              </span>
            </div>
          ))}
          <p className="muted">Subtotal R$ {subtotal.toFixed(2)} + entrega R$ {deliveryFee.toFixed(2)}</p>
          <strong>Total R$ {total.toFixed(2)}</strong>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn" onClick={() => setStep('menu')}>
              Continuar comprando
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!cart.length}
              onClick={() => setStep('data')}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 'data' && (
        <div className="panel">
          <h2>Seus dados</h2>
          <p className="muted">Salvamos seu endereço para a próxima vez (pelo WhatsApp).</p>
          <label>
            WhatsApp (com DDD)
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                value={waLookup || customer.whatsapp}
                onChange={(e) => {
                  setWaLookup(e.target.value);
                  setCustomer((c) => ({ ...c, whatsapp: e.target.value }));
                }}
                placeholder="11999999999"
              />
              <button type="button" className="btn" disabled={busy} onClick={lookupCustomer}>
                Buscar
              </button>
            </div>
          </label>

          {knownCustomer && !editAddress && (
            <div className="alert success">
              Olá, <strong>{customer.name}</strong>!
              <br />
              Endereço salvo: {addressText(customer)}
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                <button type="button" className="btn primary" onClick={() => setStep('confirm')}>
                  Confirmar endereço
                </button>
                <button type="button" className="btn" onClick={() => setEditAddress(true)}>
                  Editar
                </button>
              </div>
            </div>
          )}

          {(editAddress || !knownCustomer) && (
            <>
              <label>
                Nome
                <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </label>
              <div className="row2">
                <label>
                  CEP
                  <input value={customer.cep} onChange={(e) => setCustomer({ ...customer, cep: e.target.value })} />
                </label>
                <label>
                  Número
                  <input value={customer.number} onChange={(e) => setCustomer({ ...customer, number: e.target.value })} />
                </label>
              </div>
              <label>
                Rua
                <input value={customer.street} onChange={(e) => setCustomer({ ...customer, street: e.target.value })} />
              </label>
              <label>
                Complemento
                <input value={customer.complement} onChange={(e) => setCustomer({ ...customer, complement: e.target.value })} />
              </label>
              <div className="row2">
                <label>
                  Bairro
                  <input value={customer.neighborhood} onChange={(e) => setCustomer({ ...customer, neighborhood: e.target.value })} />
                </label>
                <label>
                  Cidade
                  <input value={customer.city} onChange={(e) => setCustomer({ ...customer, city: e.target.value })} />
                </label>
              </div>
              <div className="row2">
                <label>
                  UF
                  <input value={customer.state} onChange={(e) => setCustomer({ ...customer, state: e.target.value })} maxLength={2} />
                </label>
                <label>
                  Referência
                  <input value={customer.reference} onChange={(e) => setCustomer({ ...customer, reference: e.target.value })} />
                </label>
              </div>
              <button type="button" className="btn primary" disabled={busy} onClick={saveAndContinue}>
                Salvar e continuar
              </button>
            </>
          )}
          <button type="button" className="btn" style={{ marginTop: '0.5rem' }} onClick={() => setStep('cart')}>
            Voltar
          </button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="panel">
          <h2>Confirmar pedido</h2>
          <p>
            <strong>{customer.name}</strong> · {customer.whatsapp}
          </p>
          <p className="muted">{addressText(customer)}</p>
          {cart.map((l) => (
            <div key={l.id} className="cart-line">
              <span>
                {l.qty}x {l.name}
              </span>
              <span>R$ {(l.qty * l.price).toFixed(2)}</span>
            </div>
          ))}
          <p>Entrega: R$ {deliveryFee.toFixed(2)}</p>
          <strong>Total: R$ {total.toFixed(2)}</strong>
          <label>
            Pagamento
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'pix' | 'cash')}>
              <option value="pix">Pix</option>
              <option value="cash">Dinheiro na entrega</option>
            </select>
          </label>
          <label>
            Observações
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Sem cebola, etc." />
          </label>
          <button type="button" className="btn primary" disabled={busy} onClick={placeOrder}>
            {busy ? 'Enviando…' : 'Fazer pedido'}
          </button>
          <button type="button" className="btn" onClick={() => setStep('data')}>
            Voltar
          </button>
        </div>
      )}

      {step === 'done' && done && (
        <div className="panel">
          <h2>Pedido #{done.orderNumber} recebido!</h2>
          <p>
            Total <strong>R$ {Number(done.total).toFixed(2)}</strong>
          </p>
          {paymentMethod === 'pix' && (
            <div>
              <p className="muted">Pague com Pix:</p>
              {pixQrUrl && <img src={pixQrUrl} alt="QR Pix" style={{ maxWidth: 220, borderRadius: 12 }} />}
              {pixKey && (
                <p>
                  Chave: <strong>{pixKey}</strong>
                </p>
              )}
            </div>
          )}
          <p className="muted">Acompanhe pelo WhatsApp. Você receberá atualizações do status.</p>
          {done.waLink && (
            <a className="btn primary" href={done.waLink} target="_blank" rel="noreferrer">
              Abrir resumo no WhatsApp
            </a>
          )}
          <button
            type="button"
            className="btn"
            style={{ marginTop: '0.5rem' }}
            onClick={() => {
              setDone(null);
              setStep('menu');
            }}
          >
            Novo pedido
          </button>
        </div>
      )}
    </main>
  );
}
