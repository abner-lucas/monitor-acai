import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser, AuthorizedUser } from '../types';

const STORAGE_KEY_AUTH = 'monitor_acai_auth_user_v1';
const STORAGE_KEY_AUTHORIZED_USERS = 'monitor_acai_authorized_users_v2';

export const SUPERUSER_EMAIL = 'abner.lucas@ifpa.edu.br';

export const DEFAULT_SUPERUSER: AuthorizedUser = {
  id: 'usr_superuser_abner',
  email: 'abner.lucas@ifpa.edu.br',
  fullName: 'Prof. Me. Ábner Lucas (Coordenador SAF)',
  role: 'superuser',
  password: 'Ifpa@2026',
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

// Fallback user for backwards compatibility
export const DEFAULT_DEMO_USER: AuthUser = {
  id: DEFAULT_SUPERUSER.id,
  email: DEFAULT_SUPERUSER.email,
  fullName: DEFAULT_SUPERUSER.fullName,
  role: DEFAULT_SUPERUSER.role,
};

class AuthService {
  private supabase: SupabaseClient | null = null;
  private listeners: Array<(user: AuthUser | null) => void> = [];

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
      } catch (err) {
        console.warn('Erro ao inicializar Supabase client no AuthService:', err);
      }
    }
  }

  public isCloudAuthEnabled(): boolean {
    return this.supabase !== null;
  }

  private notifyListeners(user: AuthUser | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(user);
      } catch (err) {
        console.error('Erro no listener de autenticação:', err);
      }
    });
  }

  public onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Obtém os usuários autorizados do sistema (do Supabase ou do cache local)
   */
  public async getAuthorizedUsers(): Promise<AuthorizedUser[]> {
    // 1. Tentar carregar do Supabase se disponível
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('authorized_users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: AuthorizedUser[] = data.map((u: any) => ({
            id: u.id || `usr_${Math.random()}`,
            email: String(u.email || '').toLowerCase().trim(),
            fullName: u.full_name || u.fullName || 'Pesquisador SAF',
            role: (u.role || 'pesquisador') as 'superuser' | 'pesquisador',
            password: u.password,
            isActive: u.is_active !== false,
            createdAt: u.created_at || new Date().toISOString(),
          }));

          // Garantir que o superusuário sempre esteja presente
          if (!mapped.some(u => u.email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase())) {
            mapped.unshift(DEFAULT_SUPERUSER);
          }

          this.saveLocalAuthorizedUsers(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase authorized_users inacessível, utilizando cache local:', err);
      }
    }

    // 2. Fallback: Cache local
    return this.getLocalAuthorizedUsers();
  }

  private getLocalAuthorizedUsers(): AuthorizedUser[] {
    if (typeof window === 'undefined') {
      return [DEFAULT_SUPERUSER];
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTHORIZED_USERS);
      let list: AuthorizedUser[] = stored ? JSON.parse(stored) : [];

      const superIndex = list.findIndex(u => u.email.toLowerCase() === SUPERUSER_EMAIL.toLowerCase());
      if (superIndex === -1) {
        list.unshift(DEFAULT_SUPERUSER);
        localStorage.setItem(STORAGE_KEY_AUTHORIZED_USERS, JSON.stringify(list));
      } else {
        // Assegurar campos cruciais do superusuário
        list[superIndex].role = 'superuser';
        if (!list[superIndex].password) {
          list[superIndex].password = DEFAULT_SUPERUSER.password;
        }
      }

      return list;
    } catch {
      return [DEFAULT_SUPERUSER];
    }
  }

  private saveLocalAuthorizedUsers(users: AuthorizedUser[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_AUTHORIZED_USERS, JSON.stringify(users));
      } catch (err) {
        console.error('Erro ao salvar authorized_users no localStorage:', err);
      }
    }
  }

  /**
   * Obtém o usuário atualmente autenticado na sessão
   */
  public async getCurrentUser(): Promise<AuthUser | null> {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_AUTH);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Realiza login estrito: valida se o email está na lista autorizada e confere a senha
   */
  public async signIn(credentials: { email: string; password: string }): Promise<{ user: AuthUser | null; error: string | null }> {
    const cleanEmail = credentials.email.trim().toLowerCase();
    const cleanPassword = credentials.password;

    if (!cleanEmail || !cleanPassword) {
      return { user: null, error: 'Por favor, informe o email e a senha de acesso.' };
    }

    // Busca usuários autorizados
    const authorizedUsers = await this.getAuthorizedUsers();
    const found = authorizedUsers.find(u => u.email.toLowerCase() === cleanEmail);

    if (!found) {
      return { 
        user: null, 
        error: 'Acesso negado: Este email não está na lista de pesquisadores autorizados. Solicite liberação ao coordenador Ábner Lucas (abner.lucas@ifpa.edu.br).' 
      };
    }

    if (!found.isActive) {
      return {
        user: null,
        error: 'Acesso suspenso: Este usuário foi desativado temporariamente pelo coordenador do projeto.'
      };
    }

    if (found.password !== cleanPassword) {
      return {
        user: null,
        error: 'Senha incorreta. Verifique suas credenciais ou solicite redefinição ao coordenador.'
      };
    }

    const authUser: AuthUser = {
      id: found.id,
      email: found.email,
      fullName: found.fullName,
      role: found.role,
    };

    this.saveLocalUser(authUser);
    this.notifyListeners(authUser);

    return { user: authUser, error: null };
  }

  /**
   * Cadastra e autoriza um novo pesquisador (recurso exclusivo do superusuário)
   */
  public async addAuthorizedUser(data: {
    email: string;
    fullName: string;
    role?: 'pesquisador' | 'superuser';
    password?: string;
  }): Promise<{ success: boolean; error?: string; user?: AuthorizedUser }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.fullName.trim();
    const role = data.role || 'pesquisador';
    const password = data.password || 'Ifpa@2026';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Informe um endereço de email válido.' };
    }

    if (!cleanName) {
      return { success: false, error: 'Informe o nome completo do pesquisador.' };
    }

    const existingUsers = await this.getAuthorizedUsers();
    if (existingUsers.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Este email já está cadastrado na lista de autorizados.' };
    }

    const newUser: AuthorizedUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      fullName: cleanName,
      role,
      password,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Salva localmente de imediato
    const updated = [...existingUsers, newUser];
    this.saveLocalAuthorizedUsers(updated);

    // Tenta persistir no Supabase caso a tabela exista
    if (this.supabase) {
      try {
        await this.supabase.from('authorized_users').upsert({
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.fullName,
          role: newUser.role,
          password: newUser.password,
          is_active: newUser.isActive,
          created_at: newUser.createdAt,
        });
      } catch (err) {
        console.warn('Supabase: aviso ao persistir novo usuário no banco remoto:', err);
      }
    }

    return { success: true, user: newUser };
  }

  /**
   * Remove a autorização de um pesquisador
   */
  public async removeAuthorizedUser(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === SUPERUSER_EMAIL.toLowerCase()) {
      return { success: false, error: 'O coordenador superusuário (abner.lucas@ifpa.edu.br) não pode ser removido.' };
    }

    const existing = await this.getAuthorizedUsers();
    const updated = existing.filter(u => u.email.toLowerCase() !== cleanEmail);
    this.saveLocalAuthorizedUsers(updated);

    if (this.supabase) {
      try {
        await this.supabase.from('authorized_users').delete().eq('email', cleanEmail);
      } catch (err) {
        console.warn('Supabase: aviso ao excluir da tabela remota:', err);
      }
    }

    return { success: true };
  }

  /**
   * Alterna o status ativo/inativo de um usuário
   */
  public async toggleUserStatus(email: string): Promise<{ success: boolean; error?: string; newStatus?: boolean }> {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === SUPERUSER_EMAIL.toLowerCase()) {
      return { success: false, error: 'O status do coordenador superusuário não pode ser modificado.' };
    }

    const existing = await this.getAuthorizedUsers();
    const target = existing.find(u => u.email.toLowerCase() === cleanEmail);

    if (!target) {
      return { success: false, error: 'Pesquisador não encontrado.' };
    }

    target.isActive = !target.isActive;
    this.saveLocalAuthorizedUsers(existing);

    if (this.supabase) {
      try {
        await this.supabase.from('authorized_users').update({ is_active: target.isActive }).eq('email', cleanEmail);
      } catch (err) {
        console.warn('Supabase: aviso ao alterar status no banco remoto:', err);
      }
    }

    return { success: true, newStatus: target.isActive };
  }

  /**
   * Atualiza a senha de um usuário
   */
  public async updateUserPassword(email: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    const existing = await this.getAuthorizedUsers();
    const target = existing.find(u => u.email.toLowerCase() === cleanEmail);

    if (!target) {
      return { success: false, error: 'Pesquisador não encontrado.' };
    }

    target.password = newPass;
    this.saveLocalAuthorizedUsers(existing);

    if (this.supabase) {
      try {
        await this.supabase.from('authorized_users').update({ password: newPass }).eq('email', cleanEmail);
      } catch (err) {
        console.warn('Supabase: aviso ao atualizar senha no banco remoto:', err);
      }
    }

    return { success: true };
  }

  /**
   * Encerra a sessão do usuário
   */
  public async signOut(): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.auth.signOut();
      } catch (err) {
        console.warn('Erro ao deslogar do Supabase:', err);
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }

    this.notifyListeners(null);
  }

  private saveLocalUser(user: AuthUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    }
  }
}

export const authService = new AuthService();
