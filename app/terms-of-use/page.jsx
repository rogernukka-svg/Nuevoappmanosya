'use client';
import '../globals.css';

export default function TermsOfUsePage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-5 text-gray-700 leading-relaxed">
      <h1 className="text-3xl font-bold text-emerald-600 mb-6 text-center">
        Términos de Uso
      </h1>

      <p className="mb-4 text-gray-600 text-sm text-center">
        Última actualización: Noviembre 2025
      </p>

      <p className="mb-6">
        Bienvenido a <b>ManosYA</b>, una plataforma creada para conectar personas
        que necesitan ayuda con profesionales que pueden ofrecer sus servicios.
        Al usar nuestra aplicación o sitio web, aceptás estos términos de uso de
        manera libre y consciente.
      </p>

      <h2 className="text-xl font-semibold text-emerald-700 mt-8 mb-3">
        1. Sobre el uso de la plataforma
      </h2>
      <p className="mb-4">
        ManosYA ofrece un espacio digital que permite que usuarios y trabajadores
        se conecten de forma rápida, segura y transparente. No somos empleadores
        ni intermediarios laborales: cada profesional trabaja por cuenta propia.
      </p>
      <p className="mb-4">
        El uso de la app implica brindar información veraz, mantener el respeto
        entre usuarios y cumplir con las leyes locales vigentes. Cualquier uso
        indebido, fraudulento o agresivo puede dar lugar a la suspensión de la
        cuenta.
      </p>

      <h2 className="text-xl font-semibold text-emerald-700 mt-8 mb-3">
        2. Cuentas y seguridad
      </h2>
      <p className="mb-4">
        Para registrarte, necesitás un correo electrónico válido. Sos responsable
        de mantener segura tu cuenta y tus credenciales. Si detectás un acceso no
        autorizado, comunicate con nosotros para ayudarte a proteger tu perfil.
      </p>

      <h2 className="text-xl font-semibold text-emerald-700 mt-8 mb-3">
        3. Relación entre usuarios y trabajadores
      </h2>
      <p className="mb-4">
        Los acuerdos entre cliente y trabajador son directos. ManosYA no forma parte
        del contrato ni se hace responsable de pagos, horarios o calidad del servicio,
        aunque siempre trabajamos para mejorar la experiencia y brindar soporte ante
        reclamos o reportes.
      </p>

      <h2 className="text-xl font-semibold text-emerald-700 mt-8 mb-3">
        4. Datos personales
      </h2>
      <p className="mb-4">
        Tu información se maneja con cuidado y solo se usa para hacer posible la
        conexión entre usuarios, mejorar el servicio y garantizar seguridad. Podés
        leer más en nuestra{' '}
        <a
          href="/privacy-policy"
          className="text-emerald-600 hover:text-emerald-700 underline"
        >
          Política de Privacidad
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold text-emerald-700 mt-8 mb-3">
        5. Responsabilidad y comportamiento
      </h2>
      <p className="mb-4">
        Todos los usuarios deben actuar con respeto, honestidad y profesionalismo.
        No se permiten insultos, fraudes ni comportamientos que pongan en riesgo
        la seguridad o la reputación de otras personas dentro de la plataforma.
      </p>

      <h2 className="text-xl font-semibold text-emerald-700 mt-8 mb-3">
        6. Modificaciones
      </h2>
      <p className="mb-4">
        ManosYA puede actualizar estos términos para mejorar el servicio o cumplir
        nuevas normativas. Te avisaremos dentro de la app cuando haya cambios
        importantes. Continuar usando la app después de esos avisos implica aceptar
        las nuevas condiciones.
      </p>

      <h2 className="text-xl font-semibold text-emerald-700 mt-8 mb-3">
        7. Contacto
      </h2>
      <p className="mb-4">
        Si tenés dudas o comentarios, podés escribirnos a{' '}
        <a
          href="mailto:contacto@manosya.com"
          className="text-emerald-600 hover:text-emerald-700 underline"
        >
          contacto@manosya.com
        </a>
        . Nuestro equipo está disponible para ayudarte.
      </p>

      <p className="mt-8 text-sm text-gray-500 italic text-center">
        Gracias por confiar en ManosYA. Construyamos juntos una comunidad más
        solidaria, confiable y cercana 💚
      </p>
    </div>
  );
}
