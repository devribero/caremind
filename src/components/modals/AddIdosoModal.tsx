"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { useAuthRequest } from "@/hooks/useAuthRequest";
import { toast } from "@/components/Toast";
import styles from "./AddIdosoModal.module.css";

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
      toast.success("Idoso adicionado e vinculado com sucesso!");
      onClose();
      setNome("");
      setEmail("");
      setSenha("");
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Não foi possível criar e vincular o idoso.");
      toast.error(err?.message || "Não foi possível criar e vincular o idoso.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar e Conectar Perfil de Idoso">
      <form onSubmit={handleSubmit} className={styles.form} autoComplete="off">
        {error && (
          <div className={styles.error}>{error}</div>
        )}
        <label className={styles.label}>
          <span className={styles.labelText}>Nome Completo do Idoso</span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Maria da Silva"
            required
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelText}>E-mail do Idoso</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="idoso@exemplo.com"
            required
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            name="idoso_email"
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          <span className={styles.labelText}>Senha Inicial</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            required
            autoComplete="new-password"
            name="idoso_new_password"
            className={styles.input}
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`${styles.btn} ${styles.cancel}`}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.btn} ${styles.primary}`}
          >
            {isLoading ? "Adicionando..." : "Adicionar e Conectar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
