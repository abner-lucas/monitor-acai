import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AuthUser } from '../types';

const STORAGE_KEY_AUTH = 'monitor_acai_auth_user_v1';

// Default demo researcher for fallback / offline development
export const DEFAULT_DEMO_USER: AuthUser = {
  id: 'usr_ifpa_default',
  email: 'admin@ifpa.edu.br',
  fullName: 'Ábner Lucas (Pesquisador IFPA)',
  role: 'pesquisador',
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
        
        // Listen to Supabase auth events
        this.supabase.auth.onAuthStateChange((_event, session) => {
          const authUser = session?.user ? this.mapSupabaseUser(session.user) : null;
          this.notifyListeners(authUser);
        });
      } catch (err) {
        console.warn('Erro ao inicializar Supabase Auth:', err);
      }
    }
  }

  public isCloudAuthEnabled(): boolean {
    return this.supabase !== null;
  }

  private mapSupabaseUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pesquisador IFPA',
      role: user.user_metadata?.role || 'pesquisador',
    };
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
   * Obtém o usuário atualmente autenticado
   */
  public async getCurrentUser(): Promise<AuthUser | null> {
    if (this.supabase) {
      try {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) {
          return this.mapSupabaseUser(session.user);
        }
      } catch (err) {
        console.warn('Falha ao obter sessão do Supabase, tentando local:', err);
      }
    }

    // Fallback: LocalStorage
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
   * Realiza login com Email e Senha
   */
  public async signIn(credentials: { email: string; password: string }): Promise<{ user: AuthUser | null; error: string | null }> {
    const { email, password } = credentials;

    // 1. Tentar autenticação no Supabase se configurado
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          return { user: null, error: this.translateAuthError(error.message) };
        }

        if (data.user) {
          const authUser = this.mapSupabaseUser(data.user);
          return { user: authUser, error: null };
        }
      } catch (err: any) {
        console.warn('Erro na chamada Supabase auth, caindo para contingência:', err);
      }
    }

    // 2. Modo Contingência / Local (Demo e IFPA Breves)
    // Permite login com admin@ifpa.edu.br ou qualquer email cadastrado previamente no mock
    if (email.trim() === DEFAULT_DEMO_USER.email && password === 'ifpa2026') {
      this.saveLocalUser(DEFAULT_DEMO_USER);
      this.notifyListeners(DEFAULT_DEMO_USER);
      return { user: DEFAULT_DEMO_USER, error: null };
    }

    // Checar se foi um usuário criado localmente
    if (typeof window !== 'undefined') {
      const storedUsersRaw = localStorage.getItem('monitor_acai_registered_users');
      const registeredUsers: Array<{ email: string; password: string; user: AuthUser }> = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const found = registeredUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
      
      if (found) {
        this.saveLocalUser(found.user);
        this.notifyListeners(found.user);
        return { user: found.user, error: null };
      }
    }

    return { 
      user: null, 
      error: 'Email ou senha incorretos. Verifique suas credenciais de acesso.' 
    };
  }

  /**
   * Realiza cadastro de novo usuário / pesquisador
   */
  public async signUp(data: { email: string; password: string; fullName: string }): Promise<{ user: AuthUser | null; error: string | null; requiresEmailConfirmation?: boolean }> {
    const { email, password, fullName } = data;

    if (this.supabase) {
      try {
        const { data: authData, error } = await this.supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: 'pesquisador',
            },
          },
        });

        if (error) {
          return { user: null, error: this.translateAuthError(error.message) };
        }

        if (authData.user) {
          const authUser = this.mapSupabaseUser(authData.user);
          const requiresConfirmation = !authData.session;
          return { 
            user: authUser, 
            error: null,
            requiresEmailConfirmation: requiresConfirmation
          };
        }
      } catch (err: any) {
        console.warn('Erro ao cadastrar no Supabase:', err);
      }
    }

    // Fallback local: registrar e logar
    const newUser: AuthUser = {
      id: `usr_${Date.now()}`,
      email: email.trim(),
      fullName: fullName.trim() || 'Pesquisador IFPA',
      role: 'pesquisador',
    };

    if (typeof window !== 'undefined') {
      const storedUsersRaw = localStorage.getItem('monitor_acai_registered_users');
      const registeredUsers: Array<{ email: string; password: string; user: AuthUser }> = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      
      if (registeredUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return { user: null, error: 'Este email já está cadastrado no sistema.' };
      }

      registeredUsers.push({ email: email.trim(), password, user: newUser });
      localStorage.setItem('monitor_acai_registered_users', JSON.stringify(registeredUsers));
    }

    this.saveLocalUser(newUser);
    this.notifyListeners(newUser);
    return { user: newUser, error: null };
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

  private translateAuthError(message: string): string {
    if (message.includes('Invalid login credentials')) {
      return 'Credenciais inválidas. Verifique seu email e senha.';
    }
    if (message.includes('Email not confirmed')) {
      return 'Email ainda não confirmado. Verifique sua caixa de entrada no link do Supabase.';
    }
    if (message.includes('User already registered')) {
      return 'Já existe um usuário cadastrado com este email.';
    }
    if (message.includes('Password should be at least')) {
      return 'A senha deve conter no mínimo 6 caracteres.';
    }
    return message;
  }
}

export const authService = new AuthService();

