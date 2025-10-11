'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';

/**
 * 📲 Banner “Instalar ManosYA”
 * Detecta el evento beforeinstallprompt y muestra un popup elegante.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Si ya está instalada, no mostramos nada
    window.addEventListener('appinstalled', () => {
      setVisible(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('✅ Usuario aceptó instalar ManosYA');
    } else {
      console.log('❌ Usuario canceló instalación');
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-5 left-0 right-0 flex justify-center z-[9999]"
        >
          <div className="bg-white shadow-lg rounded-2xl border border-emerald-100 flex items-center gap-4 p-4 w-[90%] max-w-md">
            <img
              src="/icons/icon-192.png"
              alt="ManosYA"
              className="w-12 h-12 rounded-xl border border-emerald-200"
            />
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-sm">
                Instalar <span className="text-emerald-600">ManosYA</span>
              </h3>
              <p className="text-xs text-gray-500">
                Acceso rápido desde tu pantalla de inicio 🚀
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-3 py-2 rounded-xl transition"
            >
              <Download size={16} /> Instalar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
