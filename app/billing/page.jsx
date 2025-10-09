'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function cents(n){ return (n/100).toFixed(2); }

export default function Billing() {
  const [wallet, setWallet] = useState(null);
  const [subs, setSubs] = useState(null);
  const [tx, setTx] = useState([]);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href='/login'; return; }
    const { data: w } = await supabase.from('wallets').select('*').eq('user_id', user.id).maybeSingle();
    const { data: s } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();
    const { data: t } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setWallet(w); setSubs(s); setTx(t??[]);
  }

  useEffect(()=>{ load(); },[]);

  async function pay() {
    setBusy(true); setErr(null);
    const idem = 'sub_' + Date.now().toString(36);
    const { error } = await supabase.rpc('pay_subscription', { plan_slug: 'worker_basic', idempotency_key: idem });
    setBusy(false);
    if (error) setErr(error.message); else load();
  }

  return (
    <div className="max-w-2xl mx-auto card">
      <h1>Billetera y suscripción</h1>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-sm opacity-75">Saldo</div>
          <div className="text-3xl font-extrabold">${wallet ? cents(wallet.balance_cents) : '0.00'}</div>
        </div>
        <div className="bg-black/20 rounded-xl p-3">
          <div className="text-sm opacity-75">Suscripción</div>
          <div className="font-bold">{subs?.status ?? 'sin suscripción'}</div>
          {subs?.current_period_end && <div className="text-xs opacity-75">Vence: {new Date(subs.current_period_end).toLocaleString()}</div>}
        </div>
      </div>
      <div className="mt-3">
        <button className="btn" onClick={pay} disabled={busy}>{busy?'Procesando...':'Pagar $3.50 (Worker Basic)'}</button>
        {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
      </div>
      <div className="mt-5">
        <h2>Movimientos</h2>
        <div className="mt-2 space-y-2">
          {tx.map(r => (
            <div key={r.id} className="bg-black/20 rounded-xl p-3 flex justify-between">
              <div>
                <div className="font-bold">{r.type}</div>
                <div className="text-xs opacity-75">{new Date(r.created_at).toLocaleString()}</div>
                {r.note && <div className="text-xs opacity-75">{r.note}</div>}
              </div>
              <div className={`font-bold ${r.amount_cents>=0?'text-green-300':'text-red-300'}`}>
                {r.amount_cents>=0?'+':'-'}${cents(Math.abs(r.amount_cents))}
              </div>
            </div>
          ))}
          {tx.length===0 && <div className="text-sm opacity-75">Sin movimientos.</div>}
        </div>
      </div>
    </div>
  );
}