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
  lastSeen?: string | null;
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
  expiresAt?: string;
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
  createdAt?: string;
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

export interface RawSocialUser {
  id: number;
  username: string;
  fotoPerfil?: string | null;
  fotoPortada?: string | null;
  bio?: string | null;
  carrera?: string | null;
  grupo?: string | null;
  intereses?: string | null;
  siguiendo: boolean;
  mutuals: number;
  totalSeguidores: number;
  score?: number;
  interesesComunes?: string[];
}

export interface SocialUser {
  id: number;
  username: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  carrera?: string;
  grupo?: string;
  intereses?: string;
  siguiendo: boolean;
  mutuals: number;
  followerCount: number;
  score?: number;
  interesesComunes?: string[];
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
  semestre?: number;
  github?: string;
  portfolio?: string;
  habilidades?: string[];
  isOnline?: boolean;
  lastSeen?: string | null;
}

export interface UserProfile extends User {
  postCount?: number;
  commentCount?: number;
  teamCount?: number;
  createdAt?: string;
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

export interface PollOption {
  id: number;
  texto: string;
  votos: number;
}

export interface Poll {
  id: number;
  pregunta: string;
  opciones: PollOption[];
  total: number;
  miVoto?: number; // opcionId voted by current user, undefined if not voted
}

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
  poll?: Poll;
  expiresAt?: string;
}

export interface Comment {
  id: number;
  author: User;
  content: string;
  createdAt: string;
  reactionCount?: number;
  userReaction?: ReactionType;
}

export interface BComentarioReaccionResponse {
  accion: 'dado' | 'quitado' | 'cambiado';
  tipo?: string;
  reactionCount: number;
}

export interface BComentarioReaccionData {
  reactionCount: number;
  userReaction: string | null;
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

/* ── Reclutamiento ── */

export type TipoReclutamiento =
  | 'PROYECTO' | 'HACKATHON' | 'INNOVATEC' | 'TORNEO'
  | 'INVESTIGACION' | 'STARTUP' | 'OTRO';

export type EstadoReclutamiento = 'ABIERTO' | 'COMPLETO' | 'CERRADO';

export type EstadoSolicitud = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

export interface ReclutamientoFeedItem {
  id: number;
  usuarioId: number;
  nombreEquipo?: string;
  nombreProyecto: string;
  descripcion?: string;
  objetivo?: string;
  tipo: TipoReclutamiento;
  habilidades: string[];
  integrantesFaltantes: number;
  fechaLimite?: string;
  imagenUrl?: string;
  estado: EstadoReclutamiento;
  fecha: string;
  creadorNombre?: string;
  creadorAvatarUrl?: string;
  miSolicitud?: EstadoSolicitud;
}

/* ── Messages ── */

export type MsgTipo = 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO';
export type LegacyMsgTipo = MsgTipo | 'TEXTO' | 'IMAGEN' | 'ARCHIVO' | 'VIDEO' | 'VOICE' | 'VOZ';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface BMensaje {
  id: number;
  content?: string;
  senderId?: number;
  senderName?: string | null;
  recipientId?: number;
  status?: MessageStatus;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  fechaCreacion?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  deleted?: boolean;
  emisorId: number;
  receptorId: number;
  contenido: string;
  createdAt?: string;
  fecha: string;
  leido: boolean;
  messageType?: LegacyMsgTipo;
  tipo?: LegacyMsgTipo;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  waveformData?: string | null;
  archivoUrl?: string | null;
  nombreArchivo?: string | null;
  eliminado?: boolean;
  referenciaId?: number | null;
  referencia?: { id: number; contenido: string; tipo: LegacyMsgTipo; emisorId: number; emisorNombre: string };
  replyPreview?: {
    id: number;
    senderId: number;
    senderName: string;
    contenido: string;
    content?: string;
    tipo: LegacyMsgTipo;
    eliminado: boolean;
  } | null;
  emisorNombre?: string | null;
  emisorFoto?: string | null;
  editado?: boolean;
  actualizadoEn?: string | null;
  reenviado?: boolean;
  mensajeOriginalId?: number | null;
  pinned?: boolean;
  pinnedBy?: number | null;
  pinnedAt?: string | null;
  reactions?: Array<{ reactionType: string; count: number; mine: boolean }>;
  myReaction?: string | null;
}

export interface BConversacion {
  partnerId: number;
  partnerNombre: string;
  partnerFoto?: string | null;
  partnerCarrera?: string | null;
  partnerRol?: string | null;
  ultimoMensaje?: string;
  ultimoTipo?: LegacyMsgTipo;
  fecha?: string;
  lastMessageAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  fechaCreacion?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  noLeidos: number;
  esMio?: boolean;
  archived?: boolean;
  muted?: boolean;
  online?: boolean;
  lastSeen?: string | null;
}

export interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerAvatar?: string;
  partnerCarrera?: string;
  partnerRol?: string;
  lastMessage?: string;
  lastTipo?: MsgTipo;
  updatedAt?: string;
  unreadCount: number;
  isMine?: boolean;
  archived?: boolean;
  muted?: boolean;
  online?: boolean;
  lastSeen?: string | null;
}

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  senderName?: string | null;
  content: string;
  createdAt: string;
  fechaCreacion?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  read: boolean;
  tipo: MsgTipo;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  waveformData?: string | null;
  archivoUrl?: string | null;
  nombreArchivo?: string | null;
  eliminado?: boolean;
  referenciaId?: number | null;
  referencia?: { id: number; content: string; tipo: MsgTipo; senderId: number; senderName: string };
  replyPreview?: { id: number; content: string; tipo: MsgTipo; senderId: number; senderName: string; eliminado: boolean } | null;
  status?: MessageStatus;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  pending?: boolean;
  retryContent?: string;
  retryReferenciaId?: number;
  editado?: boolean;
  actualizadoEn?: string | null;
  reenviado?: boolean;
  mensajeOriginalId?: number | null;
  pinned?: boolean;
  pinnedBy?: number | null;
  pinnedAt?: string | null;
  reactions?: Array<{ reactionType: string; count: number; mine: boolean }>;
  myReaction?: string | null;
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

export type SolicitudEstado = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'ENTREGADA';

export interface BSolicitudCompra {
  id: number;
  productoId: number;
  compradorId: number;
  vendedorId: number;
  nombreComprador: string;
  aula?: string;
  edificio?: string;
  horario?: string;
  mensaje?: string;
  estado: SolicitudEstado;
  fecha: string;
  productoTitulo?: string;
  productoPrecio?: number;
  productoImagen?: string;
  productoCategoria?: string;
  compradorNombre?: string;
  compradorFoto?: string;
  vendedorNombre?: string;
  vendedorFoto?: string;
}

export interface SolicitudCompra {
  id: number;
  productoId: number;
  productoTitulo: string;
  productoImageUrl?: string;
  compradorNombre: string;
  compradorAvatar?: string;
  mensaje?: string;
  lugar?: string;
  horario?: string;
  estado: SolicitudEstado;
  createdAt: string;
}

/* ── Highlights / Historias Destacadas ── */

export interface HighlightStory {
  id: number;
  imagenUrl?: string;
  texto?: string;
  colorFondo?: string;
  fecha?: string;
}

export interface Destacado {
  id: number;
  nombre: string;
  emoji?: string;
  coverImageUrl?: string;
  coverColor?: string;
  orden: number;
  publico: boolean;
  historiaCount: number;
  historias: HighlightStory[];
}

export interface CreateDestacadoPayload {
  nombre: string;
  emoji?: string;
  coverImageUrl?: string;
  coverColor?: string;
  publico: boolean;
  historiaIds: number[];
}

/* ── API ── */

export interface ApiError {
  status: number;
  error?: string;
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

/* ── Chat Groups ── */

export type ChatGrupoTipo = 'PUBLICO' | 'PRIVADO' | 'INVITE';
export type ChatGrupoRol  = 'OWNER' | 'ADMIN' | 'MODERADOR' | 'MIEMBRO';

export interface BChatGrupo {
  id: number;
  nombre: string;
  descripcion?: string | null;
  foto?: string | null;
  tipo: ChatGrupoTipo;
  creadorId: number;
  rol: ChatGrupoRol;
  noLeidos: number;
  fechaCreacion: string;
  ultimoMensaje?: string | null;
  ultimoTipo?: MsgTipo | null;
  ultimaFecha?: string | null;
  ultimoEmisor?: string | null;
}

export interface BChatGrupoMiembro {
  usuarioId: number;
  rol: ChatGrupoRol;
  fechaUnion: string;
  silenciado: boolean;
  nombre: string;
  foto?: string | null;
  carrera?: string | null;
}

export interface BChatGrupoDetalle extends BChatGrupo {
  miRol: ChatGrupoRol;
  miembros: BChatGrupoMiembro[];
  admins?: BChatGrupoMiembro[];
}

export interface BChatGrupoMensaje {
  id: number;
  grupoId: number;
  emisorId: number;
  contenido: string;
  messageType?: LegacyMsgTipo;
  tipo: LegacyMsgTipo;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  waveformData?: string | null;
  archivoUrl?: string | null;
  nombreArchivo?: string | null;
  eliminado: boolean;
  esSistema: boolean;
  referenciaId?: number | null;
  referencia?: { id: number; contenido: string; tipo: LegacyMsgTipo; emisorId: number; emisorNombre: string };
  replyPreview?: {
    id: number;
    senderId: number;
    senderName: string;
    content?: string;
    contenido: string;
    tipo: LegacyMsgTipo;
    eliminado: boolean;
  } | null;
  editado?: boolean;
  actualizadoEn?: string | null;
  reenviado?: boolean;
  mensajeOriginalId?: number | null;
  pinned?: boolean;
  pinnedBy?: number | null;
  pinnedAt?: string | null;
  reactions?: Array<{ reactionType: string; count: number; mine: boolean }>;
  myReaction?: string | null;
  createdAt?: string;
  fecha: string;
  emisorNombre?: string;
  emisorFoto?: string | null;
}

export interface ChatGroup {
  id: number;
  nombre: string;
  descripcion?: string;
  foto?: string;
  tipo: ChatGrupoTipo;
  creadorId: number;
  miRol: ChatGrupoRol;
  noLeidos: number;
  fechaCreacion: string;
  lastMessage?: string;
  lastTipo?: MsgTipo;
  lastDate?: string;
  lastSender?: string;
}

export interface ChatGroupMember {
  usuarioId: number;
  rol: ChatGrupoRol;
  nombre: string;
  foto?: string;
  carrera?: string;
  silenciado: boolean;
  fechaUnion: string;
}

export interface GroupMessage {
  id: number;
  grupoId: number;
  senderId: number;
  content: string;
  tipo: MsgTipo;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  waveformData?: string | null;
  archivoUrl?: string | null;
  nombreArchivo?: string | null;
  eliminado: boolean;
  esSistema: boolean;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string;
  referenciaId?: number | null;
  referencia?: { id: number; content: string; tipo: MsgTipo; senderId: number; senderName: string };
  replyPreview?: {
    id: number;
    senderId: number;
    senderName: string;
    content: string;
    tipo: MsgTipo;
    eliminado: boolean;
  } | null;
  editado?: boolean;
  actualizadoEn?: string | null;
  reenviado?: boolean;
  mensajeOriginalId?: number | null;
  pinned?: boolean;
  pinnedBy?: number | null;
  pinnedAt?: string | null;
  reactions?: Array<{ reactionType: string; count: number; mine: boolean }>;
  myReaction?: string | null;
}

export interface GroupAttachment {
  id: number;
  mensajeId?: number | null;
  usuarioId: number;
  usuarioNombre?: string;
  url: string;
  nombreArchivo?: string | null;
  tipoArchivo?: string | null;
  tipo: MsgTipo;
  tamanio?: number | null;
  fechaCreacion: string;
}

export interface GroupSharedLink {
  mensajeId: number;
  contenido: string;
  fecha: string;
  emisorId: number;
  emisorNombre?: string;
}
