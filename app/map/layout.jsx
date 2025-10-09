export const metadata = {
  title: 'Mapa | ManosYA',
  description: 'Ubicá trabajadores cercanos y solicitá ayuda al instante.',
};

export default function MapLayout({ children }) {
  return (
    <section className="bg-white text-gray-900 min-h-screen relative overflow-visible">
      {children}
    </section>
  );
}
