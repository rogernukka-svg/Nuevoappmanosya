'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 text-gray-800 font-[var(--font-manrope)]">
      <h1 className="text-3xl font-extrabold mb-6 text-emerald-600">
        Política de Privacidad de ManosYA
      </h1>

      <p className="text-gray-600 mb-4">
        Última actualización: <b>Noviembre 2025</b>
      </p>

      <p className="mb-4 leading-relaxed">
        En <b>ManosYA S.A.</b> (“ManosYA”, “nosotros” o “la plataforma”) valoramos la confianza de
        nuestros usuarios y nos comprometemos a proteger su información personal. Esta Política de
        Privacidad explica cómo recopilamos, usamos, almacenamos y protegemos los datos personales
        de las personas que utilizan nuestra aplicación y nuestros servicios, de conformidad con la{' '}
        <b>Ley N° 6534/20 de Protección de Datos Personales del Paraguay</b> y demás normas
        aplicables.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">1. Responsable del tratamiento</h2>
      <p className="text-gray-700 mb-4">
        El responsable del tratamiento de los datos personales es <b>ManosYA S.A.</b>, con domicilio
        en Ciudad del Este, Paraguay.  
        Para consultas o ejercicio de derechos, podés escribirnos a{' '}
        <a href="mailto:soporte@manosya.com" className="text-emerald-600 underline">
          soporte@manosya.com
        </a>
        .
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">2. Datos personales que recopilamos</h2>
      <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
        <li>Datos de identificación: nombre, apellido, documento, foto de perfil, correo electrónico.</li>
        <li>Datos de contacto: teléfono, dirección o ubicación aproximada (cuando el usuario lo permite).</li>
        <li>Datos de autenticación: credenciales de acceso, tokens de sesión y preferencias de cuenta.</li>
        <li>Datos laborales: oficios, habilidades, años de experiencia, calificaciones y reseñas.</li>
        <li>Datos de ubicación: posición geográfica (solo con consentimiento), usada para mostrar trabajadores o clientes cercanos.</li>
        <li>Documentos de verificación: cédula, pasaporte o antecedentes policiales.</li>
        <li>Datos bancarios: nombre del banco, tipo y número de cuenta, titular y documento.</li>
        <li>Datos técnicos: dirección IP, tipo de dispositivo, sistema operativo y versión del navegador.</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">3. Finalidad del tratamiento</h2>
      <p className="text-gray-700 mb-2">
        Utilizamos tus datos personales con las siguientes finalidades:
      </p>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li>Verificar la identidad y habilitar el perfil profesional o de cliente.</li>
        <li>Permitir la conexión entre usuarios para ofrecer o contratar servicios.</li>
        <li>Mostrar ubicaciones y coincidencias en mapas en tiempo real.</li>
        <li>Procesar pagos, transferencias y comisiones por servicios realizados.</li>
        <li>Cumplir con obligaciones legales, tributarias y de seguridad.</li>
        <li>Enviar notificaciones, alertas o actualizaciones del servicio.</li>
        <li>Mejorar la experiencia de uso, calidad y seguridad de la plataforma.</li>
      </ul>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">4. Base legal del tratamiento</h2>
      <p className="text-gray-700 mb-4">
        El tratamiento de los datos personales se basa en el consentimiento informado del usuario,
        la ejecución del contrato de uso de la plataforma y el cumplimiento de obligaciones legales.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">5. Conservación de los datos</h2>
      <p className="text-gray-700 mb-4">
        Los datos personales se conservarán mientras el usuario mantenga una cuenta activa en
        ManosYA. Si se solicita la eliminación, los datos se conservarán únicamente durante el plazo
        necesario para cumplir con obligaciones legales o resolver disputas.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">6. Almacenamiento y seguridad</h2>
      <p className="text-gray-700 mb-4">
        Los datos se almacenan de forma segura en servidores de <b>Supabase</b>, alojados en la nube
        de <b>Amazon Web Services (AWS)</b> o infraestructura equivalente, aplicando medidas técnicas
        y organizativas adecuadas: cifrado, acceso restringido y registros de auditoría.
      </p>
      <p className="text-gray-700 mb-4">
        ManosYA adopta medidas razonables para prevenir accesos no autorizados, pérdida o
        alteración de los datos. Sin embargo, ningún sistema es completamente seguro, y el usuario
        comprende este riesgo al utilizar servicios digitales.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">7. Transferencias internacionales</h2>
      <p className="text-gray-700 mb-4">
        En algunos casos, tus datos pueden ser procesados por proveedores ubicados fuera del
        Paraguay (por ejemplo, servicios en la nube, correo electrónico o analítica). En todos los
        casos se garantiza un nivel adecuado de protección conforme a los estándares internacionales
        (GDPR y equivalentes regionales).
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">8. Cookies y tecnologías similares</h2>
      <p className="text-gray-700 mb-4">
        ManosYA utiliza cookies y tecnologías de almacenamiento local (PWA) para recordar tu sesión,
        optimizar tiempos de carga y mejorar tu experiencia. Podés gestionar o eliminar las cookies
        desde la configuración de tu navegador.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">9. Derechos del usuario</h2>
      <ul className="list-disc list-inside text-gray-700 space-y-1">
        <li>Acceder a tus datos personales y conocer cómo son tratados.</li>
        <li>Rectificar información incorrecta, incompleta o desactualizada.</li>
        <li>Solicitar la eliminación o anonimización de tus datos personales.</li>
        <li>Retirar tu consentimiento en cualquier momento.</li>
        <li>Oponerte al tratamiento para fines no esenciales.</li>
      </ul>

      <p className="text-gray-700 mt-2 mb-4">
        Para ejercer estos derechos, podés escribir a{' '}
        <a href="mailto:soporte@manosya.com" className="text-emerald-600 underline">
          soporte@manosya.com
        </a>
        , adjuntando una copia de tu documento de identidad.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">10. Modificaciones a esta política</h2>
      <p className="text-gray-700 mb-4">
        ManosYA podrá actualizar esta Política de Privacidad para reflejar cambios legales o
        técnicos. Te notificaremos cualquier cambio relevante mediante la app o por correo
        electrónico. La fecha de “última actualización” indica la versión vigente.
      </p>

      <h2 className="text-xl font-bold mt-8 mb-2 text-emerald-700">11. Aceptación</h2>
      <p className="text-gray-700 mb-4">
        Al crear una cuenta o continuar utilizando la plataforma, el usuario declara haber leído y
        comprendido esta Política de Privacidad, otorgando su consentimiento expreso para el
        tratamiento de sus datos conforme a lo aquí establecido.
      </p>

      <p className="mt-10 text-center text-gray-400 text-sm">
        © {new Date().getFullYear()} ManosYA S.A. — Todos los derechos reservados.
      </p>
    </div>
  );
}
