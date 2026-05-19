package com.tesvg.backend.controller;

import com.tesvg.backend.model.ComentarioReaccion;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.ComentarioReaccionRepository;
import com.tesvg.backend.repository.ComentarioRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/comentarios")
public class ComentarioReaccionController {

    @Autowired
    private ComentarioReaccionRepository reaccionRepository;

    @Autowired
    private ComentarioRepository comentarioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    /**
     * POST /comentarios/{id}/reacciones
     * Body: { "tipo": "ME_GUSTA" | "ME_ENCANTA" | "ME_DIVIERTE" | "ME_SORPRENDE" | "ME_ENTRISTECE" | "ME_ENOJA" }
     * Lógica: si ya existe y es el mismo tipo → toggle off (eliminar), si distinto → actualizar, si no existe → crear
     */
    @PostMapping("/{comentarioId}/reacciones")
    public ResponseEntity<?> toggleReaccion(
            @PathVariable Long comentarioId,
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {

        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (!comentarioRepository.existsById(comentarioId)) {
            return ResponseEntity.notFound().build();
        }

        String tipoStr = (body != null && body.containsKey("tipo")) ? body.get("tipo") : "ME_GUSTA";
        ComentarioReaccion.TipoReaccion tipo;
        try {
            tipo = ComentarioReaccion.TipoReaccion.valueOf(tipoStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            tipo = ComentarioReaccion.TipoReaccion.ME_GUSTA;
        }

        Optional<ComentarioReaccion> existente =
                reaccionRepository.findByComentarioIdAndUsuarioId(comentarioId, usuario.getId());

        String accion;
        String tipoResultante = null;

        if (existente.isPresent()) {
            ComentarioReaccion rx = existente.get();
            if (rx.getTipo() == tipo) {
                // Mismo tipo → quitar (toggle off)
                reaccionRepository.delete(rx);
                accion = "quitado";
            } else {
                // Distinto tipo → actualizar
                rx.setTipo(tipo);
                reaccionRepository.save(rx);
                accion = "cambiado";
                tipoResultante = tipo.name();
            }
        } else {
            // No existe → crear
            ComentarioReaccion rx = new ComentarioReaccion();
            rx.setComentarioId(comentarioId);
            rx.setUsuarioId(usuario.getId());
            rx.setTipo(tipo);
            rx.setCreatedAt(LocalDateTime.now());
            reaccionRepository.save(rx);
            accion = "dado";
            tipoResultante = tipo.name();
        }

        long total = reaccionRepository.countByComentarioId(comentarioId);
        Map<String, Object> resp = new HashMap<>();
        resp.put("accion", accion);
        resp.put("reactionCount", total);
        if (tipoResultante != null) resp.put("tipo", tipoResultante);
        return ResponseEntity.ok(resp);
    }

    /**
     * DELETE /comentarios/{id}/reacciones
     * Quita la reacción del usuario al comentario
     */
    @DeleteMapping("/{comentarioId}/reacciones")
    public ResponseEntity<?> quitarReaccion(
            @PathVariable Long comentarioId,
            HttpServletRequest request) {

        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        reaccionRepository.findByComentarioIdAndUsuarioId(comentarioId, usuario.getId())
                .ifPresent(reaccionRepository::delete);

        long total = reaccionRepository.countByComentarioId(comentarioId);
        return ResponseEntity.ok(Map.of("accion", "quitado", "reactionCount", total));
    }

    /**
     * GET /comentarios/{id}/reacciones
     * Retorna conteo total + top reacciones + reacción del usuario actual
     */
    @GetMapping("/{comentarioId}/reacciones")
    public ResponseEntity<?> getReacciones(
            @PathVariable Long comentarioId,
            HttpServletRequest request) {

        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        long total = reaccionRepository.countByComentarioId(comentarioId);

        Optional<ComentarioReaccion> userRx =
                reaccionRepository.findByComentarioIdAndUsuarioId(comentarioId, usuario.getId());

        List<Object[]> topRaw = reaccionRepository.findTopReaccionesByComentarioId(comentarioId);
        List<Map<String, Object>> top = new ArrayList<>();
        int limit = Math.min(3, topRaw.size());
        for (int i = 0; i < limit; i++) {
            Object[] row = topRaw.get(i);
            Map<String, Object> entry = new HashMap<>();
            entry.put("tipo", row[0].toString());
            entry.put("count", row[1]);
            top.add(entry);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("reactionCount", total);
        result.put("userReaction", userRx.map(rx -> rx.getTipo().name()).orElse(null));
        result.put("topReactions", top);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /comentarios/reacciones-batch?ids=1,2,3
     * Retorna datos de reacciones para múltiples comentarios de una vez
     */
    @GetMapping("/reacciones-batch")
    public ResponseEntity<?> getBatch(
            @RequestParam String ids,
            HttpServletRequest request) {

        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        List<Long> comentarioIds = new ArrayList<>();
        for (String s : ids.split(",")) {
            try { comentarioIds.add(Long.parseLong(s.trim())); } catch (NumberFormatException ignored) {}
        }

        // Reacciones del usuario para estos comentarios
        List<ComentarioReaccion> userRxs =
                reaccionRepository.findByUsuarioIdAndComentarioIdIn(usuario.getId(), comentarioIds);
        Map<Long, String> userRxMap = new HashMap<>();
        for (ComentarioReaccion rx : userRxs) {
            userRxMap.put(rx.getComentarioId(), rx.getTipo().name());
        }

        // Conteos por comentario
        Map<Long, Long> counts = new HashMap<>();
        for (Long cid : comentarioIds) {
            counts.put(cid, reaccionRepository.countByComentarioId(cid));
        }

        // Build response
        Map<String, Map<String, Object>> result = new HashMap<>();
        for (Long cid : comentarioIds) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("reactionCount", counts.getOrDefault(cid, 0L));
            entry.put("userReaction", userRxMap.getOrDefault(cid, null));
            result.put(cid.toString(), entry);
        }
        return ResponseEntity.ok(result);
    }
}
