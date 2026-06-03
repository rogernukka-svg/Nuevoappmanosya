'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Home } from 'lucide-react';

export default function ClientError({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    console.error('client route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f8fafc] px-5 text-slate-900">
      <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#dff7f5] text-[#0c6b70]">
          <RefreshCw size={22} />
        </div>
        <h1 className="mt-4 text-xl font-black">No pudimos abrir esta pantalla</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          La app se recupero de un error local. Volve a intentar o regresa al inicio.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 active:scale-[0.98]"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => router.replace('/client')}
            className="flex items-center justify-center gap-2 rounded-[18px] bg-[#62bfb9] px-4 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(98,191,185,0.30)] active:scale-[0.98]"
          >
            <Home size={16} />
            Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
