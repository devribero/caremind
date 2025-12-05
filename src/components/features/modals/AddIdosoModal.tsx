"use client";

import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Modal } from "@/components/features/Modal";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/features/Toast";
import styles from "./AddIdosoModal.module.css";

interface AddIdosoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddIdosoModal({ isOpen, onClose, onSuccess }: AddIdosoModalProps) {
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const nomeTrimmed = nome.trim();
      const emailTrimmed = email.trim();

      // Log para debug
      console.log('Enviando dados para criar idoso:', {
        nome_idoso: nomeTrimmed,
        email_idoso: emailTrimmed,
        senha_length: senha.length
      });

      // Chamar a Edge Function criar-idoso
      const { data, error: functionError } = await supabase.functions.invoke('criar-idoso', {
        body: {
          nome_idoso: nomeTrimmed,
          email_idoso: emailTrimmed,
          senha_idoso: senha,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao criar idoso');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Não foi possível criar e vincular o idoso.');
      }

      toast.success("Idoso adicionado e vinculado com sucesso!");
      onClose();
      setNome("");
      setEmail("");
      setSenha("");
      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.message || "Não foi possível criar e vincular o idoso.";
      setError(errorMessage);
      toast.error(errorMessage);
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
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              name="idoso_new_password"
              className={styles.input}
            />
            <button
              type="button"
              className={styles.togglePasswordBtn}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
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
