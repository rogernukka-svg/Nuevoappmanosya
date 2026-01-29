export const metadata = {
  title: 'Términos y Condiciones | ManosYA',
};

export default function TermsPage() {
  const lastUpdate = '27/01/2026';

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-xs text-white/60">ManosYA v1.0 Beta</p>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2">Términos y Condiciones</h1>
          <p className="text-sm text-white/70 mt-2">
            Última actualización: <span className="font-semibold">{lastUpdate}</span>
          </p>
        </div>

        <section className="space-y-6 text-sm leading-6 text-white/80">
          <p>
            Estos Términos y Condiciones regulan el uso de la plataforma <b>ManosYA</b> (la “Plataforma”),
            incluyendo el registro, la publicación de solicitudes, la prestación de servicios y/o el uso del modo
            <b> Taxi/Chofer</b>. Al crear una cuenta o usar la Plataforma, aceptás estos términos.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">1. Definiciones</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li><b>Usuario:</b> cualquier persona que use la Plataforma.</li>
              <li><b>Cliente:</b> Usuario que solicita un servicio.</li>
              <li><b>Trabajador/Proveedor:</b> Usuario que ofrece servicios (incluye Chofer/Taxi).</li>
              <li><b>Gestión 360:</b> proceso de documentación, verificación y reputación dentro de ManosYA.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">2. Elegibilidad y cuenta</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Debés proporcionar información real y actualizada (nombre, teléfono y demás datos requeridos).</li>
              <li>Tu cuenta es personal. No compartas tu acceso con terceros.</li>
              <li>Podemos suspender o limitar cuentas ante indicios de fraude, suplantación o incumplimientos.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">3. Uso permitido</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Usar la Plataforma de forma legal, respetuosa y segura.</li>
              <li>No publicar información falsa, contenido ofensivo, ni intentar vulnerar el sistema.</li>
              <li>No usar ManosYA para actividades ilícitas o para evadir obligaciones legales.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">4. Servicio Taxi/Chofer (Gestión 360)</h2>
            <p className="mt-3">
              Para activar el modo Taxi/Chofer, podrás necesitar cargar documentos (por ejemplo: licencia, registro,
              seguro, fotos del vehículo, antecedentes, u otros). Al subirlos:
            </p>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Declarás que los documentos son auténticos y que estás autorizado a usarlos.</li>
              <li>Autorizás verificación razonable para seguridad, prevención de fraude y confianza del ecosistema.</li>
              <li>Entendés que la activación puede depender de completar documentación y validaciones.</li>
              <li>Te comprometés a mantener documentos vigentes y actualizados.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">5. Relación entre Usuarios</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>ManosYA facilita el contacto entre Clientes y Proveedores.</li>
              <li>El servicio se acuerda entre Usuarios (precio, horario, condiciones), salvo donde ManosYA indique lo contrario.</li>
              <li>Recomendamos validar identidad, reputación y mantener comunicación dentro de la Plataforma.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">6. Pagos, comisiones y cancelaciones</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>La Plataforma puede habilitar pagos, comisiones y/o cargos de servicio (según se implemente en la app).</li>
              <li>Las cancelaciones y reembolsos dependen del tipo de servicio y de las reglas visibles en la interfaz.</li>
              <li>En Beta, algunas funciones pueden cambiar sin aviso previo por mejoras y pruebas.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">7. Seguridad, reputación y contenido</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Podemos mostrar calificaciones/reseñas y señales de verificación para mejorar confianza.</li>
              <li>No publiques datos sensibles de terceros sin autorización.</li>
              <li>Podemos moderar contenido o bloquear conductas que afecten a la comunidad.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">8. Limitación de responsabilidad</h2>
            <p className="mt-3">
              ManosYA se ofrece “tal cual”. No garantizamos disponibilidad ininterrumpida ni que el servicio entre Usuarios
              se ejecute sin incidentes. En la medida permitida por ley, ManosYA no se responsabiliza por daños indirectos,
              pérdidas de ganancias o disputas entre Usuarios.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">9. Terminación</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2">
              <li>Podés dejar de usar la Plataforma en cualquier momento.</li>
              <li>Podemos suspender o cerrar cuentas si hay incumplimiento o riesgos para la seguridad.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">10. Cambios</h2>
            <p className="mt-3">
              Podemos actualizar estos términos. Cuando existan cambios relevantes, lo indicaremos en la app o en esta página.
              El uso continuado implica aceptación de la versión vigente.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-base font-extrabold text-white">11. Contacto</h2>
            <p className="mt-3">
              Soporte/Contacto: <span className="font-semibold">[poné acá tu email o WhatsApp oficial]</span>
            </p>
          </div>

          <p className="text-xs text-white/50">
            Documento informativo para Beta. Si necesitás una versión “legal full” para producción, se recomienda revisión con abogado local.
          </p>
        </section>
      </div>
    </main>
  );
}
