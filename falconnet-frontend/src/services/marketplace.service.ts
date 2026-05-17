import { api } from '@/services/api';
import type {
  BProducto, BProductoPage, BUser, MarketplaceListing, ProductoCategoria, ProductoEstado,
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

  async toggleFavorite(productoId: number): Promise<void> {
    await api.post(`/market/favoritos/${productoId}`);
  },

  async requestPurchase(productoId: number): Promise<void> {
    await api.post('/market/solicitudes', { productoId });
  },
};
