'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import {
  Users,
  Wrench,
  Briefcase,
  UserCheck,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const supabase = getSupabase();

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    activeWorkers: 0,
    totalJobs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel('admin-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'worker_profiles' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchStats)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const [{ count: usersCount }, { count: workersCount }, { count: activeCount }, { count: jobsCount }] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('worker_profiles').select('*', { count: 'exact', head: true }),
          supabase.from('worker_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('jobs').select('*', { count: 'exact', head: true }),
        ]);

      setStats({
        totalUsers: usersCount || 0,
        totalWorkers: workersCount || 0,
        activeWorkers: activeCount || 0,
        totalJobs: jobsCount || 0,
      });
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold flex items-center gap-2 mb-8">
        <BarChart3 className="text-emerald-500" />
        Panel de Analítica
      </h1>

      {loading ? (
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <StatCard
            icon={<Users className="text-sky-500" size={28} />}
            label="Usuarios registrados"
            value={stats.totalUsers}
          />
          <StatCard
            icon={<Wrench className="text-orange-500" size={28} />}
            label="Trabajadores totales"
            value={stats.totalWorkers}
          />
          <StatCard
            icon={<UserCheck className="text-emerald-500" size={28} />}
            label="Trabajadores activos"
            value={stats.activeWorkers}
          />
          <StatCard
            icon={<Briefcase className="text-violet-500" size={28} />}
            label="Trabajos totales"
            value={stats.totalJobs}
          />
        </motion.div>
      )}
    </div>
  );
}

/* === Tarjeta === */
function StatCard({ icon, label, value }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-white shadow-sm rounded-2xl p-6 flex flex-col items-center justify-center border border-gray-100"
    >
      <div className="mb-3">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </motion.div>
  );
}
