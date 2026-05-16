package com.tesvg.backend.controller;

import com.tesvg.backend.model.Evento;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.EventoRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/eventos")
public class EventoController {

    @Autowired private EventoRepository eventoRepo;
    @Autowired private UsuarioRepository usuarioRepo;

    private Usuario getUsuario(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private boolean esAdmin(Usuario u) {
        return u.getRol() == Usuario.Rol.AUTORIDAD || u.getRol() == Usuario.Rol.ADMIN;
    }

    private Map<String, Object> toMap(Evento e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          e.getId());
        m.put("titulo",      e.getTitulo());
        m.put("descripcion", e.getDescripcion());
        m.put("fechaEvento", e.getFechaEvento() != null ? e.getFechaEvento().toString() : null);
        m.put("lugar",       e.getLugar());
        m.put("tipo",        e.getTipo());
        m.put("creadorId",   e.getCreadorId());
        m.put("fecha",       e.getFecha());
        usuarioRepo.findById(e.getCreadorId()).ifPresent(u ->
            m.put("creadorNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo()));
        return m;
    }

    // ── LISTAR ─────────────────────────────────────────────────────────────────
    @GetMapping
    public List<Map<String, Object>> listar() {
        return eventoRepo.findAllByOrderByFechaEventoAsc().stream()
                .map(this::toMap).collect(Collectors.toList());
    }

    // ── CREAR ──────────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body,
                                   HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        if (!esAdmin(yo)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Solo AUTORIDAD o ADMIN pueden crear eventos");
        }

        String titulo = (String) body.get("titulo");
        String fechaStr = (String) body.get("fechaEvento");
        if (titulo == null || titulo.isBlank())
            return ResponseEntity.badRequest().body("El título es requerido");
        if (fechaStr == null || fechaStr.isBlank())
            return ResponseEntity.badRequest().body("La fecha del evento es requerida");

        Evento e = new Evento();
        e.setTitulo(titulo.trim());
        e.setDescripcion((String) body.get("descripcion"));
        e.setLugar((String) body.get("lugar"));
        e.setTipo((String) body.get("tipo"));
        e.setCreadorId(yo.getId());
        e.setFecha(LocalDateTime.now());
        try {
            e.setFechaEvento(LocalDate.parse(fechaStr));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body("Formato de fecha inválido; usa YYYY-MM-DD");
        }

        return ResponseEntity.ok(toMap(eventoRepo.save(e)));
    }

    // ── ELIMINAR ───────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        if (!esAdmin(yo)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Sin permiso para eliminar eventos");
        }
        Evento e = eventoRepo.findById(id).orElse(null);
        if (e == null) return ResponseEntity.notFound().build();
        eventoRepo.delete(e);
        return ResponseEntity.ok().build();
    }
}
