'use client';

import Link from 'next/link';

function formatWhen(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString();
}

/**
 * props:
 *  - job: { id, title, status, created_at, skill_slug, price_offer }
 *  - unreadInfo?: { unread?: number, last_message?: string, last_message_at?: string }
 */
export default function JobRow({ job, unreadInfo }) {
  const unread = unreadInfo?.unread || 0;
  const lastMessage = unreadInfo?.last_message || null;
  const lastAt = unreadInfo?.last_message_at || job?.created_at;

  return (
    <Link
      href={`/job/${job.id}`}
      className="block p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="flex items-start gap-3">
        {/* Dot / contador */}
        <div className="pt-1">
          {unread > 0 ? (
            <span
              title={`${unread} sin leer`}
              style={{
                background: 'var(--accent)',
                color: '#0B0D0F',
                borderRadius: 9999,
                padding: '0 8px',
                minWidth: 22,
                height: 22,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                lineHeight: '22px',
              }}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            <span
              title="Sin nuevos"
              style={{
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.2)',
                display: 'inline-block',
              }}
            />
          )}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-heading font-extrabold truncate">
              {job.title || 'Pedido'}
            </div>
            {job.skill_slug && (
              <span className="text-xs text-white/60">• {job.skill_slug}</span>
            )}
            {typeof job.price_offer === 'number' && job.price_offer > 0 && (
              <span className="text-xs text-white/60">
                • Gs. {Math.round(job.price_offer).toLocaleString()}
              </span>
            )}
          </div>

          {/* Preview del último mensaje (o descripción corta) */}
          <div className="text-sm text-white/70 truncate mt-1">
            {lastMessage?.trim()
              ? lastMessage
              : (job.description?.trim() || 'Sin mensajes todavía')}
          </div>
        </div>

        {/* When / status */}
        <div className="text-right ml-2 shrink-0">
          <div className="text-xs text-white/60">{formatWhen(lastAt)}</div>
          <div className="text-xs text-white/60 mt-1 capitalize">
            {job.status || 'open'}
          </div>
        </div>
      </div>
    </Link>
  );
}
