export const metadata = {
  title: 'Política de Privacidad | ManosYA',
};

export default function PrivacyPage() {
  const lastUpdate = '27/01/2026';

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs text-white/60">ManosYA v1.0 Beta</p>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2">Política de Privacidad</h1>
          <p className="text-sm text-white/70 mt-2">
            Última actualización: <span className="font-semibold">{lastUpdate}</span>
          </p>
        </div>

        <section className="space-y-6 text-sm leading-6 text-white/80">
          <p>
            Esta Política describe cómo <b>ManosYA</b> recopila, usa y protege información personal cuando usás la Plataforma,
            incluyendo el proceso de <b>Gestión 360</b> para choferes/taxistas y otros proveedores.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">1. Datos que recopilamos</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li><b>Cuenta:</b> nombre, teléfono, foto de perfil (si la subís), y datos básicos del perfil.</li>
              <li><b>Ubicación:</b> si autorizás GPS, podemos guardar tu última ubicación para mapas y asignación.</li>
              <li><b>Documentación (Gestión 360):</b> archivos que subas (licencia, registro, seguro, antecedentes, etc.).</li>
              <li><b>Uso:</b> eventos técnicos (logs), dispositivo/navegador, y actividad para mejorar seguridad y rendimiento.</li>
              <li><b>Comunicaciones:</b> mensajes dentro de la app (si existe chat) para operación y soporte.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">2. Para qué usamos los datos</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Crear y administrar tu cuenta.</li>
              <li>Mostrar tu perfil en la Plataforma (según tu rol y configuraciones).</li>
              <li>Habilitar funciones de mapa/ubicación (ej. choferes disponibles).</li>
              <li>Verificar identidad y documentación (Gestión 360) para seguridad y confianza.</li>
              <li>Prevenir fraude, abuso y actividades sospechosas.</li>
              <li>Mejorar el servicio, soporte y experiencia de usuario.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">3. Compartición de datos</h2>
            <p className="mt-3">
              No vendemos tus datos. Podemos compartir información en estos casos:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li><b>Entre Usuarios:</b> se muestra info necesaria para concretar el servicio (ej. nombre, foto, ciudad, reputación).</li>
              <li><b>Proveedores técnicos:</b> infraestructura (ej. almacenamiento y base de datos) para operar la app.</li>
              <li><b>Obligación legal:</b> si una autoridad competente lo requiere conforme a la ley.</li>
              <li><b>Seguridad:</b> para investigar fraude, suplantación o amenazas a la comunidad.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">4. Documentos y verificación (Gestión 360)</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Los documentos subidos se usan para verificación, seguridad, reputación y prevención de fraude.</li>
              <li>Podemos marcar tu estado como “Pendiente”, “En verificación” o “Verificado”, según completitud.</li>
              <li>Podemos solicitar actualización si un documento venció o es ilegible.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">5. Retención</h2>
            <p className="mt-3">
              Conservamos datos mientras tu cuenta esté activa o mientras sea necesario para operar y cumplir obligaciones.
              En Beta, los períodos pueden ajustarse según necesidades técnicas y de seguridad.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">6. Seguridad</h2>
            <p className="mt-3">
              Aplicamos medidas técnicas y organizativas razonables para proteger datos. Aun así, ningún sistema es 100% invulnerable.
              Recomendamos no compartir tu contraseña y activar buenas prácticas de seguridad.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">7. Tus derechos y controles</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Podés actualizar tu perfil y documentos desde la app (si está habilitado).</li>
              <li>Podés solicitar acceso, corrección o eliminación de ciertos datos, sujeto a limitaciones legales y de seguridad.</li>
              <li>Podés revocar permisos de ubicación desde tu dispositivo (algunas funciones pueden dejar de operar).</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">8. Cambios a esta política</h2>
            <p className="mt-3">
              Podemos actualizar esta Política. Publicaremos la versión vigente en esta página y/o lo indicaremos en la app.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">9. Contacto</h2>
            <p className="mt-3">
              Privacidad/Soporte: <span className="font-semibold">[poné acá tu email o WhatsApp oficial]</span>
            </p>
          </div>

          <p className="text-xs text-white/50">
            Documento informativo para Beta. Para producción, se recomienda revisión legal adaptada a tu operación en Paraguay.
          </p>
        </section>
      </div>
    </main>
  );
}
