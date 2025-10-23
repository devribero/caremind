"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { useAuthRequest } from "@/hooks/useAuthRequest";

interface AddIdosoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddIdosoModal({ isOpen, onClose, onSuccess }: AddIdosoModalProps) {
  const { makeRequest } = useAuthRequest();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!nome.trim()) return "Informe o nome completo do idoso.";
    if (!email.trim()) return "Informe o e-mail do idoso.";
    const emailOk = /.+@.+\..+/.test(email);
    if (!emailOk) return "Informe um e-mail válido.";
    if (!senha || senha.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await makeRequest("/api/criar-idoso", {
        method: "POST",
        body: JSON.stringify({
          nome_idoso: nome.trim(),
          email_idoso: email.trim(),
          senha_idoso: senha,
        }),
      });
      alert("Idoso adicionado e vinculado com sucesso!");
      onClose();
      setNome("");
      setEmail("");
      setSenha("");
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Não foi possível criar e vincular o idoso.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar e Conectar Perfil de Idoso">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {error && (
          <div style={{ color: "#b91c1c", background: "#fee2e2", padding: "8px 10px", borderRadius: 6, fontSize: 14 }}>
            {error}
          </div>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Nome Completo do Idoso</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Maria da Silva"
            required
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>E-mail do Idoso</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="idoso@exemplo.com"
            required
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Senha Inicial</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            required
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{ padding: "10px 14px", borderRadius: 8, background: "#e5e7eb", color: "#111827", fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{ padding: "10px 14px", borderRadius: 8, background: "#111827", color: "white", fontWeight: 600 }}
          >
            {isLoading ? "Adicionando..." : "Adicionar e Conectar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
