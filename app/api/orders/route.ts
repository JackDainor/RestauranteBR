import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ensureSchema, getSql } from '@/lib/db';
export const runtime = 'nodejs';
type Line = {id:string; quantity:number};
export async function POST(req: NextRequest) {
 try {
  await ensureSchema(); const body = await req.json();
  const name=String(body.name||'').trim().slice(0,100), whatsapp=String(body.whatsapp||'').replace(/[^\d+]/g,'').slice(0,20), address=String(body.address||'').trim().slice(0,300);
  const fulfillment=body.fulfillment==='retirada'?'retirada':'delivery';
  const payment=String(body.paymentMethod||''); const allowed=['pix','pix_key','credit_card','debit_card'];
  const lines:Line[]=Array.isArray(body.items)?body.items:[];
  if(name.length<2||whatsapp.replace(/\D/g,'').length<8) return NextResponse.json({error:'Informe nome e WhatsApp válidos.'},{status:400});
  if(fulfillment==='delivery'&&address.length<5) return NextResponse.json({error:'Informe o endereço completo para entrega.'},{status:400});
  if(!allowed.includes(payment)) return NextResponse.json({error:'Selecione um método de pagamento.'},{status:400});
  if(!lines.length||lines.length>40) return NextResponse.json({error:'Carrinho vazio ou inválido.'},{status:400});
  const sql=getSql(); const ids=[...new Set(lines.map(x=>String(x.id)))];
  const products=await sql`SELECT id,name,price::float AS price,available FROM menu_items WHERE id = ANY(${ids})`;
  const normalized=lines.map(line=>{const p=products.find((x:any)=>x.id===line.id);const q=Math.floor(Number(line.quantity));if(!p||!p.available||!Number.isFinite(q)||q<1||q>50)throw new Error('Um produto não está disponível ou a quantidade é inválida.');return {id:p.id,name:p.name,price:Number(p.price),quantity:q,lineTotal:Number(p.price)*q};});
  const subtotal=normalized.reduce((s,x)=>s+x.lineTotal,0);const fee=fulfillment==='delivery'?Math.max(0,Number(process.env.NEXT_PUBLIC_DELIVERY_FEE||5)):0;const total=Number((subtotal+fee).toFixed(2));
  const cust=await sql`INSERT INTO customers(name,whatsapp,address,updated_at) VALUES (${name},${whatsapp},${address},NOW()) ON CONFLICT (whatsapp) DO UPDATE SET name=EXCLUDED.name,address=EXCLUDED.address,updated_at=NOW() RETURNING id`;
  const id=randomUUID(); const pixKey=payment==='pix_key'?(process.env.NEXT_PUBLIC_PIX_KEY||''):'';
  await sql`INSERT INTO orders(id,customer_id,customer_name,whatsapp,address,fulfillment,payment_method,pix_key,items,subtotal,delivery_fee,total,status) VALUES (${id},${cust[0].id},${name},${whatsapp},${address},${fulfillment},${payment},${pixKey},${JSON.stringify(normalized)},${subtotal},${fee},${total},'Recebido')`;
  return NextResponse.json({order:{id,name,total,status:'Recebido',paymentMethod:payment,pixKey,items:normalized,fulfillment},message:'Pedido registrado. O pagamento ainda não foi processado.'},{status:201});
 } catch(e) { console.error('order POST',e);return NextResponse.json({error:e instanceof Error?e.message:'Não foi possível registrar o pedido.'},{status:400}); }
}
