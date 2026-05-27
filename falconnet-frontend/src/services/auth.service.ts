import { api } from './api';
import { STORAGE_KEYS } from '@/lib/utils';
import { mapBUser } from '@/lib/userMapper';
import type { LoginRequest, RegisterRequest, User, BUser, AuthTokens } from '@/types';

interface LoginResponse {
  token: string;
  user?: User;
}

interface BLoginResponse {
  token: string;
  usuario: BUser;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const data = await api.post<BLoginResponse>('/usuarios/login', {
      correo: credentials.email,
      password: credentials.password,
    });
    if (data.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    }
    const user = data.usuario ? mapBUser(data.usuario) : undefined;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    return { token: data.token, user };
  },

  async register(payload: RegisterRequest): Promise<LoginResponse> {
    await api.post('/usuarios/registro', {
      correo: payload.email,
      password: payload.password,
      username: payload.username,
    });
    // Backend register returns only UsuarioResponse (no token) — auto-login
    return this.login({ email: payload.email, password: payload.password });
  },

  async me(): Promise<User> {
    const bUser = await api.get<BUser>('/usuarios/me');
    return mapBUser(bUser);
  },

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  // Kept for token refresh prep (Phase 2)
  async refreshToken(token: string): Promise<AuthTokens> {
    return api.post<AuthTokens>('/api/auth/refresh', { token });
  },

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  },
};
