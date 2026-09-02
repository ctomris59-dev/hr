"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { setStorageData, STORAGE_KEYS } from "../../utils/storage";

interface AuthStatus { ready?: boolean; secure_auth_enabled?: boolean; database_configured?: boolean; }
interface SsoStatus { google?: { configured?: boolean; state?: string; redirectUri?: string }; entra?: { configured?: boolean; state?: string; redirectUri?: string }; mapping?: string; autoProvisioning?: boolean; }

const SSO_ERROR_LABELS:Record<string,string>={
  unsupported_provider:"Desteklenmeyen SSO sağlayıcısı.",invalid_state:"SSO güvenlik doğrulaması geçersiz veya süresi dolmuş.",provider_not_configured:"SSO sağlayıcı credential yapılandırması eksik.",token_exchange_failed:"Kimlik sağlayıcı oturumu doğrulanamadı.",account_not_mapped:"Bu e-posta için aktif FutureHR hesabı bulunamadı. İK yöneticinizle görüşün.",futurehr_exchange_failed:"FutureHR oturumu oluşturulamadı.",sso_unavailable:"SSO servisine şu anda ulaşılamıyor.",
};

export default function SecureLoginPage() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [ssoStatus, setSsoStatus] = useState<SsoStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/secure-auth/status", { cache: "no-store" }).then((response) => response.json()).then(setStatus).catch(() => setStatus({ ready: false }));
    fetch("/api/sso/status", { cache: "no-store" }).then((response) => response.json()).then(setSsoStatus).catch(() => setSsoStatus({}));
    const code=new URLSearchParams(window.location.search).get("sso_error");
    if(code)setError(SSO_ERROR_LABELS[code]||"SSO girişi tamamlanamadı.");
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();setError("");setLoading(true);
    try {
      const response = await fetch("/api/secure-auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenant_slug: tenantSlug, username, password }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.user) throw new Error(payload?.error || "Giriş başarısız.");
      const secureUser = payload.user;
      const compatibleUser = { username: secureUser.username, name: secureUser.employee_name || secureUser.username, role: secureUser.role, dept: secureUser.department || "", department: secureUser.department || "", position: secureUser.position || "", employeeId: secureUser.employee_id, tenantId: secureUser.tenant_id, tenantSlug: secureUser.tenant_slug, tenantName: secureUser.tenant_name, authMode: "secure" };
      setStorageData(STORAGE_KEYS.CURRENT_USER, compatibleUser);window.dispatchEvent(new CustomEvent("userChanged", { detail: compatibleUser }));router.push("/dashboard");router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Giriş başarısız."); } finally { setLoading(false); }
  };

  const startSso=(provider:"google"|"entra")=>{
    setError("");
    if(!tenantSlug.trim()){setError("Google veya Microsoft ile giriş için önce şirket kodunu yazın.");return;}
    const configured=provider==="google"?ssoStatus?.google?.configured:ssoStatus?.entra?.configured;
    if(!configured){setError(`${provider==="google"?"Google":"Microsoft Entra"} SSO credential yapılandırması henüz tamamlanmadı.`);return;}
    window.location.assign(`/api/sso/${provider}/start?tenant=${encodeURIComponent(tenantSlug.trim())}`);
  };

  const ready = status?.ready === true;
  const googleReady=ssoStatus?.google?.configured===true;
  const entraReady=ssoStatus?.entra?.configured===true;

  return (
    <main className="min-h-screen bg-[#f4f6f9] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-[#101722] p-8 text-white sm:p-10 lg:p-12">
          <div><div className="text-[44px] font-bold lowercase leading-none tracking-[-0.06em]">future <span className="text-teal-300">hr</span></div><p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">Kurumsal çalışma alanınıza şirket kodunuz ve güvenli kullanıcı hesabınızla giriş yapın.</p></div>
          <div className="space-y-3 py-10">
            <SecurityItem title="Şifreler hash olarak saklanır" text="Argon2 tabanlı parola koruması; düz metin şifre tutulmaz." />
            <SecurityItem title="SSO fail-closed çalışır" text="Google veya Entra kimliği yalnız mevcut aktif FutureHR hesabının doğrulanmış e-postasıyla eşleşirse oturum açar; otomatik kullanıcı/rol oluşturulmaz." />
            <SecurityItem title="Şirket verisi ayrıştırılır" text="Her istek tenant/company kimliği ile backend tarafında sınırlandırılır." />
            <SecurityItem title="Oturum sunucu tarafında korunur" text="Access ve refresh tokenlar JavaScript tarafından okunamayan HttpOnly cookie içinde tutulur." />
          </div>
          <p className="text-xs leading-5 text-slate-500">Demo prototip ayrı çalışmaya devam eder. Bu ekran gerçek SaaS veri katmanı içindir.</p>
        </section>

        <section className="flex items-center p-6 sm:p-10 lg:p-12"><div className="w-full">
          <div className="mb-7 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Kurumsal giriş</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">FutureHR güvenli oturum</h1></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><ShieldCheck className="h-3.5 w-3.5" />{status === null ? "Kontrol ediliyor" : ready ? "Hazır" : "Kurulum bekliyor"}</span></div>
          {!ready && status !== null && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">PostgreSQL / güvenli auth henüz production ortamında etkin değil. Mevcut demo etkilenmeden çalışmaya devam ediyor.</div>}

          <div className="mb-4"><InputShell icon={Building2} label="Şirket kodu"><input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} required autoComplete="organization" placeholder="ornek-sirket" className="h-12 w-full bg-transparent pl-10 pr-3 text-sm outline-none" /></InputShell></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={()=>startSso("entra")} disabled={!entraReady} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"><span className="grid h-4 w-4 grid-cols-2 gap-[1px]"><i className="bg-[#f25022]"/><i className="bg-[#7fba00]"/><i className="bg-[#00a4ef]"/><i className="bg-[#ffb900]"/></span><span>{entraReady?"Microsoft ile devam et":"Microsoft · credential bekliyor"}</span></button>
            <button type="button" onClick={()=>startSso("google")} disabled={!googleReady} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[12px] font-bold text-blue-600">G</span><span>{googleReady?"Google ile devam et":"Google · credential bekliyor"}</span></button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-400">SSO yeni kullanıcı oluşturmaz. Kimlik sağlayıcısındaki doğrulanmış e-posta, aynı şirket içindeki mevcut aktif FutureHR hesabıyla eşleşmelidir.</p>

          <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200"/><span className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">veya kullanıcı adı</span><span className="h-px flex-1 bg-slate-200"/></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputShell icon={UserRound} label="Kullanıcı adı"><input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" placeholder="kullanici.adi" className="h-12 w-full bg-transparent pl-10 pr-3 text-sm outline-none" /></InputShell>
            <InputShell icon={LockKeyhole} label="Şifre"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" className="h-12 w-full bg-transparent pl-10 pr-11 text-sm outline-none" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-[34px] text-slate-400" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></InputShell>
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium leading-5 text-red-700">{error}</div>}
            <button disabled={loading || !ready} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101722] text-sm font-semibold text-white transition hover:bg-[#172231] disabled:cursor-not-allowed disabled:opacity-45">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}{loading ? "Giriş yapılıyor…" : "Güvenli giriş yap"}</button>
          </form>
          <div className="mt-6 flex items-center justify-between gap-4 text-xs"><Link href="/" className="font-semibold text-indigo-600 hover:text-indigo-700">Demo girişine dön</Link><span className="text-slate-400">FutureHR SaaS Core v1</span></div>
        </div></section>
      </div>
    </main>
  );
}

function InputShell({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600"><span>{label}</span><div className="relative mt-1.5 rounded-xl border border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50"><Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />{children}</div></label>; }
function SecurityItem({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4"><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div>; }
