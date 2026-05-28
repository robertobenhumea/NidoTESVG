package com.tesvg.backend.controller;

import com.tesvg.backend.model.Publicacion;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.PublicacionRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.NotificacionService;
import com.tesvg.backend.service.RedisCacheService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/publicaciones")
public class PublicacionController {

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private NotificacionService notificacionService;

    @Autowired
    private RedisCacheService redisCacheService;

    // Crear publicación normal
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Publicacion publicacion,
                                   HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        LocalDateTime now = LocalDateTime.now();
        publicacion.setUsuarioId(usuario.getId());
        publicacion.setFecha(now);
        publicacion.setEsAnuncio(false);
        publicacion.setExpiresAt(now.plusHours(24));

        Publicacion saved = publicacionRepository.save(publicacion);
        redisCacheService.deleteByPrefix("feed:");
        return ResponseEntity.ok(saved);
    }

    // Crear anuncio — solo AUTORIDAD, ADMIN o DIRECCION
    @PostMapping("/anuncio")
    public ResponseEntity<?> crearAnuncio(@RequestBody Publicacion publicacion,
                                          HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Usuario.Rol rol = usuario.getRol();
        if (rol != Usuario.Rol.AUTORIDAD && rol != Usuario.Rol.ADMIN && rol != Usuario.Rol.DIRECCION) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("No tienes permiso para publicar anuncios oficiales");
        }

        publicacion.setUsuarioId(usuario.getId());
        publicacion.setFecha(LocalDateTime.now());
        publicacion.setEsAnuncio(true);
        // imagenUrl, fijada, allowComments are accepted as-is from request body
        if (publicacion.getAllowComments() == null) publicacion.setAllowComments(true);

        Publicacion saved = publicacionRepository.save(publicacion);
        redisCacheService.deleteByPrefix("feed:");
        return ResponseEntity.ok(saved);
    }

    // Editar anuncio — autor o ADMIN pueden editar contenido e imagenUrl
    @PutMapping("/anuncio/{id}")
    public ResponseEntity<?> editarAnuncio(@PathVariable Long id,
                                           @RequestBody Publicacion body,
                                           HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Publicacion pub = publicacionRepository.findById(id).orElse(null);
        if (pub == null || !Boolean.TRUE.equals(pub.getEsAnuncio())) return ResponseEntity.notFound().build();

        Usuario.Rol rol = usuario.getRol();
        boolean isAdmin  = rol == Usuario.Rol.ADMIN;
        boolean isAuthor = pub.getUsuarioId().equals(usuario.getId());
        if (!isAdmin && !isAuthor) return ResponseEntity.status(403).build();

        if (body.getContenido() != null)  pub.setContenido(body.getContenido());
        if (body.getImagenUrl() != null)  pub.setImagenUrl(body.getImagenUrl());
        if (body.getAllowComments() != null) pub.setAllowComments(body.getAllowComments());
        if (body.getFijada() != null)     pub.setFijada(body.getFijada());

        Publicacion saved = publicacionRepository.save(pub);
        redisCacheService.deleteByPrefix("feed:");
        return ResponseEntity.ok(saved);
    }

    // Eliminar anuncio — autor o ADMIN
    @DeleteMapping("/anuncio/{id}")
    public ResponseEntity<?> eliminarAnuncio(@PathVariable Long id,
                                              HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Publicacion pub = publicacionRepository.findById(id).orElse(null);
        if (pub == null || !Boolean.TRUE.equals(pub.getEsAnuncio())) return ResponseEntity.notFound().build();

        Usuario.Rol rol = usuario.getRol();
        if (rol != Usuario.Rol.ADMIN && !pub.getUsuarioId().equals(usuario.getId())) {
            return ResponseEntity.status(403).build();
        }

        publicacionRepository.delete(pub);
        redisCacheService.deleteByPrefix("feed:");
        return ResponseEntity.ok(Map.of("eliminado", true));
    }

    // Feed general — sin page param → lista completa (compat perfil/buscar)
    //               con page param → respuesta paginada { content, hasMore, page }
    @GetMapping
    public ResponseEntity<?> listar(
            @RequestParam(required = false) Integer page,
            @RequestParam(defaultValue = "15") int size) {
        if (page == null) {
            String key = "feed:all";
            var cached = redisCacheService.get(key, List.class);
            if (cached.isPresent()) return ResponseEntity.ok(cached.get());
            List<Publicacion> result = publicacionRepository.findAllByOrderByFechaDesc();
            redisCacheService.set(key, result, Duration.ofSeconds(30));
            return ResponseEntity.ok(result);
        }
        String key = "feed:page:" + page + ":size:" + size;
        var cached = redisCacheService.get(key, Map.class);
        if (cached.isPresent()) return ResponseEntity.ok(cached.get());
        Page<Publicacion> result = publicacionRepository.findActiveFeed(
                LocalDateTime.now(), PageRequest.of(page, size));
        Map<String, Object> response = Map.of(
                "content",  result.getContent(),
                "hasMore",  !result.isLast(),
                "page",     page
        );
        redisCacheService.set(key, response, Duration.ofSeconds(20));
        return ResponseEntity.ok(response);
    }

    // Solo anuncios oficiales (más reciente primero)
    @GetMapping("/anuncios")
    public List<Publicacion> listarAnuncios() {
        return publicacionRepository.findByEsAnuncioTrueOrderByFechaDesc();
    }

    // Posts de un usuario específico
    @GetMapping("/usuario/{id}")
    public List<Publicacion> listarPorUsuario(@PathVariable Long id) {
        return publicacionRepository.findByUsuarioId(id);
    }

    // Editar publicación (solo el autor)
    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id,
                                    @RequestBody Publicacion body,
                                    HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Publicacion pub = publicacionRepository.findById(id).orElse(null);
        if (pub == null) return ResponseEntity.notFound().build();
        if (!pub.getUsuarioId().equals(usuario.getId())) return ResponseEntity.status(403).build();

        pub.setContenido(body.getContenido());
        Publicacion saved = publicacionRepository.save(pub);
        redisCacheService.deleteByPrefix("feed:");
        return ResponseEntity.ok(saved);
    }

    // Fijar/desfijar publicación (solo el autor; una sola a la vez)
    @PutMapping("/{id}/fijar")
    public ResponseEntity<?> fijar(@PathVariable Long id, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Publicacion pub = publicacionRepository.findById(id).orElse(null);
        if (pub == null) return ResponseEntity.notFound().build();
        if (!pub.getUsuarioId().equals(usuario.getId())) return ResponseEntity.status(403).build();

        if (Boolean.TRUE.equals(pub.getFijada())) {
            pub.setFijada(false);
        } else {
            publicacionRepository.findByUsuarioIdAndFijadaTrue(usuario.getId())
                    .ifPresent(anterior -> { anterior.setFijada(false); publicacionRepository.save(anterior); });
            pub.setFijada(true);
        }
        Publicacion saved = publicacionRepository.save(pub);
        redisCacheService.deleteByPrefix("feed:");
        return ResponseEntity.ok(saved);
    }

    // Compartir una publicación
    @PostMapping("/compartir/{id}")
    public ResponseEntity<?> compartir(@PathVariable Long id,
                                       @RequestBody(required = false) Map<String, String> body,
                                       HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Publicacion original = publicacionRepository.findById(id).orElse(null);
        if (original == null) return ResponseEntity.notFound().build();

        // Si la original es ya una compartida, apuntar al post raíz
        Long origenId = Boolean.TRUE.equals(original.getCompartida()) && original.getPublicacionOriginalId() != null
                ? original.getPublicacionOriginalId()
                : original.getId();

        // Verificar que no haya compartido este post raíz antes
        if (publicacionRepository.findByUsuarioIdAndPublicacionOriginalId(usuario.getId(), origenId).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Ya compartiste esta publicación");
        }

        Publicacion compartida = new Publicacion();
        compartida.setUsuarioId(usuario.getId());
        compartida.setFecha(LocalDateTime.now());
        compartida.setCompartida(true);
        compartida.setPublicacionOriginalId(origenId);
        compartida.setEsAnuncio(false);
        compartida.setTipo(Publicacion.Tipo.texto);
        // Comentario opcional del usuario al compartir
        String comentario = body != null ? body.getOrDefault("comentario", "") : "";
        compartida.setContenido(comentario.trim());

        Publicacion guardada = publicacionRepository.save(compartida);
        redisCacheService.deleteByPrefix("feed:");

        // Notificar al autor original
        Publicacion raiz = publicacionRepository.findById(origenId).orElse(original);
        if (!raiz.getUsuarioId().equals(usuario.getId())) {
            notificacionService.crearYPush(
                    raiz.getUsuarioId(), "compartir",
                    usuario.getUsername() + " compartió tu publicación",
                    raiz.getId());
        }

        return ResponseEntity.ok(guardada);
    }

    // Eliminar publicación (solo el autor)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Publicacion pub = publicacionRepository.findById(id).orElse(null);
        if (pub == null) return ResponseEntity.notFound().build();
        if (!pub.getUsuarioId().equals(usuario.getId())) return ResponseEntity.status(403).build();

        publicacionRepository.delete(pub);
        redisCacheService.deleteByPrefix("feed:");
        return ResponseEntity.ok(Map.of("mensaje", "Publicación eliminada"));
    }
}
