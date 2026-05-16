package com.tesvg.backend.controller;

import com.tesvg.backend.model.CodigoRegistro;
import com.tesvg.backend.model.Publicacion;
import com.tesvg.backend.model.Reporte;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.CodigoRegistroRepository;
import com.tesvg.backend.repository.PublicacionRepository;
import com.tesvg.backend.repository.ReporteRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private PublicacionRepository publicacionRepo;
    @Autowired private ReporteRepository reporteRepo;
    @Autowired private CodigoRegistroRepository codigoRepo;

    private Usuario requireAdmin(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        if (correo == null) throw new RuntimeException("No autenticado");
        Usuario u = usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        if (u.getRol() != Usuario.Rol.ADMIN)
            throw new RuntimeException("Acceso denegado");
        return u;
    }

    // ── STATS ──────────────────────────────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<?> stats(HttpServletRequest req) {
        requireAdmin(req);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalUsuarios",       usuarioRepo.count());
        m.put("usuariosActivos",     usuarioRepo.countByActivoTrue());
        m.put("usuariosInactivos",   usuarioRepo.countByActivoFalse());
        m.put("totalPublicaciones",  publicacionRepo.count());
        m.put("reportesPendientes",  reporteRepo.countByAtendidoFalse());
        return ResponseEntity.ok(m);
    }

    // ── USUARIOS ───────────────────────────────────────────────────────────────
    @GetMapping("/usuarios")
    public ResponseEntity<?> listarUsuarios(HttpServletRequest req) {
        requireAdmin(req);
        List<Map<String, Object>> result = usuarioRepo.findAll().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",         u.getId());
            m.put("username",   u.getUsername());
            m.put("correo",     u.getCorreo());
            m.put("rol",        u.getRol());
            m.put("carrera",    u.getCarrera());
            m.put("grupo",      u.getGrupo());
            m.put("activo",     u.isActivo());
            m.put("fotoPerfil", u.getFotoPerfil());
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/usuarios/{id}/rol")
    public ResponseEntity<?> cambiarRol(@PathVariable Long id,
                                        @RequestBody Map<String, String> body,
                                        HttpServletRequest req) {
        requireAdmin(req);
        Usuario u = usuarioRepo.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();
        try {
            u.setRol(Usuario.Rol.valueOf(body.get("rol")));
            usuarioRepo.save(u);
            return ResponseEntity.ok(Map.of("rol", u.getRol()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Rol inválido");
        }
    }

    @PutMapping("/usuarios/{id}/activo")
    public ResponseEntity<?> toggleActivo(@PathVariable Long id, HttpServletRequest req) {
        requireAdmin(req);
        Usuario u = usuarioRepo.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();
        // Prevent admin from deactivating themselves
        String miCorreo = (String) req.getAttribute("correo");
        if (u.getCorreo().equals(miCorreo))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("No puedes desactivar tu propia cuenta");
        u.setActivo(!u.isActivo());
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("activo", u.isActivo()));
    }

    @DeleteMapping("/usuarios/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id, HttpServletRequest req) {
        requireAdmin(req);
        String miCorreo = (String) req.getAttribute("correo");
        Usuario u = usuarioRepo.findById(id).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();
        if (u.getCorreo().equals(miCorreo))
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("No puedes eliminar tu propia cuenta");
        usuarioRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ── PUBLICACIONES ──────────────────────────────────────────────────────────
    @GetMapping("/publicaciones")
    public ResponseEntity<?> listarPublicaciones(HttpServletRequest req) {
        requireAdmin(req);
        List<Publicacion> pubs = publicacionRepo.findAllByOrderByFechaDesc();
        List<Map<String, Object>> result = pubs.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",         p.getId());
            m.put("contenido",  p.getContenido());
            m.put("usuarioId",  p.getUsuarioId());
            m.put("fecha",      p.getFecha());
            m.put("esAnuncio",  p.getEsAnuncio());
            m.put("imagenUrl",  p.getImagenUrl());
            usuarioRepo.findById(p.getUsuarioId()).ifPresent(u ->
                m.put("autorNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo())
            );
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/publicaciones/{id}")
    public ResponseEntity<?> eliminarPublicacion(@PathVariable Long id, HttpServletRequest req) {
        requireAdmin(req);
        if (!publicacionRepo.existsById(id)) return ResponseEntity.notFound().build();
        publicacionRepo.deleteById(id);
        // Mark associated reports as attended
        reporteRepo.findByPublicacionId(id).forEach(r -> {
            r.setAtendido(true);
            reporteRepo.save(r);
        });
        return ResponseEntity.ok().build();
    }

    // ── REPORTES ───────────────────────────────────────────────────────────────
    @GetMapping("/reportes")
    public ResponseEntity<?> listarReportes(HttpServletRequest req) {
        requireAdmin(req);
        List<Reporte> reportes = reporteRepo.findByAtendidoFalseOrderByFechaDesc();
        List<Map<String, Object>> result = reportes.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",            r.getId());
            m.put("publicacionId", r.getPublicacionId());
            m.put("reportanteId",  r.getReportanteId());
            m.put("razon",         r.getRazon());
            m.put("fecha",         r.getFecha());
            publicacionRepo.findById(r.getPublicacionId()).ifPresent(p -> {
                m.put("pubContenido",  p.getContenido());
                m.put("pubUsuarioId",  p.getUsuarioId());
                usuarioRepo.findById(p.getUsuarioId()).ifPresent(u ->
                    m.put("pubAutor", u.getUsername() != null ? u.getUsername() : u.getCorreo())
                );
            });
            usuarioRepo.findById(r.getReportanteId()).ifPresent(u ->
                m.put("reportanteNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo())
            );
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/reportes/{id}/atender")
    public ResponseEntity<?> atenderReporte(@PathVariable Long id, HttpServletRequest req) {
        requireAdmin(req);
        Reporte r = reporteRepo.findById(id).orElse(null);
        if (r == null) return ResponseEntity.notFound().build();
        r.setAtendido(true);
        reporteRepo.save(r);
        return ResponseEntity.ok().build();
    }

    // ── CÓDIGOS DE REGISTRO ────────────────────────────────────────────────────

    private Map<String, Object> codigoToMap(CodigoRegistro c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          c.getId());
        m.put("codigo",      c.getCodigo());
        m.put("rol",         c.getRol());
        m.put("descripcion", c.getDescripcion());
        m.put("activo",      c.isActivo());
        m.put("usos",        c.getUsos());
        m.put("maxUsos",     c.getMaxUsos());
        m.put("fecha",       c.getFecha());
        if (c.getCreadoPor() != null) {
            usuarioRepo.findById(c.getCreadoPor()).ifPresent(u ->
                m.put("creadoPorNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo())
            );
        }
        return m;
    }

    @GetMapping("/codigos-registro")
    public ResponseEntity<?> listarCodigos(HttpServletRequest req) {
        requireAdmin(req);
        return ResponseEntity.ok(
            codigoRepo.findAllByOrderByFechaDesc().stream()
                .map(this::codigoToMap).collect(Collectors.toList())
        );
    }

    @PostMapping("/codigos-registro")
    public ResponseEntity<?> crearCodigo(@RequestBody Map<String, Object> body,
                                          HttpServletRequest req) {
        Usuario admin = requireAdmin(req);
        String codigo = (String) body.get("codigo");
        String rolStr = (String) body.get("rol");
        if (codigo == null || codigo.isBlank() || rolStr == null)
            return ResponseEntity.badRequest().body("codigo y rol son requeridos");
        CodigoRegistro c = new CodigoRegistro();
        c.setCodigo(codigo.trim().toUpperCase());
        try { c.setRol(Usuario.Rol.valueOf(rolStr)); }
        catch (Exception e) { return ResponseEntity.badRequest().body("Rol inválido"); }
        c.setDescripcion((String) body.get("descripcion"));
        c.setCreadoPor(admin.getId());
        c.setFecha(java.time.LocalDateTime.now());
        Object maxUsosRaw = body.get("maxUsos");
        if (maxUsosRaw != null) {
            try { c.setMaxUsos(Integer.parseInt(maxUsosRaw.toString())); }
            catch (Exception ignored) {}
        }
        try { return ResponseEntity.ok(codigoToMap(codigoRepo.save(c))); }
        catch (Exception e) { return ResponseEntity.badRequest().body("Ese código ya existe"); }
    }

    @PutMapping("/codigos-registro/{id}/toggle")
    public ResponseEntity<?> toggleCodigo(@PathVariable Long id, HttpServletRequest req) {
        requireAdmin(req);
        CodigoRegistro c = codigoRepo.findById(id).orElse(null);
        if (c == null) return ResponseEntity.notFound().build();
        c.setActivo(!c.isActivo());
        codigoRepo.save(c);
        return ResponseEntity.ok(Map.of("activo", c.isActivo()));
    }

    @DeleteMapping("/codigos-registro/{id}")
    public ResponseEntity<?> eliminarCodigo(@PathVariable Long id, HttpServletRequest req) {
        requireAdmin(req);
        if (!codigoRepo.existsById(id)) return ResponseEntity.notFound().build();
        codigoRepo.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // ── REPORTAR PUBLICACIÓN (cualquier usuario autenticado) ──────────────────
    @PostMapping("/reportes/publicacion/{pubId}")
    public ResponseEntity<?> reportar(@PathVariable Long pubId,
                                      @RequestBody Map<String, String> body,
                                      HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        if (correo == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Usuario reportante = usuarioRepo.findByCorreo(correo).orElse(null);
        if (reportante == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        if (!publicacionRepo.existsById(pubId))
            return ResponseEntity.notFound().build();

        if (reporteRepo.existsByPublicacionIdAndReportanteId(pubId, reportante.getId()))
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Ya reportaste esta publicación");

        Reporte r = new Reporte();
        r.setPublicacionId(pubId);
        r.setReportanteId(reportante.getId());
        r.setRazon(body.getOrDefault("razon", null));
        r.setFecha(LocalDateTime.now());
        reporteRepo.save(r);
        return ResponseEntity.ok().build();
    }
}
