export interface ProfileUpdateData {
    fullName: string;
    phone?: string;
    dob?: string;
}

export interface ProfileUpdateResponse {
    message?: string;
    error?: string;
}

export class ProfileService {
    private static baseUrl = '/api';

    /**
     * Atualiza os dados do perfil do usuário através da API
     */
    static async updateProfile(data: ProfileUpdateData): Promise<ProfileUpdateResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                return { error: result.error || 'Erro desconhecido ao atualizar o perfil.' };
            }

            return { message: result.message };

        } catch (error) {
            console.error('Erro na requisição de atualização de perfil:', error);
            return { error: 'Falha de conexão. Não foi possível salvar as alterações.' };
        }
    }
}
