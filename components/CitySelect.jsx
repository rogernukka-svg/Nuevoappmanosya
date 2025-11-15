"use client";

import { useState } from "react";

const DEPARTMENTS = [
  {
    name: "Capital",
    cities: [
      { slug: "asuncion", name: "Asunción" },
    ],
  },
  {
    name: "Central",
    cities: [
      { slug: "sanlorenzo", name: "San Lorenzo" },
      { slug: "luque", name: "Luque" },
      { slug: "fernando", name: "Fernando de la Mora" },
      { slug: "lambare", name: "Lambaré" },
      { slug: "nemby", name: "Ñemby" },
      { slug: "capiata", name: "Capiatá" },
      { slug: "itaugua", name: "Itauguá" },
      { slug: "villaelisa", name: "Villa Elisa" },
      { slug: "limpio", name: "Limpio" },
      { slug: "mariano", name: "Mariano R. Alonso" },
    ],
  },
  {
    name: "Alto Paraná",
    cities: [
      { slug: "cde", name: "Ciudad del Este" },
      { slug: "minga", name: "Minga Guazú" },
      { slug: "hernandarias", name: "Hernandarias" },
      { slug: "pfranco", name: "Pdte. Franco" },
    ],
  },
  {
    name: "Itapúa",
    cities: [
      { slug: "encarnacion", name: "Encarnación" },
      { slug: "cambyreta", name: "Cambyretá" },
      { slug: "hohenau", name: "Hohenau" },
      { slug: "obligado", name: "Obligado" },
      { slug: "bellavista", name: "Bella Vista" },
    ],
  },
  {
    name: "Caaguazú",
    cities: [
      { slug: "coroneloviedo", name: "Coronel Oviedo" },
      { slug: "jidominguez", name: "J. Eulogio Estigarribia" },
      { slug: "repatriacion", name: "Repatriación" },
    ],
  },
  {
    name: "Amambay",
    cities: [
      { slug: "pedrojuan", name: "Pedro Juan Caballero" },
      { slug: "capitanbado", name: "Capitán Bado" },
    ],
  },
];

export default function CitySelect({ value, onChange }) {
  const [search, setSearch] = useState("");

  const filtered = DEPARTMENTS.map((d) => ({
    ...d,
    cities: d.cities.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((d) => d.cities.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* 🔍 BUSCADOR */}
      <input
        type="text"
        className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
        placeholder="Buscar ciudad..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* SELECTOR */}
      <select
        className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Seleccioná una ciudad</option>

        {filtered.map((dept) => (
          <optgroup key={dept.name} label={dept.name}>
            {dept.cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
