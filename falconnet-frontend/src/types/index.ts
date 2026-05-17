/* ── Backend raw types (Spring Boot API shapes) ── */

export interface BUser {
  id: number;
  username: string;
  correo: string;
  grupo?: string;
  carrera?: string;
  bio?: string;
  fotoPerfil?: string;
  fotoPortada?: string;
  ciudad?: string;
  intereses?: string;
  fechaNacimiento?: string;
  rol?: string;
  activo?: boolean;
}

export interface BPublicacion {
  id: number;
  usuarioId: number;
  contenido: string;
  imagenUrl?: string;
  fecha: string;
  tipo?: 'texto' | 'imagen' | 'video';
  videoUrl?: string;
  esAnuncio?: boolean;
  fijada?: boolean;
  compartida?: boolean;
  publicacionOriginalId?: number;
  allowComments?: boolean;
}

export interface BFeedPage {
  content: BPublicacion[];
  hasMore: boolean;
  page: number;
}

export type BReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface BComentario {
  id: number;
  usuarioId: number;
  publicacionId: number;
  contenido: string;
  fecha: string;
}

export interface BReactionToggleResponse {
  accion: 'dado' | 'quitado' | 'cambiado';
  tipo?: BReactionType;
  likes: number;
}

export interface BFollowStatus {
  siguiendo: boolean;
  seguidores: number;
}

export interface BFollowToggle {
  accion: 'siguiendo' | 'dejado de seguir';
  seguidores: number;
}

export function mapBUser(b: BUser): User {
  return {
    id: b.id,
    username: b.username,
    email: b.correo,
    displayName: b.username,
    avatarUrl: b.fotoPerfil ? resolveBackendUrl(b.fotoPerfil) : undefined,
    coverUrl: b.fotoPortada ? resolveBackendUrl(b.fotoPortada) : undefined,
    bio: b.bio ?? undefined,
    role: b.rol ?? undefined,
    grupo: b.grupo ?? undefined,
    carrera: b.carrera ?? undefined,
  };
}

function resolveBackendUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/* ── Auth ── */

export interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  role?: string;
  grupo?: string;
  carrera?: string;
}

export interface AuthTokens {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

/* ── Posts ── */

export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface Post {
  id: number;
  author: User;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  reactionCount: number;
  commentCount: number;
  userReaction?: ReactionType;
  isAnnouncement?: boolean;
}

export interface Comment {
  id: number;
  author: User;
  content: string;
  createdAt: string;
}

/* ── Stories ── */

export interface BStory {
  id: number;
  usuarioId: number;
  imagenUrl?: string;
  texto?: string;
  colorFondo?: string;
  fecha: string;
  expiraEn: string;
  vistas: number;
}

export interface Story {
  id: number;
  author: User;
  imageUrl?: string;
  text?: string;
  backgroundColor: string;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
  viewCount: number;
}

export interface StoryGroup {
  user: User;
  stories: Story[];
  allViewed: boolean;
}

/* ── Messages ── */

export interface BMensaje {
  id: number;
  emisorId: number;
  receptorId: number;
  contenido: string;
  fecha: string;
  leido: boolean;
}

export interface BConversacion {
  partnerId: number;
  partnerNombre: string;
  partnerFoto?: string;
  ultimoMensaje?: string;
  fecha?: string;
  noLeidos: number;
}

export interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerAvatar?: string;
  lastMessage?: string;
  updatedAt?: string;
  unreadCount: number;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
  read: boolean;
}

/* ── Notifications ── */

export interface BNotificacion {
  id: number;
  usuarioId: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  referenciaId?: number;
}

export type NotificationType =
  | 'LIKE'
  | 'COMMENT'
  | 'FOLLOW'
  | 'MENTION'
  | 'MARKETPLACE'
  | 'SYSTEM';

export interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  referenciaId?: number;
}

/* ── Marketplace ── */

export type ProductoCategoria =
  | 'APUNTES' | 'TECNOLOGIA' | 'FITNESS' | 'ROPA'
  | 'COMIDA' | 'SERVICIOS' | 'GAMING' | 'TRANSPORTE' | 'OTROS';

export type ProductoEstado = 'DISPONIBLE' | 'VENDIDO' | 'PAUSADO';

export interface BProducto {
  id: number;
  vendedorId: number;
  titulo: string;
  descripcion: string;
  precio: number;
  categoria: ProductoCategoria;
  imagenUrl?: string;
  estado: ProductoEstado;
  fecha: string;
  ubicacion?: string;
  cantidad: number;
  esFavorito?: boolean;
  favoritos?: number;
}

export interface BProductoPage {
  content: BProducto[];
  hasMore: boolean;
  page: number;
}

export interface MarketplaceListing {
  id: number;
  vendorId: number;
  vendorName: string;
  vendorAvatar?: string;
  title: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: ProductoCategoria;
  status: ProductoEstado;
  createdAt: string;
  location?: string;
  quantity: number;
  isFavorite: boolean;
  favoriteCount: number;
}

/* ── API ── */

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/* ── Groups ── */

export interface BGroup {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: 'carrera' | 'materia' | 'general';
  creadorId: number;
  fecha: string;
  totalMiembros: number;
  miRol: 'admin' | 'miembro' | null;
  soyMiembro: boolean;
}

export interface BGroupMember {
  usuarioId: number;
  rol: 'admin' | 'miembro';
  fecha: string;
  nombre?: string;
  fotoPerfil?: string;
  carrera?: string;
}

export interface BGroupPost {
  id: number;
  contenido?: string;
  imagenUrl?: string;
  fecha: string;
  usuarioId: number;
  autorNombre?: string;
  autorFoto?: string;
}

export interface BGroupDetail extends BGroup {
  creadorNombre: string;
  miembros: BGroupMember[];
  posts: BGroupPost[];
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  type: 'carrera' | 'materia' | 'general';
  creatorId: number;
  createdAt: string;
  memberCount: number;
  myRole: 'admin' | 'member' | null;
  isMember: boolean;
}

export interface GroupMember {
  userId: number;
  role: 'admin' | 'member';
  joinedAt: string;
  name: string;
  avatarUrl?: string;
  career?: string;
}

export interface GroupPost {
  id: number;
  content?: string;
  imageUrl?: string;
  createdAt: string;
  authorId: number;
  authorName: string;
  authorAvatar?: string;
}

export interface GroupDetail extends Group {
  creatorName: string;
  members: GroupMember[];
  posts: GroupPost[];
}

/* ── Search ── */

export interface BSearchUser {
  id: number;
  username: string;
  carrera?: string;
  grupo?: string;
  fotoPerfil?: string;
  siguiendo: boolean;
}

export interface BSearchPost {
  id: number;
  contenido?: string;
  fecha: string;
  usuarioId: number;
  imagenUrl?: string;
  autorNombre?: string;
  autorFoto?: string;
}

export interface BSearchGroup {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo?: string;
  miembros: number;
}

export interface BSearchResult {
  usuarios: BSearchUser[];
  grupos: BSearchGroup[];
  publicaciones: BSearchPost[];
}

export interface SearchUser {
  id: number;
  username: string;
  career?: string;
  group?: string;
  avatarUrl?: string;
  isFollowing: boolean;
}

export interface SearchPost {
  id: number;
  content?: string;
  createdAt: string;
  authorId: number;
  imageUrl?: string;
  authorName?: string;
  authorAvatar?: string;
}

export interface SearchGroup {
  id: number;
  name: string;
  description?: string;
  type?: string;
  memberCount: number;
}

export interface SearchResult {
  users: SearchUser[];
  groups: SearchGroup[];
  posts: SearchPost[];
}
