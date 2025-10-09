"use client";
import { useEffect, useState } from "react";

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/workers");
        const data = await res.json();
        setWorkers(data);
      } catch (err) {
        console.error("Error cargando workers:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="text-white">Cargando...</div>;

  return (
    <section>
      <h2 className="text-xl font-heading font-bold mb-4">👷 Lista de trabajadores</h2>
      {workers.length === 0 ? (
        <div className="text-white/70">Todavía no hay registros.</div>
      ) : (
        <table className="w-full border border-white/10 rounded-lg overflow-hidden">
          <thead className="bg-white/10 text-left">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Teléfono</th>
              <th className="p-2">Servicio</th>
              <th className="p-2">Dirección</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id} className="border-t border-white/10">
                <td className="p-2">{w.id}</td>
                <td className="p-2">{w.name}</td>
                <td className="p-2">{w.phone}</td>
                <td className="p-2">{w.service}</td>
                <td className="p-2">{w.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
