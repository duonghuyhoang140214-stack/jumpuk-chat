import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PigLogo } from "@/components/PigLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/app", replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || "Jumpuker" },
          },
        });
        if (error) throw error;
        toast.success("Tạo tài khoản thành công!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-app">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="rounded-full bg-card p-3 shadow-pink">
            <PigLogo size={72} />
          </div>
          <h1 className="text-3xl text-primary">Jumpuk Chat</h1>
          <p className="text-sm text-muted-foreground text-center">Nhắn tin & gọi online cực dễ thương 🐷</p>
        </div>

        <div className="flex rounded-full bg-secondary p-1 mb-6">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                mode === m ? "bg-primary text-primary-foreground shadow-pink" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3 bg-card p-6 rounded-3xl shadow-card">
          {mode === "signup" && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên hiển thị"
              className="w-full rounded-2xl bg-muted px-4 py-3 outline-none focus:ring-2 ring-primary"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-2xl bg-muted px-4 py-3 outline-none focus:ring-2 ring-primary"
          />
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu (≥6 ký tự)"
            className="w-full rounded-2xl bg-muted px-4 py-3 outline-none focus:ring-2 ring-primary"
          />
          <button
            disabled={busy}
            className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground shadow-pink active:scale-95 transition disabled:opacity-50"
          >
            {busy ? "..." : mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </div>
    </div>
  );
}
