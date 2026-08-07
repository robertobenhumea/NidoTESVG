# Marketplace — Overview

## Descripción

El marketplace de FalconNet permite a los estudiantes comprar y vender artículos entre ellos, estilo Facebook Marketplace pero para el campus del TESVG.

## Ruta

`/marketplace`

## Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/market/productos` | Listar productos |
| POST | `/market/productos` | Publicar producto |
| GET | `/market/productos/{id}` | Detalle del producto |
| PUT | `/market/productos/{id}` | Editar producto (propio) |
| DELETE | `/market/productos/{id}` | Eliminar producto (propio) |
| POST | `/market/solicitudes` | Solicitar compra |
| GET | `/market/mis-solicitudes` | Mis solicitudes enviadas |
| GET | `/market/solicitudes-recibidas` | Mis solicitudes recibidas |
| PATCH | `/market/solicitudes/{id}` | Aceptar/rechazar solicitud |

## Modelo de Datos

### Producto
```
id, vendedorId
titulo, descripcion
precio (decimal)
imagenUrl
categoria
estado (disponible|vendido|reservado)
fechaCreacion
```

### SolicitudCompra
```
id, productoId
compradorId, vendedorId
mensaje
estado (pendiente|aceptada|rechazada)
fecha
```

## Flujo de Compra

```
Vendedor → Publica producto con foto y precio
Comprador → Ve el producto y hace solicitud con mensaje
Vendedor → Acepta o rechaza la solicitud
Si acepta → Se contactan por chat para coordinar entrega
```

## Estado

| Feature | Estado |
|---|---|
| Listar productos | ✅ |
| Publicar producto | ✅ |
| Subir foto del producto | ✅ |
| Solicitar compra | ✅ |
| Aceptar/rechazar | ✅ |
| Categorías | ⚠️ Parcial |
| Búsqueda por categoría | ⚠️ Parcial |
| Notificación de solicitud | ⚠️ Parcial |

## Pendientes

- [ ] Filtros avanzados (precio, categoría, fecha)
- [ ] Historial de ventas
- [ ] Sistema de reviews entre usuarios
- [ ] Integración con chat para coordinar entrega directa desde el producto
