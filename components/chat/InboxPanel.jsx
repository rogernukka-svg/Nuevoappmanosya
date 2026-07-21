import Link from "next/link";
import { BadgeCheck, Search } from "lucide-react";

const conversations = [
  {
    id: "demo",
    name: "Carlos Medina",
    trade: "Electricista",
    preview: "Te paso ubicacion y detalles?",
    time: "Ahora",
    unread: 2,
    status: "Disponible",
    accent: "CM",
  },
  {
    id: "laura-demo",
    name: "Laura Benitez",
    trade: "Limpieza",
    preview: "Puedo ir hoy a la tarde.",
    time: "8 min",
    unread: 0,
    status: "Verificada",
    accent: "LB",
  },
  {
    id: "proveedor-demo",
    name: "Proveedor Centro",
    trade: "Insumos",
    preview: "Tengo stock y envio rapido.",
    time: "1 h",
    unread: 1,
    status: "Proveedor",
    accent: "PC",
  },
];

export default function InboxPanel() {
  return (
    <section className="inbox-pro">
      <header className="inbox-hero">
        <div>
          <h1>Inbox</h1>
        </div>
        <button type="button" aria-label="Buscar conversacion">
          <Search size={21} />
        </button>
      </header>

      <div className="inbox-list">
        {conversations.map((chat) => (
          <Link key={chat.id} href={`/dm/${chat.id}`} className="inbox-row">
            <span className="inbox-avatar">{chat.accent}</span>
            <div>
              <div className="inbox-row-top">
                <strong>{chat.name}</strong>
                <small>{chat.time}</small>
              </div>
              <p>{chat.preview}</p>
              <span className="inbox-status">
                <BadgeCheck size={13} />
                {chat.trade} · {chat.status}
              </span>
            </div>
            {chat.unread ? <em>{chat.unread}</em> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
