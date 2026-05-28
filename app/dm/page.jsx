'use client';

import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export default function DMInboxPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
        <MessageCircle size={26} />
      </div>
      <h1 className="text-2xl font-black text-white">Mensajes directos</h1>
      <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/60">
        Abri una conversacion desde un perfil o desde un trabajo para evitar chats sin destinatario.
      </p>
      <Link href="/role-selector" className="mt-6 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white">
        Volver al inicio
      </Link>
    </main>
  );
}
