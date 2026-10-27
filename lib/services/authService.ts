import { AuthUser, AuthorizedUser } from '../types';
import { apiRequest } from './apiClient';

export { SUPERUSER_EMAIL } from '../constants';

// Chaves da versão anterior, que guardava a sessão e a lista de usuários (com senhas) no navegador.
const LEGACY_STORAGE_KEYS = ['monitor_acai_auth_user_v1', 'monitor_acai_authorized_users_v2'];

class AuthService {
  private listeners: Array<(user: AuthUser | null) => void> = [];

  private notifyListeners(user: AuthUser | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(user);
      } catch (err) {
        console.error('Erro no listener de autenticação:', err);
      }
    });
  }

  private clearLegacyStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Armazenamento indisponível (modo privado etc.): nada a limpar.
    }
  }

  public onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Obtém os pesquisadores autorizados (somente o coordenador tem acesso)
   */
  public async getAuthorizedUsers(): Promise<AuthorizedUser[]> {
    const { users } = await apiRequest<{ users: AuthorizedUser[] }>('/api/users');
    return users;
  }

  /**
   * Obtém o usuário da sessão atual (cookie httpOnly validado pelo servidor)
   */
  public async getCurrentUser(): Promise<AuthUser | null> {
    this.clearLegacyStorage();
    try {
      const { user } = await apiRequest<{ user: AuthUser | null }>('/api/auth/me');
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Realiza login: a senha é conferida no servidor contra o hash salvo no banco
   */
  public async signIn(credentials: { email: string; password: string }): Promise<{ user: AuthUser | null; error: string | null }> {
    const email = credentials.email.trim().toLowerCase();
    if (!email || !credentials.password) {
      return { user: null, error: 'Por favor, informe o email e a senha de acesso.' };
    }

    try {
      const { user } = await apiRequest<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: credentials.password }),
      });
      this.notifyListeners(user);
      return { user, error: null };
    } catch (err) {
      return { user: null, error: err instanceof Error ? err.message : 'Falha na autenticação.' };
    }
  }

  /**
   * Cadastra e autoriza um novo pesquisador
   */
  public async addAuthorizedUser(data: {
    email: string;
    fullName: string;
    role?: 'pesquisador' | 'superuser';
    password?: string;
  }): Promise<{ success: boolean; error?: string; user?: AuthorizedUser }> {
    try {
      const { user } = await apiRequest<{ user: AuthorizedUser }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao cadastrar pesquisador.' };
    }
  }

  /**
   * Remove a autorização de um pesquisador
   */
  public async removeAuthorizedUser(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await apiRequest(`/api/users?email=${encodeURIComponent(email.trim().toLowerCase())}`, { method: 'DELETE' });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao remover pesquisador.' };
    }
  }

  /**
   * Encerra a sessão do usuário
   */
  public async signOut(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearLegacyStorage();
      this.notifyListeners(null);
    }
  }
}

export const authService = new AuthService();
