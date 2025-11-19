"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/features/Modal";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/features/Toast";
import styles from "./EditIdosoModal.module.css";
import { atualizarPerfilIdoso } from "@/lib/supabase/services/vinculos";

type IdosoFormData = {
  nome: string;
  telefone: string;
  data_nascimento: string;
  foto_usuario: string;
};

interface EditIdosoModalProps {
  isOpen: boolean;
  idosoId?: string | null;
  initialData?: IdosoFormData;
  onClose: () => void;
  onSaved?: () => void;
}

const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "avatars";

export default function EditIdosoModal({
  isOpen,
  idosoId,
  initialData,
  onClose,
  onSaved,
}: EditIdosoModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [formData, setFormData] = useState<IdosoFormData>({
    nome: "",
    telefone: "",
    data_nascimento: "",
    foto_usuario: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        nome: "",
        telefone: "",
        data_nascimento: "",
        foto_usuario: "",
      });
    }
  }, [initialData, idosoId, isOpen]);

  if (!isOpen || !idosoId) {
    return null;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !idosoId) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `profiles/${idosoId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData, error: urlError } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (urlError) {
        throw urlError;
      }

      setFormData((prev) => ({ ...prev, foto_usuario: publicData.publicUrl }));
      toast.success("Foto atualizada! Ainda falta salvar as alterações.");
    } catch (err) {
      console.error("Erro ao subir foto do idoso:", err);
      toast.error("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!idosoId) return;

    if (!formData.nome.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    setError(null);

    try {
      setSaving(true);
      await atualizarPerfilIdoso({
        idosoId,
        nome: formData.nome,
        telefone: formData.telefone,
        data_nascimento: formData.data_nascimento,
        foto_usuario: formData.foto_usuario,
      });

      toast.success("Perfil do idoso atualizado com sucesso!");
      onSaved?.();
    } catch (err) {
      console.error("Erro ao salvar perfil do idoso:", err);
      toast.error("Não foi possível salvar. Tente novamente.");
      setError("Erro ao salvar. Confira os dados e tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar perfil do idoso">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.photoRow}>
          <div className={styles.photoPreview}>
            <Image
              src={formData.foto_usuario || "/icons/foto_padrao.png"}
              alt={formData.nome || "Foto do idoso"}
              width={96}
              height={96}
            />
          </div>
          <label className={styles.uploadButton}>
            {uploading ? "Enviando..." : "Trocar foto"}
            <input
              type="file"
              accept="image/png, image/jpeg"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Nome completo</span>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            placeholder="Ex.: Maria da Silva"
            required
            disabled={saving}
          />
        </label>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span>Telefone</span>
            <input
              type="tel"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="(11) 99999-0000"
              disabled={saving}
            />
          </label>
          <label className={styles.field}>
            <span>Data de nascimento</span>
            <input
              type="date"
              name="data_nascimento"
              value={formData.data_nascimento}
              onChange={handleChange}
              disabled={saving}
            />
          </label>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.cancel}`}
            onClick={onClose}
            disabled={saving || uploading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
            disabled={saving || uploading}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

