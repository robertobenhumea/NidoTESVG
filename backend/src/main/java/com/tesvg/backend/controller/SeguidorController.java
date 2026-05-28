package com.tesvg.backend.controller;

import com.tesvg.backend.model.Seguidor;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.SeguidorRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.NotificacionService;
import com.tesvg.backend.service.RedisCacheService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/seguidores")
public class SeguidorController {

    @Autowired
    private SeguidorRepository seguidorRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private NotificacionService notificacionService;

    @Autowired
    private RedisCacheService redisCacheService;

    // Seguir o dejar de seguir (toggle)
    @PostMapping("/toggle/{seguidoId}")
    public ResponseEntity<?> toggleSeguir(@PathVariable Long seguidoId,
                                           HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (usuario.getId().equals(seguidoId)) {
            return ResponseEntity.badRequest().body("No puedes seguirte a ti mismo");
        }

        if (!usuarioRepository.existsById(seguidoId)) {
            return ResponseEntity.notFound().build();
        }

        Optional<Seguidor> existente = seguidorRepository
                .findBySeguidorIdAndSeguidoId(usuario.getId(), seguidoId);

        if (existente.isPresent()) {
            seguidorRepository.delete(existente.get());
            redisCacheService.deleteByPrefix("suggestions:" + usuario.getId() + ":");
            return ResponseEntity.ok(Map.of(
                "accion", "dejado de seguir",
                "seguidores", seguidorRepository.countBySeguidoId(seguidoId)
            ));
        } else {
            Seguidor seguidor = new Seguidor();
            seguidor.setSeguidorId(usuario.getId());
            seguidor.setSeguidoId(seguidoId);
            seguidor.setFecha(LocalDateTime.now());
            seguidorRepository.save(seguidor);
            redisCacheService.deleteByPrefix("suggestions:" + usuario.getId() + ":");
            notificacionService.crearYPush(
                    seguidoId, "seguidor",
                    usuario.getUsername() + " comenzó a seguirte",
                    usuario.getId());
            return ResponseEntity.ok(Map.of(
                "accion", "siguiendo",
                "seguidores", seguidorRepository.countBySeguidoId(seguidoId)
            ));
        }
    }

    // Ver seguidores de un usuario
    @GetMapping("/{usuarioId}/seguidores")
    public ResponseEntity<?> verSeguidores(@PathVariable Long usuarioId) {
        List<Seguidor> seguidores = seguidorRepository.findBySeguidoId(usuarioId);
        return ResponseEntity.ok(Map.of(
            "total", seguidores.size(),
            "seguidores", seguidores
        ));
    }

    // Ver a quiénes sigue un usuario
    @GetMapping("/{usuarioId}/siguiendo")
    public ResponseEntity<?> verSiguiendo(@PathVariable Long usuarioId) {
        List<Seguidor> siguiendo = seguidorRepository.findBySeguidorId(usuarioId);
        return ResponseEntity.ok(Map.of(
            "total", siguiendo.size(),
            "siguiendo", siguiendo
        ));
    }

    // Seguidores del usuario actual (token)
    @GetMapping("/mis-seguidores")
    public ResponseEntity<?> misSeguidores(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        List<Seguidor> seguidores = seguidorRepository.findBySeguidoId(usuario.getId());
        return ResponseEntity.ok(Map.of("total", seguidores.size(), "seguidores", seguidores));
    }

    // A quiénes sigue el usuario actual (token)
    @GetMapping("/mi-siguiendo")
    public ResponseEntity<?> miSiguiendo(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        List<Seguidor> siguiendo = seguidorRepository.findBySeguidorId(usuario.getId());
        return ResponseEntity.ok(Map.of("total", siguiendo.size(), "siguiendo", siguiendo));
    }

    // Ver si sigues a alguien
    @GetMapping("/estado/{seguidoId}")
    public ResponseEntity<?> estadoSeguimiento(@PathVariable Long seguidoId,
                                                HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        boolean siguiendo = seguidorRepository
                .findBySeguidorIdAndSeguidoId(usuario.getId(), seguidoId)
                .isPresent();

        return ResponseEntity.ok(Map.of(
            "siguiendo", siguiendo,
            "seguidores", seguidorRepository.countBySeguidoId(seguidoId)
        ));
    }

    // Lista enriquecida de seguidores de un usuario
    @GetMapping("/{userId}/lista-seguidores")
    public ResponseEntity<?> listaSeguidores(@PathVariable Long userId,
                                              HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario yo = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        List<Seguidor> rels = seguidorRepository.findBySeguidoIdOrderByFechaDesc(userId);
        List<Map<String, Object>> items = new ArrayList<>();
        for (Seguidor rel : rels) {
            usuarioRepository.findById(rel.getSeguidorId()).ifPresent(u ->
                items.add(buildUserItem(u, yo.getId()))
            );
        }
        return ResponseEntity.ok(Map.of("total", items.size(), "usuarios", items));
    }

    // Lista enriquecida de seguidos de un usuario
    @GetMapping("/{userId}/lista-siguiendo")
    public ResponseEntity<?> listaSiguiendo(@PathVariable Long userId,
                                             HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario yo = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        List<Seguidor> rels = seguidorRepository.findBySeguidorIdOrderByFechaDesc(userId);
        List<Map<String, Object>> items = new ArrayList<>();
        for (Seguidor rel : rels) {
            usuarioRepository.findById(rel.getSeguidoId()).ifPresent(u ->
                items.add(buildUserItem(u, yo.getId()))
            );
        }
        return ResponseEntity.ok(Map.of("total", items.size(), "usuarios", items));
    }

    // Sugerencias de personas a seguir
    @GetMapping("/sugerencias")
    public ResponseEntity<?> sugerencias(
            HttpServletRequest request,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int limit) {

        String correo = (String) request.getAttribute("correo");
        Usuario yo = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        String key = "suggestions:" + yo.getId() + ":page:" + page + ":limit:" + limit;
        var cached = redisCacheService.get(key, Map.class);
        if (cached.isPresent()) return ResponseEntity.ok(cached.get());

        Set<Long> siguiendoIds = seguidorRepository.findBySeguidorId(yo.getId())
                .stream().map(Seguidor::getSeguidoId).collect(Collectors.toSet());

        Set<String> misIntereses = parseIntereses(yo.getIntereses());

        List<Usuario> candidatos = usuarioRepository.findAll().stream()
                .filter(u -> !u.getId().equals(yo.getId()) && !siguiendoIds.contains(u.getId()) && u.isActivo())
                .collect(Collectors.toList());

        List<Map<String, Object>> scored = new ArrayList<>();
        for (Usuario u : candidatos) {
            int score = 0;

            // Carrera común (+3)
            if (yo.getCarrera() != null && yo.getCarrera().equalsIgnoreCase(u.getCarrera())) score += 3;
            // Grupo/semestre común (+2)
            if (yo.getGrupo() != null && yo.getGrupo().equalsIgnoreCase(u.getGrupo())) score += 2;
            // Seguidores en común (max +5)
            int mutuals = seguidorRepository.countMutuals(yo.getId(), u.getId());
            score += Math.min(mutuals, 5);
            // Intereses comunes (max +4)
            Set<String> susIntereses = parseIntereses(u.getIntereses());
            List<String> interesesComunes = misIntereses.stream()
                    .filter(i -> susIntereses.stream().anyMatch(s -> s.equalsIgnoreCase(i)))
                    .collect(Collectors.toList());
            score += Math.min(interesesComunes.size() * 2, 4);
            // Tiene foto de perfil (+1)
            if (u.getFotoPerfil() != null && !u.getFotoPerfil().isBlank()) score += 1;
            // Tiene bio (+1)
            if (u.getBio() != null && !u.getBio().isBlank()) score += 1;

            Map<String, Object> item = buildUserItem(u, yo.getId());
            item.put("score", score);
            item.put("mutuals", mutuals);
            item.put("interesesComunes", interesesComunes);
            scored.add(item);
        }

        scored.sort(Comparator.comparingInt(m -> -((int) m.get("score"))));

        int total = scored.size();
        int from  = page * limit;
        int to    = Math.min(from + limit, total);
        List<Map<String, Object>> pageItems = from >= total
                ? new ArrayList<>()
                : scored.subList(from, to);

        Map<String, Object> response = Map.of(
            "sugerencias", pageItems,
            "total", total,
            "page", page,
            "hasMore", to < total
        );
        redisCacheService.set(key, response, Duration.ofMinutes(5));
        return ResponseEntity.ok(response);
    }

    private Set<String> parseIntereses(String intereses) {
        if (intereses == null || intereses.isBlank()) return Set.of();
        return java.util.Arrays.stream(intereses.split("[,;\\n]+"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());
    }

    private Map<String, Object> buildUserItem(Usuario u, Long yoId) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", u.getId());
        item.put("username", u.getUsername());
        item.put("fotoPerfil", u.getFotoPerfil());
        item.put("fotoPortada", u.getFotoPortada());
        item.put("bio", u.getBio());
        item.put("carrera", u.getCarrera());
        item.put("grupo", u.getGrupo());
        item.put("intereses", u.getIntereses());
        boolean siguiendo = seguidorRepository
                .findBySeguidorIdAndSeguidoId(yoId, u.getId()).isPresent();
        item.put("siguiendo", siguiendo);
        item.put("mutuals", seguidorRepository.countMutuals(yoId, u.getId()));
        item.put("totalSeguidores", seguidorRepository.countBySeguidoId(u.getId()));
        return item;
    }
}
