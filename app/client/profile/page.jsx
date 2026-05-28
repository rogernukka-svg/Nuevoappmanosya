'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import {
  ArrowLeft,
  LogOut,
  UserCircle2,
  Mail,
  ShieldCheck,
  Settings,
  Sparkles,
  Briefcase,
  MapPinned,
  Save,
  LockKeyhole,
  Camera,
  Loader2,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const supabase = getSupabase();
const PROFILE_OP_TIMEOUT_MS = 25000;

function withTimeout(promise, ms = PROFILE_OP_TIMEOUT_MS, label = 'Operación') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} tardó demasiado. Revisá tu conexión e intentá otra vez.`)),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default function ClientProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const avatarObjectUrlRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [userId, setUserId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadProfile() {
      try {
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;
        const uid = user?.id;

        if (error || !uid) {
          router.replace('/auth/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url, created_at, updated_at')
          .eq('id', uid)
          .maybeSingle();

        if (profileError) throw profileError;

        const finalEmail = profileData?.email || user?.email || '';

        if (alive) {
          setUserId(uid);
          setAuthEmail(user?.email || '');
          setProfile(profileData || null);
          setFullName(profileData?.full_name || '');
          setEmail(finalEmail);
          setAvatarPreview(profileData?.avatar_url || '');
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        toast.error('No pudimos cargar tu perfil');
        router.replace('/client');
      }
    }

    loadProfile();

    return () => {
      alive = false;
      if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    };
  }, [router]);

  function resetEditState() {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    setEditing(false);
    setFullName(profile?.full_name || '');
    setEmail(profile?.email || authEmail || '');
    setNewPassword('');
    setShowPassword(false);
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar_url || '');
  }

  function validateImage(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Usá una imagen JPG, PNG o WEBP');
      return false;
    }

    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`La foto no puede superar ${maxMb} MB`);
      return false;
    }

    return true;
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) {
      e.target.value = '';
      return;
    }

    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);

    const previewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = previewUrl;

    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  }

  async function uploadAvatar() {
    if (!avatarFile || !userId) return avatarPreview || null;

    const cleanExt = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(cleanExt) ? cleanExt : 'jpg';
    const path = `avatars/${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await withTimeout(
      supabase.storage
        .from('avatars')
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || 'image/jpeg',
        }),
      30000,
      'La subida de la foto'
    );

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function handleSaveProfile() {
    if (saving) return;
    if (!userId) return;

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const currentEmail = String(authEmail || profile?.email || '').trim().toLowerCase();

    const wantsEmailChange = cleanEmail && cleanEmail !== currentEmail;
    const wantsPasswordChange = Boolean(newPassword.trim());
    const wantsSensitiveChange = wantsEmailChange || wantsPasswordChange;

    if (!cleanName) {
      toast.error('Poné tu nombre');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Poné un email válido');
      return;
    }

    if (wantsPasswordChange && newPassword.length < 6) {
      toast.error('La contraseña debe tener mínimo 6 caracteres');
      return;
    }

    try {
      setSaving(true);

      const avatarUrl = await uploadAvatar();

      const authUpdates = {};

      if (wantsEmailChange) {
        authUpdates.email = cleanEmail;
      }

      if (wantsPasswordChange) {
        authUpdates.password = newPassword;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await withTimeout(
          supabase.auth.updateUser(authUpdates),
          PROFILE_OP_TIMEOUT_MS,
          'La actualización de acceso'
        );
        if (authError) throw authError;
      }

      const emailToMirrorInProfile = wantsEmailChange ? cleanEmail : currentEmail;

      const { error: profileError } = await withTimeout(
        supabase
          .from('profiles')
          .update({
            full_name: cleanName,
            email: emailToMirrorInProfile,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId),
        PROFILE_OP_TIMEOUT_MS,
        'El guardado del perfil'
      );

      if (profileError) throw profileError;

      setProfile((prev) => ({
        ...(prev || {}),
        id: userId,
        full_name: cleanName,
        email: emailToMirrorInProfile,
        avatar_url: avatarUrl,
      }));

      setAuthEmail(emailToMirrorInProfile);
      setAvatarFile(null);
      setAvatarPreview(avatarUrl || '');
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setNewPassword('');
      setEditing(false);

      if (wantsPasswordChange) {
        toast.success('Contraseña actualizada. Ingresá nuevamente.');
        await withTimeout(supabase.auth.signOut(), 12000, 'El cierre de sesión');

        try {
          localStorage.removeItem('app_role');
          localStorage.removeItem('activeJobChat');
        } catch {}

        router.replace('/auth/login');
        return;
      }

      if (wantsEmailChange) {
        toast.success('Perfil actualizado. Revisá tu correo para confirmar el cambio de email.');
        return;
      }

      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'No pudimos actualizar tu perfil');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await withTimeout(supabase.auth.signOut(), 12000, 'El cierre de sesión');

    try {
      localStorage.removeItem('app_role');
      localStorage.removeItem('activeJobChat');
    } catch {}

    router.replace('/auth/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4fbfa] text-slate-700">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#62bfb9]/30 border-t-[#62bfb9]" />
          <div className="text-lg font-black">Cargando tu perfil...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#f4fbfa_0%,#ffffff_42%,#eef8f7_100%)] text-slate-900">
      <div className="mx-auto max-w-[520px] px-4 pb-28 pt-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => (editing ? resetEditState() : router.push('/client'))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="rounded-full border border-[#62bfb9]/25 bg-white px-4 py-2 text-[12px] font-black text-[#0c6b70] shadow-sm">
            ManosYA
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[34px] border border-white bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]"
        >
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#62bfb9]/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative z-10 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <img
                  src={avatarPreview || profile?.avatar_url || '/avatar-fallback.png'}
                  onError={(e) => {
                    e.currentTarget.src = '/avatar-fallback.png';
                  }}
                  alt={profile?.full_name || 'Cliente'}
                  className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-[0_16px_38px_rgba(98,191,185,0.35)] ring-4 ring-[#62bfb9]/35"
                />

                {editing ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_24px_rgba(98,191,185,0.45)] active:scale-95"
                  >
                    <Camera size={19} />
                  </button>
                ) : (
                  <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#62bfb9] text-white shadow-[0_10px_24px_rgba(98,191,185,0.45)]">
                    <ShieldCheck size={20} />
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <h1 className="mt-5 text-[28px] font-black leading-tight tracking-[-0.04em] text-slate-900">
                {profile?.full_name || 'Cliente ManosYA'}
              </h1>

              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#62bfb9]/12 px-4 py-2 text-[12px] font-black text-[#0c6b70]">
                <Sparkles size={14} />
                {editing ? 'Editando perfil' : 'Perfil cliente'}
              </div>
            </div>

            {!editing ? (
              <>
                <div className="mt-7 grid gap-3">
                  <InfoBox icon={<UserCircle2 size={14} />} label="Nombre">
                    {profile?.full_name || 'Sin nombre'}
                  </InfoBox>

                  <InfoBox icon={<Mail size={14} />} label="Email">
                    {profile?.email || authEmail || 'Sin email'}
                  </InfoBox>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[24px] border border-[#62bfb9]/20 bg-[#62bfb9]/10 p-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#0c6b70]/70">
                        <MapPinned size={14} />
                        Modo
                      </div>
                      <div className="text-[16px] font-black text-[#0c6b70]">
                        Cliente
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                        <Briefcase size={14} />
                        Pedidos
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push('/client/jobs')}
                        className="text-[16px] font-black text-slate-800"
                      >
                        Ver historial
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-7 grid gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center justify-center gap-2 rounded-[24px] bg-[#62bfb9] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.36)] active:scale-[0.99]"
                  >
                    <Settings size={17} />
                    Editar perfil
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/client/jobs')}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-sm active:scale-[0.99]"
                  >
                    <Briefcase size={17} />
                    Mis pedidos
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-black text-red-600 active:scale-[0.99]"
                  >
                    <LogOut size={17} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  className="mt-7 grid gap-3"
                >
                  <EditField
                    icon={<UserCircle2 size={14} />}
                    label="Nombre"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Tu nombre"
                  />

                  <EditField
                    icon={<Mail size={14} />}
                    label="Email"
                    value={email}
                    onChange={setEmail}
                    placeholder="tu@email.com"
                    type="email"
                  />

                  <PasswordField
                    value={newPassword}
                    onChange={setNewPassword}
                    show={showPassword}
                    onToggleShow={() => setShowPassword((prev) => !prev)}
                  />

                  <div className="rounded-[24px] border border-[#62bfb9]/20 bg-[#62bfb9]/10 p-4 text-[13px] font-semibold leading-5 text-[#0c6b70]">
                    Tocá la cámara para cambiar tu foto. Si cambiás contraseña, por seguridad vas a iniciar sesión otra vez.
                  </div>

                  {email.trim().toLowerCase() !== String(authEmail || profile?.email || '').trim().toLowerCase() && (
                    <div className="flex gap-3 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-left text-[13px] font-semibold leading-5 text-amber-800">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                      El cambio de email puede requerir confirmación por correo.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="mt-2 flex items-center justify-center gap-2 rounded-[24px] bg-[#62bfb9] px-5 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(98,191,185,0.36)] disabled:opacity-60 active:scale-[0.99]"
                  >
                    {saving ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    Guardar cambios
                  </button>

                  <button
                    type="button"
                    onClick={resetEditState}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-sm disabled:opacity-60 active:scale-[0.99]"
                  >
                    <X size={17} />
                    Cancelar
                  </button>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function InfoBox({ icon, label, children }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className="break-all text-[16px] font-black text-slate-800">
        {children}
      </div>
    </div>
  );
}

function EditField({ icon, label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
        {icon}
        {label}
      </div>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[16px] font-black text-slate-800 outline-none placeholder:text-slate-400"
      />
    </label>
  );
}

function PasswordField({ value, onChange, show, onToggleShow }) {
  return (
    <label className="block rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
        <LockKeyhole size={14} />
        Nueva contraseña
      </div>

      <div className="flex items-center gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Dejar vacío si no querés cambiar"
          className="min-w-0 flex-1 bg-transparent text-[16px] font-black text-slate-800 outline-none placeholder:text-slate-400"
        />

        <button
          type="button"
          onClick={onToggleShow}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm active:scale-95"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}
