package com.tesvg.backend.controller;

import com.tesvg.backend.model.Comentario;
import com.tesvg.backend.model.Like;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.ComentarioRepository;
import com.tesvg.backend.repository.LikeRepository;
import com.tesvg.backend.repository.PublicacionRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.NotificacionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/interacciones")
public class LikeComentarioController {

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private ComentarioRepository comentarioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PublicacionRepository publicacionRepository;

    @Autowired
    private NotificacionService notificacionService;

    // ── LIKES ──────────────────────────────────────

    // Dar, cambiar o quitar reacción (toggle)
    @PostMapping("/like/{publicacionId}")
    public ResponseEntity<?> toggleLike(@PathVariable Long publicacionId,
                                        @RequestBody(required = false) Map<String, String> body,
                                        HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        String tipoStr = (body != null && body.containsKey("tipo")) ? body.get("tipo") : "like";
        Like.TipoReaccion tipo;
        try {
            tipo = Like.TipoReaccion.valueOf(tipoStr);
        } catch (IllegalArgumentException e) {
            tipo = Like.TipoReaccion.like;
        }

        Optional<Like> existente = likeRepository
                .findByUsuarioIdAndPublicacionId(usuario.getId(), publicacionId);

        if (existente.isPresent()) {
            Like like = existente.get();
            if (like.getTipo() == tipo) {
                // Misma reacción → quitar
                likeRepository.delete(like);
                return ResponseEntity.ok(Map.of(
                    "accion", "quitado",
                    "likes", likeRepository.countByPublicacionId(publicacionId)
                ));
            } else {
                // Distinta reacción → cambiar tipo
                like.setTipo(tipo);
                likeRepository.save(like);
                return ResponseEntity.ok(Map.of(
                    "accion", "cambiado",
                    "tipo", tipo.name(),
                    "likes", likeRepository.countByPublicacionId(publicacionId)
                ));
            }
        } else {
            // Sin reacción previa → crear
            Like like = new Like();
            like.setUsuarioId(usuario.getId());
            like.setPublicacionId(publicacionId);
            like.setTipo(tipo);
            likeRepository.save(like);
            publicacionRepository.findById(publicacionId).ifPresent(pub -> {
                if (!pub.getUsuarioId().equals(usuario.getId())) {
                    notificacionService.crearYPush(
                            pub.getUsuarioId(), "like",
                            usuario.getUsername() + " reaccionó a tu publicación",
                            publicacionId);
                }
            });
            return ResponseEntity.ok(Map.of(
                "accion", "dado",
                "tipo", tipo.name(),
                "likes", likeRepository.countByPublicacionId(publicacionId)
            ));
        }
    }

    // Contar likes de una publicación
    @GetMapping("/likes/{publicacionId}")
    public ResponseEntity<?> contarLikes(@PathVariable Long publicacionId) {
        return ResponseEntity.ok(Map.of(
            "likes", likeRepository.countByPublicacionId(publicacionId)
        ));
    }

    // IDs de publicaciones que el usuario actual ha dado like (compatibilidad)
    @GetMapping("/mis-likes")
    public List<Long> misLikes(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return likeRepository.findByUsuarioId(usuario.getId())
                .stream().map(Like::getPublicacionId).collect(Collectors.toList());
    }

    // Reacción del usuario actual por publicación: publicacionId → tipo
    @GetMapping("/mis-reacciones")
    public Map<Long, String> misReacciones(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return likeRepository.findByUsuarioId(usuario.getId()).stream()
                .collect(Collectors.toMap(Like::getPublicacionId, l -> l.getTipo().name()));
    }

    // Conteo de likes agrupado por publicación (para cargar el feed de una vez)
    @GetMapping("/likes-todos")
    public Map<Long, Long> likesTodos() {
        return likeRepository.findAll().stream()
                .collect(Collectors.groupingBy(Like::getPublicacionId, Collectors.counting()));
    }

    // Conteo de reacciones por tipo por publicación: publicacionId → { tipo → count }
    @GetMapping("/reacciones-todos")
    public Map<Long, Map<String, Long>> reaccionesTodas() {
        Map<Long, Map<String, Long>> resultado = new HashMap<>();
        likeRepository.findAll().forEach(l -> {
            resultado
                .computeIfAbsent(l.getPublicacionId(), k -> new HashMap<>())
                .merge(l.getTipo().name(), 1L, Long::sum);
        });
        return resultado;
    }

    // ── COMENTARIOS ────────────────────────────────

    // Agregar comentario
    @PostMapping("/comentario/{publicacionId}")
    public ResponseEntity<?> comentar(@PathVariable Long publicacionId,
                                      @RequestBody Map<String, String> body,
                                      HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        String contenido = body.get("contenido");
        if (contenido == null || contenido.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("El comentario no puede estar vacío");
        }

        // Verificar que la publicación permite comentarios
        com.tesvg.backend.model.Publicacion pub2 = publicacionRepository.findById(publicacionId).orElse(null);
        if (pub2 != null && !pub2.getAllowComments()) {
            return ResponseEntity.status(403).body("Los comentarios están desactivados en esta publicación");
        }

        Comentario comentario = new Comentario();
        comentario.setUsuarioId(usuario.getId());
        comentario.setPublicacionId(publicacionId);
        comentario.setContenido(contenido.trim());
        comentario.setFecha(LocalDateTime.now());

        Comentario guardado = comentarioRepository.save(comentario);
        publicacionRepository.findById(publicacionId).ifPresent(pub -> {
            if (!pub.getUsuarioId().equals(usuario.getId())) {
                notificacionService.crearYPush(
                        pub.getUsuarioId(), "comentario",
                        usuario.getUsername() + " comentó en tu publicación",
                        publicacionId);
            }
        });
        return ResponseEntity.ok(guardado);
    }

    // Listar comentarios de una publicación
    @GetMapping("/comentarios/{publicacionId}")
    public List<Comentario> listarComentarios(@PathVariable Long publicacionId) {
        return comentarioRepository.findByPublicacionIdOrderByFechaAsc(publicacionId);
    }

    // Todos los comentarios agrupados por publicación (para cargar el feed de una vez)
    @GetMapping("/comentarios-todos")
    public Map<Long, List<Comentario>> comentariosTodos() {
        return comentarioRepository.findAll().stream()
                .collect(Collectors.groupingBy(Comentario::getPublicacionId));
    }

    // Borrar comentario (solo el autor)
    @DeleteMapping("/comentario/{comentarioId}")
    public ResponseEntity<?> borrarComentario(@PathVariable Long comentarioId,
                                               HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Comentario comentario = comentarioRepository.findById(comentarioId)
                .orElseThrow(() -> new RuntimeException("Comentario no encontrado"));

        if (!comentario.getUsuarioId().equals(usuario.getId())) {
            return ResponseEntity.status(403).body("No puedes borrar este comentario");
        }

        comentarioRepository.delete(comentario);
        return ResponseEntity.ok(Map.of("mensaje", "Comentario eliminado"));
    }
}