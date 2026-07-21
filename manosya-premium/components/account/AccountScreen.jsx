"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Camera, Film, Heart, ImagePlus, LogOut, MapPin, MessageCircle, Pencil, Play, Save, ShieldCheck, Sparkles, UploadCloud, UserRound, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AccountScreen({ role = "client", showWorkerStudio = false, showWorkerVerification = false }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState(null);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [supplierProfile, setSupplierProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [posts, setPosts] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [workerStats, setWorkerStats] = useState({ likes: 0, comments: 0 });
  const [supplierStats, setSupplierStats] = useState({ contacts: 0 });
  const [postComments, setPostComments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (alive) setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,role,is_verified,avatar_url,bio")
        .eq("id", user.id)
        .maybeSingle();

      let workerData = null;
      let postData = [];
      let documentData = [];
      let statsData = { likes: 0, comments: 0 };
      let commentData = [];
      let supplierData = null;
      let productData = [];
      let supplierStatsData = { contacts: 0 };

      if ((data?.role || role) === "worker") {
        const { data: wp } = await supabase
          .from("worker_profiles")
          .select("headline,bio,skills,service_slugs,city,cover_url,intro_video_url,is_available,verification_status")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: media } = await supabase
          .from("worker_posts")
          .select("id,caption,media_url,media_type,service_slug,created_at")
          .eq("worker_id", user.id)
          .order("created_at", { ascending: false })
          .limit(18);

        const { data: docs } = await supabase
          .from("documents")
          .select("id,doc_type,front_url,back_url,file_url,status,rejection_reason,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const { count: likesCount } = await supabase
          .from("worker_likes")
          .select("id", { count: "exact", head: true })
          .eq("worker_id", user.id);

        const { data: comments, count: commentsCount } = await supabase
          .from("worker_comments")
          .select("id,post_id,body,created_at", { count: "exact" })
          .eq("worker_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80);

        workerData = wp;
        postData = media || [];
        documentData = docs || [];
        statsData = { likes: likesCount || 0, comments: commentsCount || 0 };
        commentData = comments || [];
      }

      if ((data?.role || role) === "supplier") {
        const { data: sp } = await supabase
          .from("supplier_profiles")
          .select("business_name,category,city,phone,logo_url,is_active")
          .eq("user_id", user.id)
          .maybeSingle();

        const { data: products } = await supabase
          .from("supplier_products")
          .select("id,title,description,price,service_slug,media_url,is_active,created_at")
          .eq("supplier_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        const { count: contactsCount } = await supabase
          .from("supplier_contacts")
          .select("id", { count: "exact", head: true })
          .eq("supplier_id", user.id);

        supplierData = sp;
        productData = products || [];
        supplierStatsData = { contacts: contactsCount || 0 };
      }

      if (alive) {
        setProfile({
          id: user.id,
          email: user.email,
          fullName: data?.full_name || user.user_metadata?.full_name || "ManosYA",
          role: data?.role || role,
          verified: Boolean(data?.is_verified),
          avatarUrl: data?.avatar_url || "",
          bio: data?.bio || "",
        });
        setWorkerProfile(workerData);
        setSupplierProfile(supplierData);
        setDocuments(documentData);
        setPosts(postData);
        setSupplierProducts(productData);
        setWorkerStats(statsData);
        setSupplierStats(supplierStatsData);
        setPostComments(commentData);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [role, supabase]);

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function saveClientBasics(nextProfile) {
    if (!profile?.id) return;
    setSaving(true);
    setNotice("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nextProfile.fullName,
        avatar_url: nextProfile.avatarUrl,
      })
      .eq("id", profile.id);

    if (error) setNotice(error.message);
    else {
      setProfile(nextProfile);
      setNotice("Perfil actualizado.");
    }

    setSaving(false);
  }

  async function saveWorkerBasics(nextProfile, nextWorker) {
    if (!profile?.id) return;
    setSaving(true);
    setNotice("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: nextProfile.fullName,
        bio: nextProfile.bio,
        avatar_url: nextProfile.avatarUrl,
      })
      .eq("id", profile.id);

    if (profileError) {
      setNotice(profileError.message);
      setSaving(false);
      return;
    }

    const { error: workerError } = await supabase
      .from("worker_profiles")
      .upsert({
        user_id: profile.id,
        headline: nextWorker.headline,
        bio: nextWorker.bio,
        city: nextWorker.city,
        cover_url: nextWorker.cover_url,
        intro_video_url: nextWorker.intro_video_url,
      });

    if (workerError) setNotice(workerError.message);
    else setNotice("Perfil actualizado.");

    setProfile(nextProfile);
    setWorkerProfile(nextWorker);
    setSaving(false);
  }

  async function saveSupplierBasics(nextProfile, nextSupplier) {
    if (!profile?.id) return;
    setSaving(true);
    setNotice("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: nextProfile.fullName,
        bio: nextProfile.bio,
        avatar_url: nextProfile.avatarUrl,
      })
      .eq("id", profile.id);

    if (profileError) {
      setNotice(profileError.message);
      setSaving(false);
      return;
    }

    const { error: supplierError } = await supabase
      .from("supplier_profiles")
      .upsert({
        user_id: profile.id,
        business_name: nextSupplier.business_name,
        category: nextSupplier.category,
        city: nextSupplier.city,
        phone: nextSupplier.phone,
        logo_url: nextSupplier.logo_url,
        is_active: true,
      });

    if (supplierError) setNotice(supplierError.message);
    else setNotice("Local actualizado.");

    setProfile(nextProfile);
    setSupplierProfile(nextSupplier);
    setSaving(false);
  }

  async function uploadPublicFile(bucket, file, folder = profile?.id) {
    if (!profile?.id || !file) return "";
    const ext = file.name.split(".").pop() || "file";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadWorkerDocument(file, docType) {
    if (!profile?.id || !file) return "";
    const ext = file.name.split(".").pop() || "file";
    const path = `${profile.id}/${docType}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("worker-docs").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  async function saveWorkerDocument(docType, file) {
    if (!file || !profile?.id) return;
    setNotice("Guardando documento...");

    try {
      const path = await uploadWorkerDocument(file, docType);
      const current = (documents || []).find((item) => item.doc_type === docType);
      const payload = documentPayloadForType(docType, path);

      if (current?.id) {
        const { data, error } = await supabase
          .from("documents")
          .update({
            ...payload,
            status: "pending",
            rejection_reason: null,
          })
          .eq("id", current.id)
          .select("id,doc_type,front_url,back_url,file_url,status,rejection_reason,created_at")
          .single();

        if (error) throw error;
        setDocuments((list) => [data, ...list.filter((item) => item.id !== current.id)]);
      } else {
        const { data, error } = await supabase
          .from("documents")
          .insert({
            user_id: profile.id,
            doc_type: docType,
            ...payload,
            status: "pending",
          })
          .select("id,doc_type,front_url,back_url,file_url,status,rejection_reason,created_at")
          .single();

        if (error) throw error;
        setDocuments((list) => [data, ...list]);
      }

      setNotice("Documento recibido. Seguimos con el proximo paso.");
    } catch (error) {
      setNotice(error.message || "No se pudo guardar el documento.");
    }
  }

  if (role === "worker" && showWorkerVerification) {
    return (
      <WorkerVerificationScreen
        profile={profile}
        workerProfile={workerProfile}
        documents={documents}
        notice={notice}
        onUpload={saveWorkerDocument}
      />
    );
  }

  if (role === "worker" && showWorkerStudio) {
    return (
      <WorkerProfileStudio
        profile={profile}
        workerProfile={workerProfile}
        posts={posts}
        stats={workerStats}
        comments={postComments}
        busy={busy}
        saving={saving}
        notice={notice}
        onSave={saveWorkerBasics}
        onUploadFile={uploadPublicFile}
        onSignOut={signOut}
        setNotice={setNotice}
        setProfile={setProfile}
        setWorkerProfile={setWorkerProfile}
        documents={documents}
        setPosts={setPosts}
      />
    );
  }

  if (role === "supplier") {
    return (
      <SupplierProfileStudio
        profile={profile}
        supplierProfile={supplierProfile}
        products={supplierProducts}
        stats={supplierStats}
        busy={busy}
        saving={saving}
        notice={notice}
        onSave={saveSupplierBasics}
        onUploadFile={uploadPublicFile}
        onSignOut={signOut}
        setNotice={setNotice}
        setSupplierProfile={setSupplierProfile}
        setProducts={setSupplierProducts}
      />
    );
  }

  if (role === "client") {
    return (
      <ClientProfileStudio
        profile={profile}
        busy={busy}
        saving={saving}
        notice={notice}
        onSave={saveClientBasics}
        onUploadFile={uploadPublicFile}
        onSignOut={signOut}
        setNotice={setNotice}
      />
    );
  }

  return (
    <section className="account-screen">
      <div className="account-avatar">
        <UserRound size={34} />
      </div>
      <h1>{profile?.fullName || "Tu cuenta"}</h1>
      <p>{profile?.email || "Sesion ManosYA"}</p>
      <div className="account-pill">
        <ShieldCheck size={16} />
        {profile?.verified ? "Verificado" : labelForRole(profile?.role || role)}
      </div>
      <button type="button" onClick={signOut} disabled={busy}>
        <LogOut size={19} />
        {busy ? "Saliendo..." : "Cerrar sesion"}
      </button>
    </section>
  );
}

function ClientProfileStudio({ profile, busy, saving, notice, onSave, onUploadFile, onSignOut, setNotice }) {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    setFullName(profile?.fullName || "");
    setAvatarUrl(profile?.avatarUrl || "");
  }, [profile]);

  async function handleAvatar(file) {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setAvatarUrl(local);
    setNotice("Subiendo foto...");

    try {
      const publicUrl = await onUploadFile("avatars", file);
      await onSave({ ...profile, fullName, avatarUrl: publicUrl });
      setAvatarUrl(publicUrl);
    } catch (error) {
      setNotice(error.message || "No se pudo subir foto.");
    }
  }

  return (
    <section className="client-profile-pro">
      <label className="client-profile-avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={38} />}
        <span><Camera size={15} /></span>
        <input type="file" accept="image/*" onChange={(event) => handleAvatar(event.target.files?.[0])} />
      </label>

      <div className="client-profile-name">
        <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tu nombre" />
        <Pencil size={17} />
      </div>
      <p>{profile?.email || "Cuenta ManosYA"}</p>

      {notice ? <p className="worker-profile-notice">{notice}</p> : null}

      <div className="client-profile-actions">
        <Link href="/client/map">
          <MapPin size={18} />
          Ver cerca
        </Link>
        <Link href="/dm">
          <MessageCircle size={18} />
          Mensajes
        </Link>
      </div>

      <button
        type="button"
        onClick={() => onSave({ ...profile, fullName, avatarUrl })}
        disabled={saving}
        className="client-save-profile"
      >
        <Save size={18} />
        {saving ? "Guardando..." : "Guardar perfil"}
      </button>

      <button type="button" onClick={onSignOut} disabled={busy} className="client-logout">
        <LogOut size={18} />
        {busy ? "Saliendo..." : "Cerrar sesion"}
      </button>
    </section>
  );
}

function WorkerProfileStudio({
  profile,
  workerProfile,
  posts,
  stats,
  comments,
  busy,
  saving,
  notice,
  onSave,
  onUploadFile,
  onSignOut,
  setNotice,
  setProfile,
  setWorkerProfile,
  documents,
  setPosts,
}) {
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaDetail, setMediaDetail] = useState("");
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    setFullName(profile?.fullName || "");
    setBio(workerProfile?.bio || profile?.bio || "");
    setHeadline(workerProfile?.headline || "Trabajador verificado");
    setCity(workerProfile?.city || "");
    setCoverUrl(workerProfile?.cover_url || "");
    setAvatarUrl(profile?.avatarUrl || "");
  }, [profile, workerProfile]);

  async function handleCover(file) {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setCoverUrl(local);
    setNotice("Subiendo portada...");
    try {
      const publicUrl = await onUploadFile("worker-media", file);
      const nextProfile = { ...profile, avatarUrl };
      const nextWorker = { ...(workerProfile || {}), headline, bio, city, cover_url: publicUrl };
      await onSave(nextProfile, nextWorker);
      setCoverUrl(publicUrl);
    } catch (error) {
      setNotice(error.message || "No se pudo subir portada.");
    }
  }

  async function handleAvatar(file) {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setAvatarUrl(local);
    setNotice("Subiendo foto de perfil...");
    try {
      const publicUrl = await onUploadFile("avatars", file);
      const nextProfile = { ...profile, fullName, bio, avatarUrl: publicUrl };
      const nextWorker = { ...(workerProfile || {}), headline, bio, city, cover_url: coverUrl };
      await onSave(nextProfile, nextWorker);
      setAvatarUrl(publicUrl);
    } catch (error) {
      setNotice(error.message || "No se pudo subir foto.");
    }
  }

  async function handleMedia(files) {
    const list = Array.from(files || []);
    if (!list.length || !profile?.id) return;

    setNotice("Subiendo publicaciones...");
    for (const file of list) {
      try {
        const publicUrl = await onUploadFile("worker-media", file);
        const mediaType = file.type.startsWith("video") ? "video" : "image";
        const caption = composePostCaption(mediaTitle, mediaDetail, headline);
        const { data, error } = await createSupabaseBrowserClient()
          .from("worker_posts")
          .insert({
            worker_id: profile.id,
            caption,
            media_url: publicUrl,
            media_type: mediaType,
            service_slug: workerProfile?.service_slugs?.[0] || null,
          })
          .select("id,caption,media_url,media_type,service_slug,created_at")
          .single();

        if (error) throw error;
        setPosts((current) => [data, ...current]);
        if (mediaType === "video" && !workerProfile?.intro_video_url) {
          setWorkerProfile((current) => ({ ...(current || {}), intro_video_url: publicUrl }));
        }
      } catch (error) {
        setNotice(error.message || "No se pudo subir una publicacion.");
        return;
      }
    }

    setMediaTitle("");
    setMediaDetail("");
    setUploadSheetOpen(false);
    setNotice("Publicaciones listas.");
  }

  const commentsByPost = useMemo(() => {
    const grouped = new Map();
    for (const comment of comments || []) {
      if (!comment.post_id) continue;
      grouped.set(comment.post_id, [...(grouped.get(comment.post_id) || []), comment]);
    }
    return grouped;
  }, [comments]);

  const hasPosts = Boolean((posts || []).length);
  const activePost = viewerIndex !== null ? posts?.[viewerIndex] : null;

  function saveBasics() {
    onSave(
      { ...profile, fullName, bio, avatarUrl },
      {
        ...(workerProfile || {}),
        headline,
        bio,
        city,
        cover_url: coverUrl,
        intro_video_url: workerProfile?.intro_video_url || "",
      }
    );
  }

  return (
    <section className="worker-profile-studio">
      <div className="worker-cover">
        {coverUrl ? <img src={coverUrl} alt="" /> : <div className="worker-cover-empty"><ImagePlus size={28} />Portada</div>}
        <label className="worker-cover-action">
          <Camera size={18} />
          Cambiar portada
          <input type="file" accept="image/*" onChange={(event) => handleCover(event.target.files?.[0])} />
        </label>
      </div>

      <div className="worker-profile-head">
        <label className="worker-avatar-edit">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={34} />}
          <span><Camera size={15} /></span>
          <input type="file" accept="image/*" onChange={(event) => handleAvatar(event.target.files?.[0])} />
        </label>

        <div className="worker-name-row">
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tu nombre profesional" />
          <Pencil size={17} />
        </div>
        <p>{profile?.email || "Cuenta ManosYA"}</p>
      </div>

      <button type="button" className="worker-bio-trigger" onClick={() => setEditingBio(true)}>
        <Pencil size={16} />
        {headline || bio || city ? "Editar presentacion" : "Pone tu bio"}
      </button>

      {notice ? <p className="worker-profile-notice">{notice}</p> : null}

      <WorkerTrustReminder
        documents={documents}
        verified={profile?.verified || workerProfile?.verification_status === "approved"}
      />

      <div className="worker-media-head">
        <div>
          <strong>Videos y fotos</strong>
          <span>Tu trabajo vende cuando se ve.</span>
        </div>
      </div>

      {hasPosts ? (
        <div className="worker-studio-stats">
          <span><Film size={15} /><b>{posts?.length || 0}</b> trabajos</span>
          <span><Heart size={15} /><b>{stats?.likes || 0}</b> me gusta</span>
          <span><MessageCircle size={15} /><b>{stats?.comments || 0}</b> comentarios</span>
        </div>
      ) : null}

      {hasPosts ? (
        <div className="worker-media-grid">
          <button type="button" className="worker-media-add" onClick={() => setUploadSheetOpen(true)}>
            <span><UploadCloud size={22} /></span>
            <b>Nuevo</b>
            <small>Video o foto</small>
          </button>
          {(posts || []).map((post, index) => {
            const copy = splitPostCaption(post.caption);
            return (
              <button key={post.id} type="button" className="worker-media-tile" onClick={() => setViewerIndex(index)}>
                {post.media_type === "video" ? <video src={post.media_url} muted playsInline preload="metadata" /> : <img src={post.media_url} alt="" />}
                {post.media_type === "video" ? <span className="worker-media-play"><Play size={16} fill="currentColor" /></span> : null}
                <span className="worker-media-meta">
                  <b>{copy.title}</b>
                  <small>{commentsByPost.get(post.id)?.length || 0} comentarios</small>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <button type="button" className="worker-first-video" onClick={() => setUploadSheetOpen(true)}>
          <Film size={32} />
          <strong>Carga tu primer video</strong>
          <span>Mostra un antes y despues. Que el cliente vea por que sos bueno.</span>
          <em>Subir video o foto</em>
        </button>
      )}

      {activePost ? (
        <WorkerPostViewer
          posts={posts}
          index={viewerIndex}
          commentsByPost={commentsByPost}
          likesCount={stats?.likes || 0}
          onClose={() => setViewerIndex(null)}
          onMove={(nextIndex) => setViewerIndex(Math.max(0, Math.min((posts || []).length - 1, nextIndex)))}
        />
      ) : null}

      {uploadSheetOpen ? (
        <div className="worker-bio-sheet" role="dialog" aria-modal="true">
          <div className="worker-upload-panel">
            <button type="button" className="worker-bio-close" onClick={() => setUploadSheetOpen(false)} aria-label="Cerrar">
              <X size={20} />
            </button>
            <strong>Nuevo trabajo</strong>
            <span>Mostra el resultado. Pocas palabras, buen video.</span>

            <div className="worker-upload-fields">
              <label>
                Titulo
                <input value={mediaTitle} onChange={(event) => setMediaTitle(event.target.value)} placeholder="Ej: instalacion electrica" />
              </label>
              <label>
                Detalle corto
                <input value={mediaDetail} onChange={(event) => setMediaDetail(event.target.value)} placeholder="Antes y despues, zona, garantia..." />
              </label>
            </div>

            <label className="worker-upload-drop">
              <UploadCloud size={22} />
              <b>Elegir video o foto</b>
              <small>Se guarda en tu perfil y en tu feed.</small>
              <input type="file" accept="image/*,video/*" multiple onChange={(event) => handleMedia(event.target.files)} />
            </label>
          </div>
        </div>
      ) : null}

      <div className="worker-profile-actions">
        <button type="button" onClick={onSignOut} disabled={busy} className="worker-logout">
          <LogOut size={18} />
          {busy ? "Saliendo..." : "Cerrar sesion"}
        </button>
      </div>

      {editingBio && (
        <div className="worker-bio-sheet" role="dialog" aria-modal="true">
          <div className="worker-bio-panel">
            <button type="button" className="worker-bio-close" onClick={() => setEditingBio(false)} aria-label="Cerrar">
              <X size={20} />
            </button>
            <strong>Tu presentacion</strong>
            <span>Deci claro que haces. El video vende, esta parte orienta.</span>

            <div className="worker-edit-grid">
              <label>
                Oficio principal
                <input value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Electricista, plomero..." />
              </label>
              <label>
                Ciudad
                <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Asuncion" />
              </label>
              <label className="worker-bio-field">
                Bio corta
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Conta que haces mejor..." />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                saveBasics();
                setEditingBio(false);
              }}
              disabled={saving}
              className="worker-bio-save"
            >
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SupplierProfileStudio({
  profile,
  supplierProfile,
  products,
  stats,
  busy,
  saving,
  notice,
  onSave,
  onUploadFile,
  onSignOut,
  setNotice,
  setSupplierProfile,
  setProducts,
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const coverProduct = useMemo(() => (products || []).find((product) => product.service_slug === "__cover__"), [products]);
  const visibleProducts = useMemo(() => (products || []).filter((product) => product.service_slug !== "__cover__"), [products]);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [productTitle, setProductTitle] = useState("");
  const [productDetail, setProductDetail] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    setBusinessName(supplierProfile?.business_name || profile?.fullName || "");
    setCategory(supplierProfile?.category || "Insumos para obras");
    setBio(profile?.bio || "");
    setCity(supplierProfile?.city || "");
    setPhone(supplierProfile?.phone || "");
    setLogoUrl(supplierProfile?.logo_url || profile?.avatarUrl || "");
    setCoverUrl(coverProduct?.media_url || "");
  }, [profile, supplierProfile, coverProduct?.media_url]);

  async function handleCover(file) {
    if (!file || !profile?.id) return;
    const local = URL.createObjectURL(file);
    setCoverUrl(local);
    setNotice("Subiendo portada del local...");

    try {
      const publicUrl = await onUploadFile("supplier-media", file);
      if (coverProduct?.id) {
        const { data, error } = await supabase
          .from("supplier_products")
          .update({
            title: "Portada del local",
            description: "Imagen principal del local digital.",
            media_url: publicUrl,
            service_slug: "__cover__",
            is_active: false,
          })
          .eq("id", coverProduct.id)
          .select("id,title,description,price,service_slug,media_url,is_active,created_at")
          .single();
        if (error) throw error;
        setProducts((current) => (current || []).map((item) => item.id === data.id ? data : item));
      } else {
        const { data, error } = await supabase
          .from("supplier_products")
          .insert({
            supplier_id: profile.id,
            title: "Portada del local",
            description: "Imagen principal del local digital.",
            media_url: publicUrl,
            service_slug: "__cover__",
            is_active: false,
          })
          .select("id,title,description,price,service_slug,media_url,is_active,created_at")
          .single();
        if (error) throw error;
        setProducts((current) => [data, ...(current || [])]);
      }
      setCoverUrl(publicUrl);
      setNotice("Portada lista.");
    } catch (error) {
      setNotice(error.message || "No se pudo subir portada.");
    }
  }

  async function handleLogo(file) {
    if (!file) return;
    const local = URL.createObjectURL(file);
    setLogoUrl(local);
    setNotice("Subiendo logo...");

    try {
      const publicUrl = await onUploadFile("supplier-media", file);
      const nextProfile = { ...profile, fullName: businessName, bio, avatarUrl: publicUrl };
      const nextSupplier = {
        ...(supplierProfile || {}),
        business_name: businessName,
        category,
        city,
        phone,
        logo_url: publicUrl,
        is_active: true,
      };
      await onSave(nextProfile, nextSupplier);
      setLogoUrl(publicUrl);
    } catch (error) {
      setNotice(error.message || "No se pudo subir logo.");
    }
  }

  async function handleProduct(files) {
    const list = Array.from(files || []);
    if (!list.length || !profile?.id) return;

    setNotice("Subiendo productos...");
    for (const file of list) {
      try {
        const publicUrl = await onUploadFile("supplier-media", file);
        const price = Number(String(productPrice).replace(",", "."));
        const { data, error } = await supabase
          .from("supplier_products")
          .insert({
            supplier_id: profile.id,
            title: productTitle.trim() || category || "Producto disponible",
            description: productDetail.trim() || "Disponible en mi local ManosYA.",
            price: Number.isFinite(price) && price > 0 ? price : null,
            service_slug: slugifyLite(category),
            media_url: publicUrl,
            is_active: true,
          })
          .select("id,title,description,price,service_slug,media_url,is_active,created_at")
          .single();

        if (error) throw error;
        setProducts((current) => [data, ...(current || [])]);
      } catch (error) {
        setNotice(error.message || "No se pudo subir un producto.");
        return;
      }
    }

    setProductTitle("");
    setProductDetail("");
    setProductPrice("");
    setUploadSheetOpen(false);
    setNotice("Producto publicado.");
  }

  function saveBasics() {
    onSave(
      { ...profile, fullName: businessName, bio, avatarUrl: logoUrl },
      {
        ...(supplierProfile || {}),
        business_name: businessName,
        category,
        city,
        phone,
        logo_url: logoUrl,
        is_active: true,
      }
    );
  }

  const hasProducts = Boolean(visibleProducts.length);
  const activeProduct = viewerIndex !== null ? visibleProducts?.[viewerIndex] : null;

  return (
    <section className="worker-profile-studio supplier-profile-studio">
      <div className="worker-cover">
        {coverUrl ? <img src={coverUrl} alt="" /> : <div className="worker-cover-empty"><ImagePlus size={28} />Local digital</div>}
        <label className="worker-cover-action">
          <Camera size={18} />
          Cambiar portada
          <input type="file" accept="image/*" onChange={(event) => handleCover(event.target.files?.[0])} />
        </label>
      </div>

      <div className="worker-profile-head">
        <label className="worker-avatar-edit supplier-logo-edit">
          {logoUrl ? <img src={logoUrl} alt="" /> : <UserRound size={34} />}
          <span><Camera size={15} /></span>
          <input type="file" accept="image/*" onChange={(event) => handleLogo(event.target.files?.[0])} />
        </label>

        <div className="worker-name-row">
          <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Nombre del local" />
          <Pencil size={17} />
        </div>
        <p>{profile?.email || "Local ManosYA"}</p>
      </div>

      <button type="button" className="worker-bio-trigger" onClick={() => setEditingBio(true)}>
        <Pencil size={16} />
        {category || bio || city ? "Editar local" : "Arma tu local"}
      </button>

      {notice ? <p className="worker-profile-notice">{notice}</p> : null}

      <SupplierTrustReminder
        active={supplierProfile?.is_active}
        hasProducts={hasProducts}
        category={category}
        onClick={() => hasProducts ? setEditingBio(true) : setUploadSheetOpen(true)}
      />

      <div className="worker-media-head">
        <div>
          <strong>Productos y videos</strong>
          <span>Tu local vende cuando se ve.</span>
        </div>
        {hasProducts ? (
          <button type="button" onClick={() => setUploadSheetOpen(true)}>
            <UploadCloud size={17} />
            Subir
          </button>
        ) : null}
      </div>

      {hasProducts ? (
        <div className="worker-studio-stats">
          <span><Film size={15} /><b>{visibleProducts.length}</b> productos</span>
          <span><MessageCircle size={15} /><b>{stats?.contacts || 0}</b> consultas</span>
          <span><BadgeCheck size={15} /><b>{supplierProfile?.is_active ? "On" : "Nuevo"}</b> local</span>
        </div>
      ) : null}

      {hasProducts ? (
        <div className="worker-media-grid supplier-media-grid">
          <button type="button" className="worker-media-add" onClick={() => setUploadSheetOpen(true)}>
            <span><UploadCloud size={22} /></span>
            <b>Nuevo</b>
            <small>Producto o video</small>
          </button>
          {visibleProducts.map((product, index) => (
            <button key={product.id} type="button" className="worker-media-tile" onClick={() => setViewerIndex(index)}>
              {isVideoUrl(product.media_url) ? <video src={product.media_url} muted playsInline preload="metadata" /> : <img src={product.media_url} alt="" />}
              {isVideoUrl(product.media_url) ? <span className="worker-media-play"><Play size={16} fill="currentColor" /></span> : null}
              <span className="worker-media-meta">
                <b>{product.title}</b>
                <small>{formatProductPrice(product.price)}</small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="worker-first-video supplier-first-product" onClick={() => setUploadSheetOpen(true)}>
          <Film size={32} />
          <strong>Carga tu primer producto</strong>
          <span>Mostra stock real. Que te escriban listos para comprar.</span>
          <em>Subir video o foto</em>
        </button>
      )}

      {activeProduct ? (
        <SupplierProductViewer
          products={visibleProducts}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onMove={(nextIndex) => setViewerIndex(Math.max(0, Math.min(visibleProducts.length - 1, nextIndex)))}
        />
      ) : null}

      {uploadSheetOpen ? (
        <div className="worker-bio-sheet" role="dialog" aria-modal="true">
          <div className="worker-upload-panel">
            <button type="button" className="worker-bio-close" onClick={() => setUploadSheetOpen(false)} aria-label="Cerrar">
              <X size={20} />
            </button>
            <strong>Nuevo producto</strong>
            <span>Mostra precio, stock o uso real. Menos vueltas, mas mensajes.</span>

            <div className="worker-upload-fields">
              <label>
                Producto
                <input value={productTitle} onChange={(event) => setProductTitle(event.target.value)} placeholder="Ej: cable 2.5mm, pintura, canilla..." />
              </label>
              <label>
                Detalle corto
                <input value={productDetail} onChange={(event) => setProductDetail(event.target.value)} placeholder="Stock, marca, zona, entrega..." />
              </label>
              <label>
                Precio opcional
                <input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} inputMode="decimal" placeholder="Ej: 85000" />
              </label>
            </div>

            <label className="worker-upload-drop">
              <UploadCloud size={22} />
              <b>Elegir video o foto</b>
              <small>Se guarda en tu local y puede salir en el feed.</small>
              <input type="file" accept="image/*,video/*" multiple onChange={(event) => handleProduct(event.target.files)} />
            </label>
          </div>
        </div>
      ) : null}

      <div className="worker-profile-actions">
        <button type="button" onClick={onSignOut} disabled={busy} className="worker-logout">
          <LogOut size={18} />
          {busy ? "Saliendo..." : "Cerrar sesion"}
        </button>
      </div>

      {editingBio && (
        <div className="worker-bio-sheet" role="dialog" aria-modal="true">
          <div className="worker-bio-panel">
            <button type="button" className="worker-bio-close" onClick={() => setEditingBio(false)} aria-label="Cerrar">
              <X size={20} />
            </button>
            <strong>Tu local</strong>
            <span>Deci que vendes y donde. Lo visual vende, esta parte cierra confianza.</span>

            <div className="worker-edit-grid">
              <label>
                Nombre del local
                <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Ferreteria Centro" />
              </label>
              <label>
                Categoria
                <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Electricidad, pintura, herramientas..." />
              </label>
              <label>
                Ciudad
                <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Asuncion" />
              </label>
              <label>
                WhatsApp o telefono
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0981..." />
              </label>
              <label className="worker-bio-field">
                Bio corta
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Stock real, retiro en local, envio rapido..." />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                saveBasics();
                setEditingBio(false);
              }}
              disabled={saving}
              className="worker-bio-save"
            >
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SupplierTrustReminder({ active = false, hasProducts = false, category = "", onClick }) {
  const title = active ? "Local activo" : hasProducts ? "Local casi listo" : "Abri tu local digital";
  const text = active
    ? "Responde rapido. La confianza trae recompra."
    : hasProducts
      ? "Completa datos y queda mas facil elegirte."
      : "Subi tu primer producto. Que te descubran en el feed.";

  return (
    <button type="button" onClick={onClick} className={`worker-trust-reminder supplier-trust-reminder ${active ? "verified" : ""}`}>
      <span className="worker-trust-icon">
        {active ? <BadgeCheck size={18} /> : <Sparkles size={18} />}
      </span>
      <div>
        <strong>{title}</strong>
        <small>{category ? `${category}. ${text}` : text}</small>
      </div>
      <em>{hasProducts ? "Vender" : "Subir"}</em>
    </button>
  );
}

function WorkerTrustReminder({ documents = [], verified = false }) {
  const required = ["identity_front", "identity_back", "selfie_document"];
  const uploaded = required.filter((type) => docIsUploaded(documents.find((doc) => doc.doc_type === type))).length;
  const complete = uploaded === required.length;

  let title = "Insignia azul";
  let text = "Subi tu cedula. Que el cliente confie antes de escribir.";
  let action = "Verificar";

  if (verified) {
    title = "Insignia activa";
    text = "Tu perfil ya transmite confianza.";
    action = "Activo";
  } else if (complete) {
    title = "En revision";
    text = "Tu insignia esta cerca.";
    action = "Ver";
  } else if (uploaded > 0) {
    title = `${uploaded}/3 pasos listos`;
    text = "Termina tu insignia cuando puedas.";
  }

  return (
    <Link href="/worker/verify" className={`worker-trust-reminder ${verified ? "verified" : ""}`}>
      <span className="worker-trust-icon">
        {verified ? <BadgeCheck size={18} /> : <ShieldCheck size={18} />}
      </span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      <em>{action}</em>
    </Link>
  );
}

function WorkerPostViewer({ posts = [], index = 0, commentsByPost, likesCount = 0, onClose, onMove }) {
  const viewerRef = useRef(null);

  useEffect(() => {
    const current = viewerRef.current?.children?.[index];
    current?.scrollIntoView({ block: "start" });
  }, [index]);

  return (
    <section className="worker-post-viewer" role="dialog" aria-modal="true">
      <header className="worker-post-viewer-top">
        <button type="button" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        <strong>Mis trabajos</strong>
        <span>{index + 1}/{posts.length}</span>
      </header>

      <div
        ref={viewerRef}
        className="worker-post-reels"
        onScroll={(event) => {
          const next = Math.round(event.currentTarget.scrollTop / Math.max(1, event.currentTarget.clientHeight));
          if (next !== index) onMove(next);
        }}
      >
        {posts.map((post) => {
          const comments = commentsByPost.get(post.id) || [];
          const copy = splitPostCaption(post.caption);
          return (
            <article key={post.id} className="worker-post-reel">
              <div className="worker-post-media">
                {post.media_type === "video" ? (
                  <video src={post.media_url} controls playsInline />
                ) : (
                  <img src={post.media_url} alt="" />
                )}
              </div>

              <div className="worker-post-copy">
                <div>
                  <strong>{copy.title}</strong>
                  {copy.detail ? <p>{copy.detail}</p> : null}
                  <span>{formatPostDate(post.created_at)}</span>
                </div>
                <div className="worker-post-metrics">
                  <span><Heart size={17} />{likesCount}</span>
                  <span><MessageCircle size={17} />{comments.length}</span>
                </div>
              </div>

              {comments.length ? (
                <div className="worker-post-comments">
                  {comments.slice(0, 3).map((comment) => (
                    <p key={comment.id}>{comment.body}</p>
                  ))}
                </div>
              ) : (
                <p className="worker-post-empty">Todavia sin comentarios.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SupplierProductViewer({ products = [], index = 0, onClose, onMove }) {
  const viewerRef = useRef(null);

  useEffect(() => {
    const current = viewerRef.current?.children?.[index];
    current?.scrollIntoView({ block: "start" });
  }, [index]);

  return (
    <section className="worker-post-viewer" role="dialog" aria-modal="true">
      <header className="worker-post-viewer-top">
        <button type="button" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        <strong>Mi local</strong>
        <span>{index + 1}/{products.length}</span>
      </header>

      <div
        ref={viewerRef}
        className="worker-post-reels"
        onScroll={(event) => {
          const next = Math.round(event.currentTarget.scrollTop / Math.max(1, event.currentTarget.clientHeight));
          if (next !== index) onMove(next);
        }}
      >
        {products.map((product) => (
          <article key={product.id} className="worker-post-reel">
            <div className="worker-post-media">
              {isVideoUrl(product.media_url) ? (
                <video src={product.media_url} controls playsInline />
              ) : (
                <img src={product.media_url} alt="" />
              )}
            </div>

            <div className="worker-post-copy supplier-product-copy">
              <div>
                <strong>{product.title}</strong>
                {product.description ? <p>{product.description}</p> : null}
                <span>{formatPostDate(product.created_at)}</span>
              </div>
              <div className="worker-post-metrics">
                <span><MessageCircle size={17} />Chat</span>
                <span>{formatProductPrice(product.price)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkerVerificationScreen({ profile, workerProfile, documents = [], notice, onUpload }) {
  const steps = [
    {
      type: "identity_front",
      title: "Cedula frente",
      text: "Foto clara. Sin reflejos.",
      icon: ShieldCheck,
      accept: "image/*,application/pdf",
    },
    {
      type: "identity_back",
      title: "Cedula dorso",
      text: "El segundo lado y listo.",
      icon: ShieldCheck,
      accept: "image/*,application/pdf",
    },
    {
      type: "selfie_document",
      title: "Selfie con cedula",
      text: "Tu cara y cedula en mano.",
      icon: Camera,
      accept: "image/*",
    },
  ];
  const uploaded = steps.filter((step) => docIsUploaded(documents.find((doc) => doc.doc_type === step.type))).length;
  const activeIndex = steps.findIndex((step) => !docIsUploaded(documents.find((doc) => doc.doc_type === step.type)));
  const complete = activeIndex === -1;
  const verified = profile?.verified || workerProfile?.verification_status === "approved";
  const progress = verified ? 100 : Math.round((uploaded / steps.length) * 100);

  return (
    <section className="worker-verification-screen">
      <div className="verification-hero-card">
        <div className="verification-hero-top">
          <span className="verification-icon">
            {verified ? <BadgeCheck size={24} /> : <ShieldCheck size={24} />}
          </span>
          <span className="verification-status-pill">{verified ? "Activa" : `${uploaded}/3 listo`}</span>
        </div>

        <h1>{verified ? "Ya tenes insignia azul" : "Mostra que sos real"}</h1>
        <p>
          {verified
            ? "Tu perfil queda marcado como trabajador verificado."
            : complete
              ? "Tus documentos estan en revision. Cuando se aprueben, aparece tu insignia."
              : "La insignia azul hace que el cliente se anime mas rapido a escribirte."}
        </p>

        <div className="verification-progress" aria-label={`Progreso ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {notice ? <p className="worker-profile-notice">{notice}</p> : null}

      <div className="verification-flow">
        {steps.map((step, index) => {
          const doc = documents.find((item) => item.doc_type === step.type);
          const done = docIsUploaded(doc);
          const active = !verified && !done && index === activeIndex;
          const locked = !verified && !done && activeIndex !== -1 && index > activeIndex;
          const Icon = done ? BadgeCheck : step.icon;

          return (
            <label
              key={step.type}
              className={`verification-step ${done ? "done" : ""} ${active ? "active" : ""} ${locked ? "locked" : ""}`}
            >
              <span className="verification-step-icon">
                <Icon size={20} />
              </span>
              <div>
                <small>Paso {index + 1}</small>
                <strong>{step.title}</strong>
                <p>{done ? statusLabel(doc?.status) : step.text}</p>
              </div>
              <em>{done ? "Listo" : locked ? "Despues" : "Subir"}</em>
              {!verified && !locked ? (
                <input type="file" accept={step.accept} onChange={(event) => onUpload(step.type, event.target.files?.[0])} />
              ) : null}
            </label>
          );
        })}
      </div>

      <div className="verification-tip">
        <Sparkles size={17} />
        <span>Primero identidad, despues mas mensajes. Simple y serio.</span>
      </div>
    </section>
  );
}

function documentPayloadForType(docType, path) {
  if (docType === "identity_front") return { front_url: path, file_url: path };
  if (docType === "identity_back") return { back_url: path, file_url: path };
  return { file_url: path };
}

function docIsUploaded(doc) {
  return Boolean(doc?.file_url || doc?.front_url || doc?.back_url);
}

function composePostCaption(title, detail, fallback) {
  const safeTitle = title.trim() || fallback || "Mi trabajo";
  const safeDetail = detail.trim();
  return safeDetail ? `${safeTitle}\n${safeDetail}` : safeTitle;
}

function splitPostCaption(caption) {
  const [title, ...detail] = String(caption || "").split("\n");
  return {
    title: title.trim() || "Mi trabajo",
    detail: detail.join(" ").trim(),
  };
}

function slugifyLite(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || null;
}

function isVideoUrl(value) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(String(value || ""));
}

function formatProductPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return "Consultar";
  try {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${Math.round(price)} Gs`;
  }
}

function statusLabel(status) {
  if (status === "approved") return "Aprobado";
  if (status === "rejected") return "Revisar";
  return "En revision";
}

function formatPostDate(value) {
  if (!value) return "Ahora";
  try {
    return new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "short" }).format(new Date(value));
  } catch {
    return "Reciente";
  }
}

function labelForRole(role) {
  if (role === "worker") return "Trabajador";
  if (role === "supplier") return "Proveedor";
  if (role === "admin") return "Admin";
  return "Cliente";
}
