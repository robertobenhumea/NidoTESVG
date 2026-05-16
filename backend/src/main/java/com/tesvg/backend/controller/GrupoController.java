package com.tesvg.backend.controller;

import com.tesvg.backend.model.*;
import com.tesvg.backend.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/grupos")
public class GrupoController {

    @Autowired private GrupoSocialRepository grupoRepo;
    @Autowired private GrupoMiembroRepository miembroRepo;
    @Autowired private GrupoPublicacionRepository gpRepo;
    @Autowired private PublicacionRepository publicacionRepo;
    @Autowired private UsuarioRepository usuarioRepo;

    private Usuario getUsuario(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    // ── LISTAR TODOS LOS GRUPOS ──────────────────────────────────────────────
    @GetMapping
    public List<Map<String, Object>> listar(HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        return grupoRepo.findAllByOrderByFechaDesc().stream().map(g -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",           g.getId());
            m.put("nombre",       g.getNombre());
            m.put("descripcion",  g.getDescripcion());
            m.put("tipo",         g.getTipo().name());
            m.put("creadorId",    g.getCreadorId());
            m.put("fecha",        g.getFecha());
            m.put("totalMiembros", miembroRepo.countByGrupoId(g.getId()));
            Optional<GrupoMiembro> mem = miembroRepo.findByGrupoIdAndUsuarioId(g.getId(), yo.getId());
            m.put("miRol",        mem.map(mb -> mb.getRol().name()).orElse(null));
            m.put("soyMiembro",   mem.isPresent());
            return m;
        }).collect(Collectors.toList());
    }

    // ── DETALLE DE UN GRUPO ──────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> detalle(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        GrupoSocial g = grupoRepo.findById(id).orElse(null);
        if (g == null) return ResponseEntity.notFound().build();

        Optional<GrupoMiembro> miMem = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId());

        // Miembros enriquecidos
        List<Map<String, Object>> miembros = miembroRepo.findByGrupoId(id).stream().map(mb -> {
            Map<String, Object> mm = new LinkedHashMap<>();
            mm.put("usuarioId", mb.getUsuarioId());
            mm.put("rol",       mb.getRol().name());
            mm.put("fecha",     mb.getFecha());
            usuarioRepo.findById(mb.getUsuarioId()).ifPresent(u -> {
                mm.put("nombre",    u.getUsername() != null ? u.getUsername() : u.getCorreo());
                mm.put("fotoPerfil", u.getFotoPerfil());
                mm.put("carrera",   u.getCarrera());
            });
            return mm;
        }).collect(Collectors.toList());

        // Posts del grupo (IDs → Publicaciones)
        List<Long> pubIds = gpRepo.findByGrupoIdOrderByIdDesc(id).stream()
                .map(GrupoPublicacion::getPublicacionId).collect(Collectors.toList());
        List<Map<String, Object>> posts = pubIds.stream()
                .map(pid -> publicacionRepo.findById(pid).orElse(null))
                .filter(Objects::nonNull)
                .map(p -> {
                    Map<String, Object> pm = new LinkedHashMap<>();
                    pm.put("id",        p.getId());
                    pm.put("contenido", p.getContenido());
                    pm.put("imagenUrl", p.getImagenUrl());
                    pm.put("fecha",     p.getFecha());
                    pm.put("usuarioId", p.getUsuarioId());
                    usuarioRepo.findById(p.getUsuarioId()).ifPresent(u -> {
                        pm.put("autorNombre",   u.getUsername() != null ? u.getUsername() : u.getCorreo());
                        pm.put("autorFoto",     u.getFotoPerfil());
                    });
                    return pm;
                }).collect(Collectors.toList());

        // Nombre del creador
        String creadorNombre = usuarioRepo.findById(g.getCreadorId())
                .map(u -> u.getUsername() != null ? u.getUsername() : u.getCorreo())
                .orElse("Desconocido");

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id",           g.getId());
        resp.put("nombre",       g.getNombre());
        resp.put("descripcion",  g.getDescripcion());
        resp.put("tipo",         g.getTipo().name());
        resp.put("creadorId",    g.getCreadorId());
        resp.put("creadorNombre", creadorNombre);
        resp.put("fecha",        g.getFecha());
        resp.put("totalMiembros", miembros.size());
        resp.put("miRol",        miMem.map(mb -> mb.getRol().name()).orElse(null));
        resp.put("soyMiembro",   miMem.isPresent());
        resp.put("miembros",     miembros);
        resp.put("posts",        posts);
        return ResponseEntity.ok(resp);
    }

    // ── CREAR GRUPO ──────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, String> body,
                                   HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        String nombre = body.getOrDefault("nombre", "").trim();
        if (nombre.isEmpty()) return ResponseEntity.badRequest().body("El nombre es requerido");

        GrupoSocial g = new GrupoSocial();
        g.setNombre(nombre);
        g.setDescripcion(body.getOrDefault("descripcion", "").trim());
        g.setCreadorId(yo.getId());
        g.setFecha(LocalDateTime.now());
        try {
            g.setTipo(GrupoSocial.TipoGrupo.valueOf(body.getOrDefault("tipo", "general")));
        } catch (IllegalArgumentException e) {
            g.setTipo(GrupoSocial.TipoGrupo.general);
        }
        GrupoSocial guardado = grupoRepo.save(g);

        // El creador se une como admin automáticamente
        GrupoMiembro admin = new GrupoMiembro();
        admin.setGrupoId(guardado.getId());
        admin.setUsuarioId(yo.getId());
        admin.setRol(GrupoMiembro.RolMiembro.admin);
        admin.setFecha(LocalDateTime.now());
        miembroRepo.save(admin);

        return ResponseEntity.ok(guardado);
    }

    // ── UNIRSE / SALIR DEL GRUPO (toggle) ────────────────────────────────────
    @PostMapping("/{id}/unirse")
    public ResponseEntity<?> unirse(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        if (!grupoRepo.existsById(id)) return ResponseEntity.notFound().build();

        Optional<GrupoMiembro> existing = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId());
        if (existing.isPresent()) {
            GrupoMiembro mem = existing.get();
            if (mem.getRol() == GrupoMiembro.RolMiembro.admin) {
                // El admin solo puede salir si hay otro admin
                long otrosAdmins = miembroRepo.findByGrupoId(id).stream()
                        .filter(m -> m.getRol() == GrupoMiembro.RolMiembro.admin && !m.getUsuarioId().equals(yo.getId()))
                        .count();
                if (otrosAdmins == 0) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body("Eres el único admin. Designa otro admin antes de salir.");
                }
            }
            miembroRepo.delete(mem);
            return ResponseEntity.ok(Map.of("accion", "salido"));
        } else {
            GrupoMiembro nuevo = new GrupoMiembro();
            nuevo.setGrupoId(id);
            nuevo.setUsuarioId(yo.getId());
            nuevo.setRol(GrupoMiembro.RolMiembro.miembro);
            nuevo.setFecha(LocalDateTime.now());
            miembroRepo.save(nuevo);
            return ResponseEntity.ok(Map.of("accion", "unido"));
        }
    }

    // ── PUBLICAR EN EL GRUPO ─────────────────────────────────────────────────
    @PostMapping("/{id}/publicar")
    public ResponseEntity<?> publicar(@PathVariable Long id,
                                      @RequestBody Map<String, String> body,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        GrupoSocial g = grupoRepo.findById(id).orElse(null);
        if (g == null) return ResponseEntity.notFound().build();

        if (!miembroRepo.existsByGrupoIdAndUsuarioId(id, yo.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Debes ser miembro del grupo para publicar");
        }

        String contenido = body.getOrDefault("contenido", "").trim();
        String imagenUrl = body.getOrDefault("imagenUrl", null);
        if (contenido.isEmpty() && (imagenUrl == null || imagenUrl.isEmpty())) {
            return ResponseEntity.badRequest().body("La publicación no puede estar vacía");
        }

        Publicacion pub = new Publicacion();
        pub.setUsuarioId(yo.getId());
        pub.setContenido(contenido);
        pub.setFecha(LocalDateTime.now());
        pub.setEsAnuncio(false);
        pub.setTipo(Publicacion.Tipo.texto);
        if (imagenUrl != null && !imagenUrl.isEmpty()) {
            pub.setImagenUrl(imagenUrl);
            pub.setTipo(Publicacion.Tipo.imagen);
        }
        Publicacion guardada = publicacionRepo.save(pub);

        GrupoPublicacion gp = new GrupoPublicacion();
        gp.setGrupoId(id);
        gp.setPublicacionId(guardada.getId());
        gpRepo.save(gp);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("id",          guardada.getId());
        resp.put("contenido",   guardada.getContenido());
        resp.put("imagenUrl",   guardada.getImagenUrl());
        resp.put("fecha",       guardada.getFecha());
        resp.put("usuarioId",   guardada.getUsuarioId());
        resp.put("autorNombre", yo.getUsername() != null ? yo.getUsername() : yo.getCorreo());
        resp.put("autorFoto",   yo.getFotoPerfil());
        return ResponseEntity.ok(resp);
    }

    // ── ELIMINAR GRUPO (solo admin) ──────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        GrupoSocial g = grupoRepo.findById(id).orElse(null);
        if (g == null) return ResponseEntity.notFound().build();

        Optional<GrupoMiembro> mem = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId());
        boolean esAdmin = mem.isPresent() && mem.get().getRol() == GrupoMiembro.RolMiembro.admin;
        if (!esAdmin && !g.getCreadorId().equals(yo.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Solo el admin puede eliminar el grupo");
        }

        grupoRepo.delete(g);
        return ResponseEntity.ok(Map.of("mensaje", "Grupo eliminado"));
    }

    // ── EXPULSAR MIEMBRO (solo admin) ────────────────────────────────────────
    @DeleteMapping("/{id}/miembro/{usuarioId}")
    public ResponseEntity<?> expulsar(@PathVariable Long id,
                                      @PathVariable Long usuarioId,
                                      HttpServletRequest request) {
        Usuario yo = getUsuario(request);
        Optional<GrupoMiembro> miMem = miembroRepo.findByGrupoIdAndUsuarioId(id, yo.getId());
        if (miMem.isEmpty() || miMem.get().getRol() != GrupoMiembro.RolMiembro.admin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Solo el admin puede expulsar miembros");
        }
        miembroRepo.findByGrupoIdAndUsuarioId(id, usuarioId).ifPresent(miembroRepo::delete);
        return ResponseEntity.ok(Map.of("mensaje", "Miembro eliminado"));
    }
}
