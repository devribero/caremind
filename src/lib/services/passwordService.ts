// lib/services/passwordService.ts
export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

export interface ChangePasswordResponse {
    message?: string;
    error?: string;
    user?: unknown;
}

export class PasswordService {
    private static baseUrl = '/api';

    /**
     * Altera a senha do usuário
     */
    static async changePassword(data: ChangePasswordData): Promise<ChangePasswordResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                return {
                    error: result.error || 'Erro ao alterar senha'
                };
            }

            return {
                message: result.message,
                user: result.user
            };

        } catch (error) {
            console.error('Erro na requisição:', error);
            return {
                error: 'Erro de conexão ao alterar senha'
            };
        }
    }

    /**
     * Testa se a API está funcionando
     */
    static async testAPI(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/change-password`);
            return response.ok;
        } catch {
            return false;
        }
    }
}