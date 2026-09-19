import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser, AuthorizedUser } from '../types';

const STORAGE_KEY_AUTH = 'monitor_acai_auth_user_v1';
const STORAGE_KEY_AUTHORIZED_USERS = 'monitor_acai_authorized_users_v2';

export const SUPERUSER_EMAIL = 'abner.lucas@ifpa.edu.br';

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
   * Obtém os usuários e credenciais autorizados diretamente do banco Supabase
   */
  public async getAuthorizedUsers(): Promise<AuthorizedUser[]> {
    if (this.supabase) {
      // 1. Tentar ler da tabela dedicada authorized_users
      try {
        const { data: tableData, error: tableError } = await this.supabase
          .from('authorized_users')
          .select('*')
          .order('created_at', { ascending: true });

        if (!tableError && Array.isArray(tableData) && tableData.length > 0) {
          const mapped: AuthorizedUser[] = tableData.map((u: any) => ({
            id: u.id || `usr_${Math.random()}`,
            email: String(u.email || '').toLowerCase().trim(),
            fullName: u.full_name || u.fullName || 'Pesquisador SAF',
            role: (u.role || 'pesquisador') as 'superuser' | 'pesquisador',
            password: u.password,
            isActive: u.is_active !== false,
            createdAt: u.created_at || new Date().toISOString(),
          }));

          this.saveLocalAuthorizedUsers(mapped);
          return mapped;
        }
      } catch (err) {
        // Tabela ainda não criada ou inacessível, avança para app_settings
      }

      // 2. Ler da tabela app_settings no banco Supabase
      try {
        const { data: settingsData, error: settingsError } = await this.supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'authorized_users')
          .maybeSingle();

        if (!settingsError && settingsData?.value) {
          const parsed = JSON.parse(settingsData.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.saveLocalAuthorizedUsers(parsed);
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar usuários no Supabase app_settings:', err);
      }
    }

    // 3. Fallback: Cache local armazenado previamente da nuvem
    return this.getLocalAuthorizedUsers();
  }

  private getLocalAuthorizedUsers(): AuthorizedUser[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTHORIZED_USERS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveLocalAuthorizedUsers(users: AuthorizedUser[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_AUTHORIZED_USERS, JSON.stringify(users));
      } catch (err) {
        console.error('Erro ao salvar cache de usuários autorizados:', err);
      }
    }
  }

  /**
   * Obtém o usuário atualmente autenticado na sessão do navegador
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
   * Realiza login: validação direta contra as credenciais salvas no banco Supabase
   */
  public async signIn(credentials: { email: string; password: string }): Promise<{ user: AuthUser | null; error: string | null }> {
    const cleanEmail = credentials.email.trim().toLowerCase();
    const cleanPassword = credentials.password;

    if (!cleanEmail || !cleanPassword) {
      return { user: null, error: 'Por favor, informe o email e a senha de acesso.' };
    }

    // Carrega usuários registrados diretamente do banco Supabase
    const authorizedUsers = await this.getAuthorizedUsers();

    if (authorizedUsers.length === 0) {
      return {
        user: null,
        error: 'Nenhum usuário registrado no banco de dados. Verifique a conexão com o Supabase.'
      };
    }

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
        error: 'Senha incorreta. Verifique os caracteres digitados ou solicite redefinição ao coordenador.'
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
   * Cadastra e autoriza um novo pesquisador gravando automaticamente no Supabase
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

    const updated = [...existingUsers, newUser];

    // 1. Grava no Supabase (app_settings) automaticamente
    if (this.supabase) {
      try {
        await this.supabase.from('app_settings').upsert({
          key: 'authorized_users',
          value: JSON.stringify(updated),
        });
      } catch (err) {
        console.error('Erro ao gravar em app_settings no Supabase:', err);
      }

      // 2. Se a tabela dedicada existir, também grava nela
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
      } catch {
        // Ignora caso a tabela dedicada não exista
      }
    }

    // 3. Atualiza cache local
    this.saveLocalAuthorizedUsers(updated);

    return { success: true, user: newUser };
  }

  /**
   * Remove a autorização de um pesquisador do banco Supabase
   */
  public async removeAuthorizedUser(email: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === SUPERUSER_EMAIL.toLowerCase()) {
      return { success: false, error: 'O coordenador superusuário (abner.lucas@ifpa.edu.br) não pode ser removido.' };
    }

    const existing = await this.getAuthorizedUsers();
    const updated = existing.filter(u => u.email.toLowerCase() !== cleanEmail);

    // 1. Atualiza no Supabase (app_settings)
    if (this.supabase) {
      try {
        await this.supabase.from('app_settings').upsert({
          key: 'authorized_users',
          value: JSON.stringify(updated),
        });
      } catch (err) {
        console.error('Erro ao atualizar app_settings no Supabase:', err);
      }

      // 2. Remove também da tabela dedicada se existir
      try {
        await this.supabase.from('authorized_users').delete().eq('email', cleanEmail);
      } catch {
        // Tabela opcional
      }
    }

    // 3. Atualiza cache local
    this.saveLocalAuthorizedUsers(updated);

    return { success: true };
  }

  /**
   * Alterna o status ativo/inativo de um usuário no banco Supabase
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

    // Atualiza no banco Supabase
    if (this.supabase) {
      try {
        await this.supabase.from('app_settings').upsert({
          key: 'authorized_users',
          value: JSON.stringify(existing),
        });
      } catch (err) {
        console.error('Erro ao atualizar status no Supabase:', err);
      }

      try {
        await this.supabase.from('authorized_users').update({ is_active: target.isActive }).eq('email', cleanEmail);
      } catch {}
    }

    this.saveLocalAuthorizedUsers(existing);
    return { success: true, newStatus: target.isActive };
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
