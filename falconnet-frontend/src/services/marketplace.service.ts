import { api } from '@/services/api';
import { STORAGE_KEYS } from '@/lib/utils';
import type {
  BProducto, BProductoPage, BUser, MarketplaceListing, ProductoCategoria,
  BSolicitudCompra, SolicitudCompra,
} from '@/types';
import { mapBUser } from '@/types';

function mapProducto(b: BProducto, vendorMap: Map<number, ReturnType<typeof mapBUser>>): MarketplaceListing {
  const vendor = vendorMap.get(b.vendedorId);
  return {
    id: b.id,
    vendorId: b.vendedorId,
    vendorName: vendor?.displayName ?? vendor?.username ?? String(b.vendedorId),
    vendorAvatar: vendor?.avatarUrl,
    title: b.titulo,
    description: b.descripcion,
    price: b.precio,
    imageUrl: b.imagenUrl ?? undefined,
    category: b.categoria,
    status: b.estado,
    createdAt: b.fecha,
    location: b.ubicacion ?? undefined,
    quantity: b.cantidad,
    isFavorite: b.esFavorito ?? false,
    favoriteCount: b.favoritos ?? 0,
  };
}

export const marketplaceService = {
  async getListings(params: {
    page?: number;
    size?: number;
    q?: string;
    categoria?: ProductoCategoria;
  } = {}): Promise<{ listings: MarketplaceListing[]; hasMore: boolean; page: number }> {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 0));
    qs.set('size', String(params.size ?? 12));
    if (params.q) qs.set('q', params.q);
    if (params.categoria) qs.set('categoria', params.categoria);

    const [data, users] = await Promise.all([
      api.get<BProductoPage>(`/market/productos?${qs}`),
      api.get<BUser[]>('/usuarios'),
    ]);

    const vendorMap = new Map(users.map((u) => [u.id, mapBUser(u)]));
    return {
      listings: data.content.map((p) => mapProducto(p, vendorMap)),
      hasMore: data.hasMore,
      page: data.page,
    };
  },

  async create(data: {
    titulo: string;
    descripcion: string;
    precio: number;
    categoria: ProductoCategoria;
    imagenUrl?: string;
    ubicacion?: string;
    cantidad?: number;
  }): Promise<BProducto> {
    return api.post<BProducto>('/market/productos', data);
  },

  async uploadImage(file: File): Promise<string> {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    const formData = new FormData();
    formData.append('archivo', file);
    const res = await fetch(`${base}/imagenes/subir`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir imagen');
    const data = await res.json() as { url: string };
    return data.url;
  },

  async toggleFavorite(productoId: number): Promise<void> {
    await api.post(`/market/favoritos/${productoId}`);
  },

  async requestPurchase(payload: {
    productoId: number;
    nombreComprador: string;
    aula?: string;
    edificio?: string;
    horario?: string;
    mensaje?: string;
  }): Promise<void> {
    await api.post('/market/solicitudes', payload);
  },

  async getSolicitudesRecibidas(): Promise<SolicitudCompra[]> {
    const raw = await api.get<BSolicitudCompra[]>('/market/solicitudes/recibidas');
    return raw.map((s) => ({
      id: s.id,
      productoId: s.productoId,
      productoTitulo: s.productoTitulo ?? `Producto #${s.productoId}`,
      productoImageUrl: s.productoImagen ?? undefined,
      compradorNombre: s.compradorNombre ?? s.nombreComprador,
      compradorAvatar: s.compradorFoto ?? undefined,
      mensaje: s.mensaje ?? undefined,
      lugar: s.aula ?? s.edificio ?? undefined,
      horario: s.horario ?? undefined,
      estado: s.estado,
      createdAt: s.fecha,
    }));
  },

  async actualizarSolicitud(id: number, estado: string): Promise<void> {
    await api.put(`/market/solicitudes/${id}/estado`, { estado });
  },

  async getListingsByUser(userId: number): Promise<MarketplaceListing[]> {
    const [items, users] = await Promise.all([
      api.get<BProducto[]>(`/market/productos/vendedor/${userId}`),
      api.get<BUser[]>('/usuarios'),
    ]);
    const vendorMap = new Map(users.map((u) => [u.id, mapBUser(u)]));
    return items.map((p) => mapProducto(p, vendorMap));
  },
};
