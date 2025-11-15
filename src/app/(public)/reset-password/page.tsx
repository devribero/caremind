"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Footer } from "@/components/shared/Footer";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setError(error.message);
      setMessage("Senha atualizada com sucesso. Faça login novamente.");
      setTimeout(() => router.replace("/auth"), 1200);
    } catch (err) {
      setError("Não foi possível atualizar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ background: "white", padding: 24, borderRadius: 12, maxWidth: 400, width: "100%", boxShadow: "0 10px 30px rgba(147, 155, 238, 0.2)" }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0400BA", textAlign: "center" }}>Redefinir senha</h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            <label>
              Nova senha
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e0e7ff", marginTop: 6 }} />
            </label>
            <label>
              Confirmar senha
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #e0e7ff", marginTop: 6 }} />
            </label>
            {error && <div style={{ color: "#c53030", fontSize: 14 }}>{error}</div>}
            {message && <div style={{ color: "#2f855a", fontSize: 14 }}>{message}</div>}
            <button type="submit" disabled={loading} style={{ marginTop: 8, background: "linear-gradient(135deg,#0400ba,#020054)", color: "white", padding: 12, borderRadius: 10, border: "none", fontWeight: 700 }}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}
