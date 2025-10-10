// src/lib/services/passwordService.ts

import { SupabaseClient } from '@supabase/supabase-js';

// Definição da interface (garantindo a exportação)
export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

// Definição da classe (garantindo a exportação)
export class PasswordService {
    private supabase: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Tenta reautenticar o usuário com a senha atual antes de trocar para a nova senha.
     * Isso é necessário para proteger a conta de ataques de Sessão Fixa.
     * @param data { currentPassword: string, newPassword: string }
     * @returns { error: Error | null }
     */
    async changePassword(data: ChangePasswordData): Promise<{ error: Error | null }> {
        const { currentPassword, newPassword } = data;

        // 1. Obter o e-mail do usuário logado
        const { data: userData, error: userError } = await this.supabase.auth.getUser();

        if (userError || !userData.user?.email) {
            return { error: new Error("Usuário não autenticado ou e-mail indisponível.") };
        }

        const userEmail = userData.user.email;

        // 2. Reautenticar (tentar login) com a senha atual
        const { error: reauthError } = await this.supabase.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword,
        });

        if (reauthError) {
            // Se a reautenticação falhar, a senha atual está errada.
            // Erro comum do Supabase: "Invalid login credentials"
            return { error: new Error("A senha atual informada está incorreta.") };
        }

        // 3. Se a reautenticação for bem-sucedida, atualize a senha.
        const { error: updateError } = await this.supabase.auth.updateUser({
            password: newPassword,
        });

        if (updateError) {
            return { error: updateError };
        }

        // Se tudo ocorrer bem
        return { error: null };
    }
}