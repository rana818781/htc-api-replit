import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";

type Tab = "login" | "signup";

export default function AuthPage({ defaultTab = "login" }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-md">
        <div className="flex rounded-xl border border-white/10 overflow-hidden mb-8">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "login"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(""); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "signup"
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-white/70 mb-2">
              {tab === "login" ? "Email" : "Username"}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={tab === "login" ? "you@example.com" : "Choose a username"}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "signup" ? "Min. 6 characters" : "Your password"}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors pr-12"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                {tab === "login" ? "Signing in..." : "Creating account..."}
              </span>
            ) : (
              tab === "login" ? "Sign in" : "Create account"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-white/40 hover:text-white/60 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
