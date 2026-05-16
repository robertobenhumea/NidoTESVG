package com.tesvg.backend.controller;

import com.tesvg.backend.model.Favorito;
import com.tesvg.backend.model.Producto;
import com.tesvg.backend.model.SolicitudCompra;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.FavoritoRepository;
import com.tesvg.backend.repository.ProductoRepository;
import com.tesvg.backend.repository.SolicitudCompraRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.NotificacionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/market")
public class MarketController {

    @Autowired private ProductoRepository productoRepo;
    @Autowired private FavoritoRepository favoritoRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private SolicitudCompraRepository solicitudRepo;
    @Autowired private NotificacionService notificacionService;

    private Long resolveUserId(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        if (correo == null) return null;
        return usuarioRepo.findByCorreo(correo).map(Usuario::getId).orElse(null);
    }

    private Map<String, Object> toMap(Producto p, Long userId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          p.getId());
        m.put("vendedorId",  p.getVendedorId());
        m.put("titulo",      p.getTitulo());
        m.put("descripcion", p.getDescripcion());
        m.put("precio",      p.getPrecio());
        m.put("categoria",   p.getCategoria());
        m.put("imagenUrl",   p.getImagenUrl());
        m.put("estado",      p.getEstado());
        m.put("fecha",       p.getFecha());
        m.put("ubicacion",   p.getUbicacion());
        m.put("cantidad",    p.getCantidad() != null ? p.getCantidad() : 1);
        m.put("favoritos",   favoritoRepo.countByProductoId(p.getId()));
        m.put("esFavorito",  userId != null &&
                favoritoRepo.findByUsuarioIdAndProductoId(userId, p.getId()).isPresent());
        return m;
    }

    private Map<String, Object> solicitudToMap(SolicitudCompra s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              s.getId());
        m.put("productoId",      s.getProductoId());
        m.put("compradorId",     s.getCompradorId());
        m.put("vendedorId",      s.getVendedorId());
        m.put("nombreComprador", s.getNombreComprador());
        m.put("aula",            s.getAula());
        m.put("edificio",        s.getEdificio());
        m.put("horario",         s.getHorario());
        m.put("mensaje",         s.getMensaje());
        m.put("estado",          s.getEstado());
        m.put("fecha",           s.getFecha());

        productoRepo.findById(s.getProductoId()).ifPresent(p -> {
            m.put("productoTitulo",    p.getTitulo());
            m.put("productoPrecio",    p.getPrecio());
            m.put("productoImagen",    p.getImagenUrl());
            m.put("productoCategoria", p.getCategoria());
        });

        usuarioRepo.findById(s.getCompradorId()).ifPresent(u -> {
            m.put("compradorNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo());
            m.put("compradorFoto",   u.getFotoPerfil());
        });

        usuarioRepo.findById(s.getVendedorId()).ifPresent(u -> {
            m.put("vendedorNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo());
            m.put("vendedorFoto",   u.getFotoPerfil());
        });

        return m;
    }

    /* ═══════════════════════════════════════════════
       PRODUCTOS
    ═══════════════════════════════════════════════ */

    @GetMapping("/productos")
    public ResponseEntity<?> listar(
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int limit,
            HttpServletRequest req) {

        Long userId = resolveUserId(req);
        List<Producto> productos;

        if (q != null && !q.isBlank()) {
            productos = productoRepo.findByTituloContainingIgnoreCaseAndEstado(
                    q.trim(), Producto.Estado.DISPONIBLE);
        } else if (categoria != null && !categoria.isBlank()) {
            try {
                Producto.Categoria cat = Producto.Categoria.valueOf(categoria.toUpperCase());
                productos = productoRepo.findByCategoriaAndEstadoOrderByFechaDesc(
                        cat, Producto.Estado.DISPONIBLE);
            } catch (IllegalArgumentException e) {
                productos = productoRepo.findByEstadoOrderByFechaDesc(Producto.Estado.DISPONIBLE);
            }
        } else {
            productos = productoRepo.findByEstadoOrderByFechaDesc(Producto.Estado.DISPONIBLE);
        }

        if (limit > 0) {
            productos = productos.stream().limit(limit).collect(Collectors.toList());
        }

        return ResponseEntity.ok(productos.stream().map(p -> toMap(p, userId))
                .collect(Collectors.toList()));
    }

    @GetMapping("/productos/vendedor/{vendedorId}")
    public ResponseEntity<?> porVendedor(@PathVariable Long vendedorId, HttpServletRequest req) {
        Long userId = resolveUserId(req);
        return ResponseEntity.ok(productoRepo.findByVendedorIdOrderByFechaDesc(vendedorId)
                .stream().map(p -> toMap(p, userId)).collect(Collectors.toList()));
    }

    @GetMapping("/productos/{id}")
    public ResponseEntity<?> detalle(@PathVariable Long id, HttpServletRequest req) {
        Producto p = productoRepo.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(toMap(p, resolveUserId(req)));
    }

    @PostMapping("/productos")
    public ResponseEntity<?> crear(@RequestBody Producto producto, HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        Usuario usuario = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        producto.setVendedorId(usuario.getId());
        producto.setFecha(LocalDateTime.now());
        producto.setEstado(Producto.Estado.DISPONIBLE);
        if (producto.getCantidad() == null || producto.getCantidad() < 1) producto.setCantidad(1);

        return ResponseEntity.ok(productoRepo.save(producto));
    }

    @PutMapping("/productos/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id,
                                    @RequestBody Producto body,
                                    HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        Usuario usuario = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Producto p = productoRepo.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        if (!p.getVendedorId().equals(usuario.getId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        p.setTitulo(body.getTitulo());
        p.setDescripcion(body.getDescripcion());
        p.setPrecio(body.getPrecio());
        p.setCategoria(body.getCategoria());
        if (body.getImagenUrl() != null) p.setImagenUrl(body.getImagenUrl());
        p.setUbicacion(body.getUbicacion());
        if (body.getCantidad() != null && body.getCantidad() >= 1) p.setCantidad(body.getCantidad());

        return ResponseEntity.ok(productoRepo.save(p));
    }

    @PutMapping("/productos/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Long id,
                                           @RequestBody Map<String, String> body,
                                           HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        Usuario usuario = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Producto p = productoRepo.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        if (!p.getVendedorId().equals(usuario.getId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        try {
            p.setEstado(Producto.Estado.valueOf(body.get("estado").toUpperCase()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Estado inválido");
        }

        return ResponseEntity.ok(productoRepo.save(p));
    }

    @Transactional
    @DeleteMapping("/productos/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        Usuario usuario = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Producto p = productoRepo.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        if (!p.getVendedorId().equals(usuario.getId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        favoritoRepo.deleteByProductoId(p.getId());
        productoRepo.delete(p);
        return ResponseEntity.ok(Map.of("mensaje", "Producto eliminado"));
    }

    /* ═══════════════════════════════════════════════
       FAVORITOS
    ═══════════════════════════════════════════════ */

    @PostMapping("/favoritos/{productoId}")
    public ResponseEntity<?> toggleFavorito(@PathVariable Long productoId,
                                            HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        Usuario usuario = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!productoRepo.existsById(productoId)) return ResponseEntity.notFound().build();

        Optional<Favorito> existente = favoritoRepo.findByUsuarioIdAndProductoId(
                usuario.getId(), productoId);

        if (existente.isPresent()) {
            favoritoRepo.delete(existente.get());
            return ResponseEntity.ok(Map.of("guardado", false,
                    "favoritos", Math.max(0, favoritoRepo.countByProductoId(productoId))));
        } else {
            Favorito f = new Favorito();
            f.setUsuarioId(usuario.getId());
            f.setProductoId(productoId);
            f.setFecha(LocalDateTime.now());
            favoritoRepo.save(f);
            return ResponseEntity.ok(Map.of("guardado", true,
                    "favoritos", favoritoRepo.countByProductoId(productoId)));
        }
    }

    @GetMapping("/favoritos")
    public ResponseEntity<?> misFavoritos(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        Usuario usuario = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        List<Long> ids = favoritoRepo.findByUsuarioId(usuario.getId())
                .stream().map(Favorito::getProductoId).collect(Collectors.toList());
        List<Map<String, Object>> result = productoRepo.findAllById(ids)
                .stream().map(p -> toMap(p, usuario.getId())).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /* ═══════════════════════════════════════════════
       SOLICITUDES DE COMPRA
    ═══════════════════════════════════════════════ */

    @PostMapping("/solicitudes")
    public ResponseEntity<?> crearSolicitud(@RequestBody Map<String, Object> body,
                                             HttpServletRequest req) {
        Long compradorId = resolveUserId(req);
        if (compradorId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Long productoId;
        try {
            productoId = Long.valueOf(body.get("productoId").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "productoId inválido"));
        }

        Producto p = productoRepo.findById(productoId).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();

        if (!Producto.Estado.DISPONIBLE.equals(p.getEstado()))
            return ResponseEntity.badRequest().body(Map.of("error", "Producto no disponible"));

        if (p.getVendedorId().equals(compradorId))
            return ResponseEntity.badRequest().body(Map.of("error", "No puedes comprar tu propio producto"));

        Object nombreObj = body.get("nombreComprador");
        if (nombreObj == null || nombreObj.toString().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Nombre requerido"));

        SolicitudCompra s = new SolicitudCompra();
        s.setProductoId(productoId);
        s.setCompradorId(compradorId);
        s.setVendedorId(p.getVendedorId());
        s.setNombreComprador(nombreObj.toString().trim());
        s.setAula(body.getOrDefault("aula", "").toString().trim());
        s.setEdificio(body.getOrDefault("edificio", "").toString().trim());
        s.setHorario(body.getOrDefault("horario", "").toString().trim());
        s.setMensaje(body.getOrDefault("mensaje", "").toString().trim());
        s.setEstado(SolicitudCompra.Estado.PENDIENTE);
        s.setFecha(LocalDateTime.now());
        solicitudRepo.save(s);

        String notifMsg = s.getNombreComprador() + " quiere comprar \"" + p.getTitulo() + "\"";
        notificacionService.crearYPush(p.getVendedorId(), "COMPRA", notifMsg, s.getId());

        return ResponseEntity.ok(solicitudToMap(s));
    }

    @GetMapping("/solicitudes/recibidas")
    public ResponseEntity<?> solicitudesRecibidas(HttpServletRequest req) {
        Long userId = resolveUserId(req);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(solicitudRepo.findByVendedorIdOrderByFechaDesc(userId)
                .stream().map(this::solicitudToMap).collect(Collectors.toList()));
    }

    @GetMapping("/solicitudes/enviadas")
    public ResponseEntity<?> solicitudesEnviadas(HttpServletRequest req) {
        Long userId = resolveUserId(req);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(solicitudRepo.findByCompradorIdOrderByFechaDesc(userId)
                .stream().map(this::solicitudToMap).collect(Collectors.toList()));
    }

    @PutMapping("/solicitudes/{id}/estado")
    public ResponseEntity<?> actualizarSolicitud(@PathVariable Long id,
                                                  @RequestBody Map<String, String> body,
                                                  HttpServletRequest req) {
        Long userId = resolveUserId(req);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        SolicitudCompra s = solicitudRepo.findById(id).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();

        boolean isVendor = s.getVendedorId().equals(userId);
        boolean isBuyer  = s.getCompradorId().equals(userId);
        if (!isVendor && !isBuyer)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        SolicitudCompra.Estado newEstado;
        try {
            newEstado = SolicitudCompra.Estado.valueOf(body.get("estado").toUpperCase());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Estado inválido"));
        }

        // Buyer can only cancel (RECHAZADA) while PENDIENTE
        if (!isVendor) {
            if (!SolicitudCompra.Estado.PENDIENTE.equals(s.getEstado()))
                return ResponseEntity.badRequest().body(Map.of("error", "No puedes modificar esta solicitud"));
            if (!SolicitudCompra.Estado.RECHAZADA.equals(newEstado))
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        s.setEstado(newEstado);
        solicitudRepo.save(s);

        if (isVendor) {
            Producto p = productoRepo.findById(s.getProductoId()).orElse(null);
            String titulo = p != null ? p.getTitulo() : "un producto";
            String msg = switch (newEstado) {
                case ACEPTADA  -> "Tu solicitud para \"" + titulo + "\" fue aceptada ✓";
                case RECHAZADA -> "Tu solicitud para \"" + titulo + "\" fue rechazada";
                case ENTREGADA -> "Tu compra de \"" + titulo + "\" fue marcada como entregada";
                default        -> "Tu solicitud fue actualizada";
            };
            notificacionService.crearYPush(s.getCompradorId(), "COMPRA", msg, s.getId());
        }

        return ResponseEntity.ok(solicitudToMap(s));
    }
}
