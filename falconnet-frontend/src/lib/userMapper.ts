import { resolveUrl } from '@/lib/utils';
import type { BUser, User } from '@/types';

export function mapBUser(b: BUser): User {
  return {
    id: b.id,
    username: b.username,
    email: b.correo,
    displayName: b.username,
    avatarUrl: resolveUrl(b.fotoPerfil),
    coverUrl: resolveUrl(b.fotoPortada),
    bio: b.bio ?? undefined,
    role: b.rol ?? undefined,
    grupo: b.grupo ?? undefined,
    carrera: b.carrera ?? undefined,
  };
}
