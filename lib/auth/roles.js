export const ROLES = {
  CLIENT: "client",
  WORKER: "worker",
  SUPPLIER: "supplier",
  ADMIN: "admin",
  CASHIER: "cashier",
};

export function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "provider") return ROLES.SUPPLIER;
  if (Object.values(ROLES).includes(value)) return value;
  return "";
}

export function pathForRole(role) {
  const clean = normalizeRole(role);
  if (clean === ROLES.WORKER) return "/worker/feed";
  if (clean === ROLES.SUPPLIER) return "/supplier";
  if (clean === ROLES.ADMIN || clean === ROLES.CASHIER) return "/admin";
  if (clean === ROLES.CLIENT) return "/client";
  return "/register";
}

export const roleChoices = [
  {
    value: ROLES.CLIENT,
    title: "Necesito ayuda",
    description: "Pedir, comparar y contratar trabajadores cerca.",
  },
  {
    value: ROLES.WORKER,
    title: "Soy trabajador",
    description: "Publicar tu trabajo, recibir pedidos y crecer.",
  },
  {
    value: ROLES.SUPPLIER,
    title: "Soy proveedor",
    description: "Vender insumos y aparecer dentro del ecosistema.",
  },
];
