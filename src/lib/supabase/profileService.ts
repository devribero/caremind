import { createClient } from './client';
import { Database } from '@/types/supabase';

// Tipo completo da tabela (gerado automaticamente)
type DBProfile = Database['public']['Tables']['perfis']['Row'];

// Tipo reduzido: só os campos que você realmente usa no frontend
export type ProfilePreview = {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'individual' | 'familiar' | null;
  foto_usuario: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  timezone: string | null;
};

// Tipo para upsert (campos que você envia)
export interface ProfileUpsertData {
  user_id: string;
  nome: string;
  tipo?: 'individual' | 'familiar';
  data_nascimento?: string | null;
  telefone?: string | null;
  foto_usuario?: string | null;
  timezone?: string | null;
}

export class ProfileService {
  // 1. Perfil do usuário logado
  static async getProfile(userId: string): Promise<ProfilePreview | null> {
    const supabase = createClient();

    // Verifica se há sessão ativa antes de fazer a requisição
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    // Usa maybeSingle() em vez de single() para evitar erro quando não há dados
    const { data, error } = await supabase
      .from('perfis')
      .select('id, user_id, nome, tipo, foto_usuario, data_nascimento, telefone, timezone')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // 406 Not Acceptable - geralmente relacionado a RLS ou headers
      if (error.message?.includes('406')) {
        return null;
      }
      console.error('Erro ao buscar perfil:', error);
      return null;
    }

    // Se não encontrou perfil, cria automaticamente
    if (!data) {
      // Obtém informações do usuário do Supabase Auth
      const accountType = session.user.user_metadata?.account_type;

      // Se o usuário é do tipo 'idoso', NÃO auto-criar perfil
      // A edge function criar-idoso é responsável por criar o perfil
      if (accountType === 'idoso') {
        console.log('Usuário idoso sem perfil - aguardando edge function');
        return null;
      }

      const userEmail = session.user.email || '';
      const userName = session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.user_metadata?.nome ||
        userEmail.split('@')[0] ||
        'Usuário';

      try {
        // Usa upsertProfile que já trata a criação/atualização corretamente
        const newProfileData: ProfileUpsertData = {
          user_id: userId,
          nome: userName,
          data_nascimento: null,
          telefone: null,
          foto_usuario: null,
        };

        const createdProfile = await this.upsertProfile(newProfileData);
        return createdProfile;
      } catch (createError) {
        console.error('Erro ao criar perfil automaticamente:', createError);
        return null;
      }
    }

    return data as ProfilePreview | null;
  }

  // 2. Criar ou atualizar perfil
  static async upsertProfile(profileData: ProfileUpsertData): Promise<ProfilePreview> {
    const supabase = createClient();

    // Primeiro tenta buscar o perfil existente para obter o id
    const { data: existingProfile } = await supabase
      .from('perfis')
      .select('id')
      .eq('user_id', profileData.user_id)
      .maybeSingle();

    // Prepara os dados para upsert
    const upsertData: any = {
      user_id: profileData.user_id,
      nome: profileData.nome,
    };

    // Se o perfil já existe, inclui o id para fazer update
    if (existingProfile?.id) {
      upsertData.id = existingProfile.id;
    } else {
      // Se não existe, usa o user_id como id (foreign key para auth.users.id)
      // O id do perfil deve ser o mesmo UUID do usuário no auth.users
      upsertData.id = profileData.user_id;
    }

    // Adiciona campos opcionais se fornecidos
    if (profileData.tipo !== undefined) upsertData.tipo = profileData.tipo;
    if (profileData.data_nascimento !== undefined) upsertData.data_nascimento = profileData.data_nascimento;
    if (profileData.telefone !== undefined) upsertData.telefone = profileData.telefone;
    if (profileData.foto_usuario !== undefined) upsertData.foto_usuario = profileData.foto_usuario;
    if (profileData.timezone !== undefined) upsertData.timezone = profileData.timezone;

    const { data, error } = await supabase
      .from('perfis')
      .upsert(upsertData, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })
      .select('id, user_id, nome, tipo, foto_usuario, data_nascimento, telefone, timezone')
      .single();

    if (error) {
      console.error('Erro ao salvar perfil:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2)
      });
      throw new Error(`Falha ao salvar perfil: ${error.message || 'Erro desconhecido'}`);
    }

    return data as ProfilePreview;
  }

  // 3. Atualizar foto
  static async updateProfilePhoto(userId: string, photoUrl: string): Promise<boolean> {
    const supabase = createClient();
    const { error, count } = await supabase
      .from('perfis')
      .update({ foto_usuario: photoUrl })
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao atualizar foto:', error);
      return false;
    }
    return (count ?? 0) > 0;
  }

  // 4. Deletar perfil
  static async deleteProfile(userId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('perfis')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao deletar perfil:', error);
      return false;
    }
    return true;
  }

  // 5. Vincular familiar ao idoso
  static async linkFamilyMember(elderlyProfileId: string, familyMemberProfileId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('vinculos_familiares')
      .upsert(
        { id_idoso: elderlyProfileId, id_familiar: familyMemberProfileId },
        { onConflict: 'id_idoso,id_familiar', ignoreDuplicates: true }
      );

    if (error) {
      console.error('Erro ao vincular familiar:', error);
      return false;
    }
    return true;
  }

  // 6. Desvincular
  static async unlinkFamilyMember(elderlyProfileId: string, familyMemberProfileId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('vinculos_familiares')
      .delete()
      .eq('id_idoso', elderlyProfileId)
      .eq('id_familiar', familyMemberProfileId);

    if (error) {
      console.error('Erro ao desvincular:', error);
      return false;
    }
    return true;
  }

  // 7. Lista de idosos que o familiar logado acompanha
  static async getMyElderly(familyUserId: string): Promise<ProfilePreview[]> {
    const supabase = createClient();

    const { data: links } = await supabase
      .from('vinculos_familiares')
      .select('id_idoso')
      .eq('id_familiar', familyUserId);

    if (!links || links.length === 0) return [];

    const elderlyIds = links.map(l => l.id_idoso);

    const { data, error } = await supabase
      .from('perfis')
      .select('id, user_id, nome, tipo, foto_usuario, data_nascimento, telefone, timezone')
      .in('id', elderlyIds)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar idosos:', error);
      return [];
    }

    return data as ProfilePreview[];
  }

  // 8. Familiares de um idoso específico (ex: tela de detalhes do idoso)
  static async getFamilyMembersOfElderly(elderlyProfileId: string): Promise<ProfilePreview[]> {
    const supabase = createClient();

    const { data: links } = await supabase
      .from('vinculos_familiares')
      .select('id_familiar')
      .eq('id_idoso', elderlyProfileId);

    if (!links || links.length === 0) return [];

    const familyIds = links.map(l => l.id_familiar);

    const { data, error } = await supabase
      .from('perfis')
      .select('id, user_id, nome, tipo, foto_usuario, data_nascimento, telefone, timezone')
      .in('id', familyIds);

    if (error) {
      console.error('Erro ao buscar familiares:', error);
      return [];
    }

    return data as ProfilePreview[];
  }

  // 9. Buscar por telefone (convite)
  static async getProfileByPhone(phone: string): Promise<ProfilePreview | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('perfis')
      .select('id, user_id, nome, tipo, foto_usuario, telefone')
      .eq('telefone', phone)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') console.error('Erro busca por telefone:', error);
      return null;
    }

    return data as ProfilePreview;
  }
}

export default ProfileService;