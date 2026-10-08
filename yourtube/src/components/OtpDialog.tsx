import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function OtpDialog() {
  const { otpChallenge, verifyOtp, logout } = useAuth();
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setCode(""); setError(""); }, [otpChallenge?.challengeId]);
  if (!otpChallenge) return null;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await verifyOtp(code, trust); toast.success("Sign-in verified"); }
    catch (cause) { setError((cause as { response?: { data?: { message?: string } } }).response?.data?.message || "Verification failed. Check the code and try again."); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="otp-title">
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
      <div className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700"><ShieldCheck size={23}/></div>
      <h2 id="otp-title" className="text-xl font-bold text-gray-900">Verify your sign-in</h2>
      <p className="mt-2 text-sm leading-5 text-gray-600">We sent a six-digit verification code to your account email.</p>
      <label className="mt-5 block text-sm font-semibold text-gray-800" htmlFor="otp-code">Verification code</label>
      <input id="otp-code" aria-describedby={error ? "otp-error" : undefined} aria-invalid={Boolean(error)} value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} inputMode="numeric" autoComplete="one-time-code" className="ui-input mt-2 h-12 text-center text-xl tracking-[.42em]" maxLength={6} autoFocus />
      {error && <p id="otp-error" role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <label className="mt-4 flex items-start gap-2 text-sm text-gray-600"><input type="checkbox" checked={trust} onChange={event => setTrust(event.target.checked)} className="mt-0.5"/> Trust this browser for 30 days</label>
      <button disabled={busy || code.length !== 6} className="ui-button ui-button-primary mt-5 w-full">{busy ? "Verifying…" : "Verify code"}</button>
      <button type="button" onClick={() => logout()} className="mt-3 w-full text-sm font-medium text-gray-600 hover:text-gray-900">Cancel sign-in</button>
    </form>
  </div>;
}
