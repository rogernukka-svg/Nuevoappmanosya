'use client';
import RequireAdminOrCashier from '@/components/RequireAdminOrCashier';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';

const supabase = getSupabase();

export default function CashierPage() {
  return (
    <RequireAdminOrCashier>
      <Panel />
    </RequireAdminOrCashier>
  );
}

function Panel() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(1000);
  const [note, setNote] = useState('');
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  // 💵 Acreditar saldo
  async function credit(e) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const idem = 'cash_' + Date.now().toString(36);

    const { error } = await supabase.rpc('cashier_credit_by_email', {
      target_email: email,
      amount_cents: Number(amount),
      note,
      idempotency_key: idem,
    });

    if (error) setErr(error.message);
    else setMsg('✅ Crédito aplicado correctamente.');
  }

  // 👤 Administración de cajeros
  const [admEmail, setAdmEmail] = useState('');
  const [admMsg, setAdmMsg] = useState(null);

  async function makeCashier(make) {
    setAdmMsg(null);
    setErr(null);

    const { error } = await supabase.rpc('admin_set_cashier', {
      email: admEmail,
      make_cashier: make,
    });

    if (error) setErr(error.message);
    else setAdmMsg('✅ Estado de cajero actualizado.');
  }

  return (
    <div className="max-w-xl mx-auto card text-white">
      <h1 className="text-2xl font-bold mb-4 text-emerald-400">Panel de Cajero</h1>

      {/* 💰 Acreditar saldo */}
      <form onSubmit={credit} className="space-y-3 mt-3">
        <div>
          <label className="text-sm text-gray-300">Email del usuario</label>
          <input
            className="w-full rounded-lg p-2 mt-1 text-black"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-300">Monto (centavos USD)</label>
          <input
            className="w-full rounded-lg p-2 mt-1 text-black"
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-gray-300">Nota</label>
          <input
            className="w-full rounded-lg p-2 mt-1 text-black"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {err && <div className="text-red-400 text-sm">{err}</div>}
        {msg && <div className="text-green-400 text-sm">{msg}</div>}

        <button
          className="btn w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 mt-2"
          type="submit"
        >
          💸 Acreditar
        </button>
      </form>

      {/* 👤 Administración de Cajeros */}
      <div className="mt-8 border-t border-white/10 pt-4">
        <h2 className="text-lg font-semibold text-emerald-400">
          Administración (asignar cajeros)
        </h2>

        <div className="mt-3">
          <label className="text-sm text-gray-300">Email</label>
          <input
            className="w-full rounded-lg p-2 mt-1 text-black"
            value={admEmail}
            onChange={(e) => setAdmEmail(e.target.value)}
          />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            className="btn flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2"
            onClick={() => makeCashier(true)}
            type="button"
          >
            ✅ Hacer Cajero
          </button>

          <button
            className="btn flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-2"
            onClick={() => makeCashier(false)}
            type="button"
          >
            ❌ Quitar Cajero
          </button>
        </div>

        {admMsg && (
          <div className="text-green-400 text-sm mt-2">{admMsg}</div>
        )}
      </div>
    </div>
  );
}
