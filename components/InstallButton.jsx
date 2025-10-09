'use client';

import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detectar iOS
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setIsIos(true);
    }

    // Escuchar evento para Android
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('App instalada ✅');
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      alert(
        "👉 Para instalar en iPhone:\n\n1. Tocá el botón Compartir (⬆️)\n2. Seleccioná 'Agregar a pantalla de inicio'."
      );
    }
  };

  if (isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-24 right-4 bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 text-black font-bold px-5 py-3 rounded-xl shadow-lg hover:opacity-90 transition transform hover:scale-105"
    >
      📲 Instalar
    </button>
  );
}
