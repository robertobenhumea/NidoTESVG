package com.tesvg.backend.controller;

import com.tesvg.backend.model.Aviso;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.AvisoRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/avisos")
public class AvisoController {

    @Autowired private AvisoRepository avisoRepo;
    @Autowired private UsuarioRepository usuarioRepo;

    private Usuario getUsuario(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private boolean puedeCrearAvisos(Usuario u) {
        return u.getRol() == Usuario.Rol.AUTORIDAD
            || u.getRol() == Usuario.Rol.ADMIN
            || u.getRol() == Usuario.Rol.DOCENTE;
    }

    private boolean puedeEliminarAviso(Usuario u, Aviso a) {
        if (u.getRol() == Usuario.Rol.AUTORIDAD || u.getRol() == Usuario.Rol.ADMIN) return true;
        return u.getRol() == Usuario.Rol.DOCENTE && a.getCreadorId().equals(u.getId());
    }

    private Map<String, Object> toMap(Aviso a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",        a.getId());
        m.put("titulo",    a.getTitulo());
        m.put("contenido", a.getContenido());
        m.put("carrera",   a.getCarrera());
        m.put("creadorId", a.getCreadorId());
        m.put("fecha",     a.getFecha());
        m.put("expiraEn",  a.getExpiraEn());
        m.put("expirado",  a.getExpiraEn() != null && a.getExpiraEn().isBefore(LocalDateTime.now()));
        usuarioRepo.findById(a.getCreadorId()).ifPresent(u ->
            m.put("creadorNombre", u.getUsername() != null ? u.getUsername() : u.getCorreo())
        );
        return m;
    }

    // ── LISTAR ──────────────────────────────────────────────────────────────
    @GetMapping
    public List<Map<String, Object>> listar(@RequestParam(required = false) String carrera) {
        List<Aviso> lista = (carrera != null && !carrera.isBlank())
                ? avisoRepo.findByCarreraOrGlobal(carrera)
                : avisoRepo.findAllByOrderByFechaDesc();
        return lista.stream().map(this::toMap).collect(Collectors.toList());
    }

    // ── CREAR ────────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body,
                                   HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        if (!puedeCrearAvisos(yo))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sin permiso para publicar avisos");

        String titulo    = (String) body.get("titulo");
        String contenido = (String) body.get("contenido");
        if (titulo == null || titulo.isBlank())
            return ResponseEntity.badRequest().body("El título es requerido");
        if (contenido == null || contenido.isBlank())
            return ResponseEntity.badRequest().body("El contenido es requerido");

        Aviso a = new Aviso();
        a.setTitulo(titulo.trim());
        a.setContenido(contenido.trim());
        a.setCreadorId(yo.getId());
        a.setFecha(LocalDateTime.now());

        String carrera = (String) body.get("carrera");
        a.setCarrera((carrera == null || carrera.isBlank()) ? null : carrera.trim());

        String expiraStr = (String) body.get("expiraEn");
        if (expiraStr != null && !expiraStr.isBlank()) {
            try {
                a.setExpiraEn(LocalDateTime.parse(expiraStr + "T23:59:59"));
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body("Formato de fecha inválido en expiraEn");
            }
        }

        return ResponseEntity.ok(toMap(avisoRepo.save(a)));
    }

    // ── ELIMINAR ─────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        Aviso a = avisoRepo.findById(id).orElse(null);
        if (a == null) return ResponseEntity.notFound().build();
        if (!puedeEliminarAviso(yo, a))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sin permiso para eliminar este aviso");
        avisoRepo.delete(a);
        return ResponseEntity.ok().build();
    }
}
