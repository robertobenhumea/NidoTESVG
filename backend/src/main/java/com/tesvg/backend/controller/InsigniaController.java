package com.tesvg.backend.controller;

import com.tesvg.backend.model.Insignia;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.model.UsuarioInsignia;
import com.tesvg.backend.repository.InsigniaRepository;
import com.tesvg.backend.repository.UsuarioInsigniaRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.InsigniaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/insignias")
public class InsigniaController {

    @Autowired private InsigniaRepository insigniaRepo;
    @Autowired private UsuarioInsigniaRepository usuarioInsigniaRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private InsigniaService insigniaService;

    private Usuario getUsuario(HttpServletRequest req) {
        String correo = (String) req.getAttribute("correo");
        return usuarioRepo.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    private boolean esAdmin(Usuario u) {
        return u.getRol() == Usuario.Rol.AUTORIDAD || u.getRol() == Usuario.Rol.ADMIN;
    }

    private Map<String, Object> insigniaToMap(Insignia ins, Set<Long> ganadosIds,
                                               Map<Long, LocalDateTime> fechasGanadas) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",          ins.getId());
        m.put("nombre",      ins.getNombre());
        m.put("descripcion", ins.getDescripcion());
        m.put("icono",       ins.getIcono());
        m.put("tipo",        ins.getTipo());
        m.put("umbral",      ins.getUmbral());
        boolean ganada = ganadosIds.contains(ins.getId());
        m.put("ganada",      ganada);
        m.put("fechaGanada", ganada ? fechasGanadas.get(ins.getId()) : null);
        m.put("totalUsuarios", usuarioInsigniaRepo.countByInsigniaId(ins.getId()));
        return m;
    }

    // ── CATÁLOGO con estado del usuario actual ─────────────────────────────
    @GetMapping("/catalogo")
    public ResponseEntity<?> catalogo(HttpServletRequest req) {
        insigniaService.seedIfEmpty();
        Usuario yo = getUsuario(req);

        List<UsuarioInsignia> misInsignias = usuarioInsigniaRepo.findByUsuarioId(yo.getId());
        Set<Long> ganadosIds = misInsignias.stream().map(UsuarioInsignia::getInsigniaId).collect(Collectors.toSet());
        Map<Long, LocalDateTime> fechas = misInsignias.stream()
                .collect(Collectors.toMap(UsuarioInsignia::getInsigniaId, UsuarioInsignia::getFecha));

        List<Map<String, Object>> lista = insigniaRepo.findAllByOrderByTipoAscUmbralAsc().stream()
                .map(ins -> insigniaToMap(ins, ganadosIds, fechas))
                .collect(Collectors.toList());

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("insignias",    lista);
        resp.put("estadisticas", insigniaService.getEstadisticas(yo.getId()));
        return ResponseEntity.ok(resp);
    }

    // ── INSIGNIAS de un usuario específico (para perfiles) ─────────────────
    @GetMapping("/usuario/{id}")
    public List<Map<String, Object>> porUsuario(@PathVariable Long id) {
        insigniaService.seedIfEmpty();
        List<UsuarioInsignia> ganadas = usuarioInsigniaRepo.findByUsuarioId(id);
        Set<Long> ids = ganadas.stream().map(UsuarioInsignia::getInsigniaId).collect(Collectors.toSet());
        Map<Long, LocalDateTime> fechas = ganadas.stream()
                .collect(Collectors.toMap(UsuarioInsignia::getInsigniaId, UsuarioInsignia::getFecha));

        return insigniaRepo.findAllByOrderByTipoAscUmbralAsc().stream()
                .filter(ins -> ids.contains(ins.getId()))
                .map(ins -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",          ins.getId());
                    m.put("nombre",      ins.getNombre());
                    m.put("descripcion", ins.getDescripcion());
                    m.put("icono",       ins.getIcono());
                    m.put("tipo",        ins.getTipo());
                    m.put("fechaGanada", fechas.get(ins.getId()));
                    return m;
                }).collect(Collectors.toList());
    }

    // ── EVALUAR y otorgar insignias al usuario actual ───────────────────────
    @PostMapping("/evaluar")
    public ResponseEntity<?> evaluar(HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        List<Insignia> nuevas = insigniaService.evaluar(yo.getId());
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("nuevas", nuevas.size());
        resp.put("insignias", nuevas.stream().map(ins -> Map.of(
                "nombre", ins.getNombre(),
                "icono",  ins.getIcono(),
                "tipo",   ins.getTipo().name()
        )).collect(Collectors.toList()));
        return ResponseEntity.ok(resp);
    }

    // ── ADMIN: crear insignia ───────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body,
                                   HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        if (!esAdmin(yo))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Solo admins pueden crear insignias");

        String nombre = (String) body.get("nombre");
        String tipoStr = (String) body.get("tipo");
        if (nombre == null || nombre.isBlank())
            return ResponseEntity.badRequest().body("nombre requerido");

        Insignia ins = new Insignia();
        ins.setNombre(nombre.trim());
        ins.setDescripcion((String) body.get("descripcion"));
        ins.setIcono((String) body.get("icono"));
        try {
            ins.setTipo(Insignia.Tipo.valueOf(tipoStr));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("tipo inválido");
        }
        Object umbralObj = body.get("umbral");
        if (umbralObj instanceof Number) ins.setUmbral(((Number) umbralObj).intValue());

        return ResponseEntity.ok(insigniaRepo.save(ins));
    }

    // ── ADMIN: eliminar insignia ────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest req) {
        Usuario yo = getUsuario(req);
        if (!esAdmin(yo))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Sin permiso");
        Insignia ins = insigniaRepo.findById(id).orElse(null);
        if (ins == null) return ResponseEntity.notFound().build();
        insigniaRepo.delete(ins);
        return ResponseEntity.ok().build();
    }
}
