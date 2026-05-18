package com.tesvg.backend.controller;

import com.tesvg.backend.model.Notificacion;
import com.tesvg.backend.model.Reclutamiento;
import com.tesvg.backend.model.SolicitudReclutamiento;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.NotificacionRepository;
import com.tesvg.backend.repository.ReclutamientoRepository;
import com.tesvg.backend.repository.SolicitudReclutamientoRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reclutamiento")
public class ReclutamientoController {

    @Autowired private ReclutamientoRepository reclutamientoRepo;
    @Autowired private SolicitudReclutamientoRepository solicitudRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private NotificacionRepository notificacionRepo;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Usuario getUsuario(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    /** Store habilidades as comma-separated string. */
    private String habsToString(Object raw) {
        if (raw == null) return "";
        if (raw instanceof String s) return s.trim();
        if (raw instanceof List<?> list) {
            return list.stream()
                    .filter(Objects::nonNull)
                    .map(Object::toString)
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.joining(","));
        }
        return raw.toString().trim();
    }

    private List<String> habsFromString(String s) {
        if (s == null || s.isBlank()) return List.of();
        return Arrays.stream(s.split(","))
                .map(String::trim)
                .filter(h -> !h.isEmpty())
                .collect(Collectors.toList());
    }

    private Map<String, Object> toMap(Reclutamiento r, Long currentUserId,
                                      Map<Long, String> misSolicitudes) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                   r.getId());
        m.put("usuarioId",            r.getUsuarioId());
        m.put("nombreEquipo",         r.getNombreEquipo());
        m.put("nombreProyecto",       r.getNombreProyecto());
        m.put("descripcion",          r.getDescripcion());
        m.put("objetivo",             r.getObjetivo());
        m.put("tipo",                 r.getTipo().name());
        m.put("habilidades",          habsFromString(r.getHabilidades()));
        m.put("integrantesFaltantes", r.getIntegrantesFaltantes());
        m.put("fechaLimite",          r.getFechaLimite() != null ? r.getFechaLimite().toString() : null);
        m.put("imagenUrl",            r.getImagenUrl());
        m.put("estado",               r.getEstado().name());
        m.put("fecha",                r.getFecha());

        // Creator info
        usuarioRepo.findById(r.getUsuarioId()).ifPresent(u -> {
            m.put("creadorNombre",     u.getUsername() != null ? u.getUsername() : u.getCorreo());
            m.put("creadorAvatarUrl",  u.getFotoPerfil());
        });

        // Current user's solicitud state (if any)
        if (currentUserId != null && misSolicitudes != null) {
            String estado = misSolicitudes.get(r.getId());
            m.put("miSolicitud", estado); // null if no solicitud
        }

        return m;
    }

    // ── GET /reclutamiento/activos ────────────────────────────────────────────

    @GetMapping("/activos")
    public ResponseEntity<?> getActivos(HttpServletRequest req) {
        Usuario yo = getUsuario(req);

        List<Reclutamiento> list = reclutamientoRepo.findByEstadoOrderByFechaDesc(
                Reclutamiento.EstadoReclutamiento.ABIERTO);

        // Load all my solicitudes in one query and index by reclutamientoId
        List<SolicitudReclutamiento> misSols = solicitudRepo.findByUsuarioId(yo.getId());
        Map<Long, String> misSolicitudes = misSols.stream()
                .collect(Collectors.toMap(
                        SolicitudReclutamiento::getReclutamientoId,
                        s -> s.getEstado().name(),
                        (a, b) -> a // keep first on duplicate (shouldn't happen due to unique constraint)
                ));

        List<Map<String, Object>> result = list.stream()
                .map(r -> toMap(r, yo.getId(), misSolicitudes))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── GET /reclutamiento/mis ────────────────────────────────────────────────

    @GetMapping("/mis")
    public ResponseEntity<?> getMios(HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        List<Reclutamiento> list = reclutamientoRepo.findByUsuarioIdOrderByFechaDesc(yo.getId());
        List<Map<String, Object>> result = list.stream()
                .map(r -> toMap(r, yo.getId(), Map.of()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── POST /reclutamiento ───────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body,
                                   HttpServletRequest req) {
        Usuario yo = getUsuario(req);

        String nombreProyecto = (String) body.get("nombreProyecto");
        if (nombreProyecto == null || nombreProyecto.isBlank())
            return ResponseEntity.badRequest().body("El nombre del proyecto es requerido");

        Reclutamiento r = new Reclutamiento();
        r.setUsuarioId(yo.getId());
        r.setNombreProyecto(nombreProyecto.trim());

        String nombreEquipo = (String) body.get("nombreEquipo");
        if (nombreEquipo != null && !nombreEquipo.isBlank()) r.setNombreEquipo(nombreEquipo.trim());

        String desc = (String) body.get("descripcion");
        if (desc != null && !desc.isBlank()) r.setDescripcion(desc.trim());

        String obj = (String) body.get("objetivo");
        if (obj != null && !obj.isBlank()) r.setObjetivo(obj.trim());

        String tipoStr = (String) body.get("tipo");
        if (tipoStr != null) {
            try { r.setTipo(Reclutamiento.TipoReclutamiento.valueOf(tipoStr.toUpperCase())); }
            catch (IllegalArgumentException ignored) {}
        }

        r.setHabilidades(habsToString(body.get("habilidades")));

        Object intFaltantes = body.get("integrantesFaltantes");
        if (intFaltantes instanceof Number n) r.setIntegrantesFaltantes(Math.max(1, n.intValue()));

        String fechaLimiteStr = (String) body.get("fechaLimite");
        if (fechaLimiteStr != null && !fechaLimiteStr.isBlank()) {
            try { r.setFechaLimite(LocalDate.parse(fechaLimiteStr)); }
            catch (Exception ignored) {}
        }

        String imgUrl = (String) body.get("imagenUrl");
        if (imgUrl != null && !imgUrl.isBlank()) r.setImagenUrl(imgUrl.trim());

        Reclutamiento saved = reclutamientoRepo.save(r);
        return ResponseEntity.ok(toMap(saved, yo.getId(), Map.of()));
    }

    // ── PUT /reclutamiento/{id} ───────────────────────────────────────────────

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id,
                                        @RequestBody Map<String, Object> body,
                                        HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        Reclutamiento r = reclutamientoRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!r.getUsuarioId().equals(yo.getId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sin permiso");

        String estadoStr = (String) body.get("estado");
        if (estadoStr != null) {
            try { r.setEstado(Reclutamiento.EstadoReclutamiento.valueOf(estadoStr.toUpperCase())); }
            catch (IllegalArgumentException ignored) {}
        }

        Object intFaltantes = body.get("integrantesFaltantes");
        if (intFaltantes instanceof Number n)
            r.setIntegrantesFaltantes(Math.max(0, n.intValue()));

        return ResponseEntity.ok(toMap(reclutamientoRepo.save(r), yo.getId(), Map.of()));
    }

    // ── DELETE /reclutamiento/{id} ────────────────────────────────────────────

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        Reclutamiento r = reclutamientoRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!r.getUsuarioId().equals(yo.getId()) && yo.getRol() != Usuario.Rol.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sin permiso");

        solicitudRepo.deleteAll(solicitudRepo.findByReclutamientoIdOrderByFechaDesc(id));
        reclutamientoRepo.delete(r);
        return ResponseEntity.ok().build();
    }

    // ── POST /reclutamiento/{id}/solicitar ────────────────────────────────────

    @PostMapping("/{id}/solicitar")
    public ResponseEntity<?> solicitar(@PathVariable Long id,
                                       @RequestBody(required = false) Map<String, Object> body,
                                       HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        Reclutamiento r = reclutamientoRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();

        if (r.getUsuarioId().equals(yo.getId()))
            return ResponseEntity.badRequest().body("No puedes solicitar unirte a tu propio reclutamiento");
        if (r.getEstado() != Reclutamiento.EstadoReclutamiento.ABIERTO)
            return ResponseEntity.badRequest().body("Este reclutamiento ya no está abierto");
        if (solicitudRepo.existsByReclutamientoIdAndUsuarioId(id, yo.getId()))
            return ResponseEntity.badRequest().body("Ya enviaste una solicitud para este reclutamiento");

        SolicitudReclutamiento s = new SolicitudReclutamiento();
        s.setReclutamientoId(id);
        s.setUsuarioId(yo.getId());
        if (body != null) {
            String msg = (String) body.get("mensaje");
            if (msg != null && !msg.isBlank()) s.setMensaje(msg.trim());
            String carrera = (String) body.get("carrera");
            if (carrera != null && !carrera.isBlank()) s.setCarrera(carrera.trim());
            String semestre = (String) body.get("semestre");
            if (semestre != null && !semestre.isBlank()) s.setSemestre(semestre.trim());
            String experiencia = (String) body.get("experiencia");
            if (experiencia != null && !experiencia.isBlank()) s.setExperiencia(experiencia.trim());
            String githubUrl = (String) body.get("githubUrl");
            if (githubUrl != null && !githubUrl.isBlank()) s.setGithubUrl(githubUrl.trim());
        }
        solicitudRepo.save(s);

        // Notify creator
        String nombre = yo.getUsername() != null ? yo.getUsername() : yo.getCorreo();
        Notificacion notif = new Notificacion();
        notif.setUsuarioId(r.getUsuarioId());
        notif.setTipo("SOLICITUD_EQUIPO");
        notif.setMensaje(nombre + " quiere unirse a tu equipo \"" + r.getNombreProyecto() + "\".");
        notif.setReferenciaId(id);
        notif.setFecha(LocalDateTime.now());
        notificacionRepo.save(notif);

        return ResponseEntity.ok(Map.of("estado", "PENDIENTE", "mensaje", "Solicitud enviada correctamente"));
    }

    // ── DELETE /reclutamiento/{id}/solicitar ─────────────────────────────────

    @DeleteMapping("/{id}/solicitar")
    public ResponseEntity<?> cancelarSolicitud(@PathVariable Long id, HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        SolicitudReclutamiento s = solicitudRepo.findByReclutamientoIdAndUsuarioId(id, yo.getId()).orElse(null);
        if (s == null) return ResponseEntity.notFound().build();
        if (s.getEstado() != SolicitudReclutamiento.EstadoSolicitud.PENDIENTE)
            return ResponseEntity.badRequest().body("Solo puedes cancelar solicitudes pendientes");
        solicitudRepo.delete(s);
        return ResponseEntity.ok(Map.of("cancelada", true));
    }

    // ── GET /reclutamiento/{id}/solicitudes ───────────────────────────────────

    @GetMapping("/{id}/solicitudes")
    public ResponseEntity<?> getSolicitudes(@PathVariable Long id, HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        Reclutamiento r = reclutamientoRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        if (!r.getUsuarioId().equals(yo.getId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sin permiso");

        List<SolicitudReclutamiento> solicitudes =
                solicitudRepo.findByReclutamientoIdOrderByFechaDesc(id);

        List<Map<String, Object>> result = solicitudes.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",      s.getId());
            m.put("estado",  s.getEstado().name());
            m.put("mensaje", s.getMensaje());
            m.put("fecha",   s.getFecha());
            usuarioRepo.findById(s.getUsuarioId()).ifPresent(u -> {
                m.put("usuarioId",    u.getId());
                m.put("nombre",       u.getUsername() != null ? u.getUsername() : u.getCorreo());
                m.put("avatarUrl",    u.getFotoPerfil());
                m.put("carrera",      s.getCarrera() != null ? s.getCarrera() : u.getCarrera());
                m.put("semestre",     s.getSemestre());
                m.put("experiencia",  s.getExperiencia());
                m.put("githubUrl",    s.getGithubUrl());
            });
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── PUT /reclutamiento/{id}/solicitudes/{solicitudId} ─────────────────────

    @PutMapping("/{id}/solicitudes/{solicitudId}")
    public ResponseEntity<?> responderSolicitud(@PathVariable Long id,
                                                @PathVariable Long solicitudId,
                                                @RequestBody Map<String, Object> body,
                                                HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        Reclutamiento r = reclutamientoRepo.findById(id).orElse(null);
        if (r == null || !r.getUsuarioId().equals(yo.getId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        SolicitudReclutamiento s = solicitudRepo.findById(solicitudId).orElse(null);
        if (s == null || !s.getReclutamientoId().equals(id))
            return ResponseEntity.notFound().build();

        String nuevoEstado = (String) body.get("estado");
        if (nuevoEstado == null)
            return ResponseEntity.badRequest().body("Estado requerido");

        try {
            s.setEstado(SolicitudReclutamiento.EstadoSolicitud.valueOf(nuevoEstado.toUpperCase()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Estado inválido");
        }
        solicitudRepo.save(s);

        // If accepted, decrement vacantes and auto-close if full
        if ("ACEPTADA".equalsIgnoreCase(nuevoEstado) && r.getIntegrantesFaltantes() > 0) {
            r.setIntegrantesFaltantes(r.getIntegrantesFaltantes() - 1);
            if (r.getIntegrantesFaltantes() == 0)
                r.setEstado(Reclutamiento.EstadoReclutamiento.COMPLETO);
            reclutamientoRepo.save(r);
        }

        // Notify the applicant
        String respuesta = "ACEPTADA".equalsIgnoreCase(nuevoEstado) ? "aceptada" : "rechazada";
        Notificacion notif = new Notificacion();
        notif.setUsuarioId(s.getUsuarioId());
        notif.setTipo("RESPUESTA_SOLICITUD_EQUIPO");
        notif.setMensaje("Tu solicitud para \"" + r.getNombreProyecto() + "\" fue " + respuesta + ".");
        notif.setReferenciaId(id);
        notif.setFecha(LocalDateTime.now());
        notificacionRepo.save(notif);

        return ResponseEntity.ok(Map.of("estado", s.getEstado().name()));
    }
}
