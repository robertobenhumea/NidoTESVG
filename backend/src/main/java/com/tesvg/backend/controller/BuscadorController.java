package com.tesvg.backend.controller;

import com.tesvg.backend.model.GrupoSocial;
import com.tesvg.backend.model.Publicacion;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.GrupoSocialRepository;
import com.tesvg.backend.repository.GrupoMiembroRepository;
import com.tesvg.backend.repository.PublicacionRepository;
import com.tesvg.backend.repository.SeguidorRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/buscar")
public class BuscadorController {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PublicacionRepository publicacionRepository;
    @Autowired private SeguidorRepository seguidorRepository;
    @Autowired private GrupoSocialRepository grupoRepository;
    @Autowired private GrupoMiembroRepository miembroRepository;

    @GetMapping
    public ResponseEntity<?> buscar(@RequestParam String q, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario yo = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        String term = q.trim().toLowerCase();
        if (term.isBlank()) {
            return ResponseEntity.ok(Map.of("usuarios", List.of(), "grupos", List.of(), "publicaciones", List.of()));
        }

        // ── Usuarios ──
        Set<Long> siguiendoIds = seguidorRepository.findBySeguidorId(yo.getId())
                .stream().map(s -> s.getSeguidoId()).collect(Collectors.toSet());

        List<Map<String, Object>> usuarios = usuarioRepository.findAll().stream()
                .filter(u -> !u.getId().equals(yo.getId()))
                .filter(u -> matches(u.getUsername(), term)
                          || matches(u.getCarrera(), term)
                          || matches(u.getGrupo(), term))
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("username", u.getUsername());
                    m.put("carrera", u.getCarrera());
                    m.put("grupo", u.getGrupo());
                    m.put("fotoPerfil", u.getFotoPerfil());
                    m.put("siguiendo", siguiendoIds.contains(u.getId()));
                    return m;
                })
                .collect(Collectors.toList());

        // ── Publicaciones ──
        List<Map<String, Object>> publicaciones = publicacionRepository.findAllByOrderByFechaDesc().stream()
                .filter(p -> p.getContenido() != null &&
                             p.getContenido().toLowerCase().contains(term))
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("contenido", p.getContenido());
                    m.put("fecha", p.getFecha());
                    m.put("usuarioId", p.getUsuarioId());
                    m.put("imagenUrl", p.getImagenUrl());
                    usuarioRepository.findById(p.getUsuarioId())
                            .ifPresent(u -> {
                                m.put("autorNombre", u.getUsername());
                                m.put("autorFoto", u.getFotoPerfil());
                            });
                    return m;
                })
                .collect(Collectors.toList());

        // ── Grupos ──
        List<Map<String, Object>> grupos = grupoRepository.findAll().stream()
                .filter(g -> matches(g.getNombre(), term) || matches(g.getDescripcion(), term))
                .map(g -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id",          g.getId());
                    m.put("nombre",      g.getNombre());
                    m.put("descripcion", g.getDescripcion());
                    m.put("tipo",        g.getTipo() != null ? g.getTipo().name() : null);
                    m.put("miembros",    miembroRepository.findByGrupoId(g.getId()).size());
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("usuarios", usuarios, "grupos", grupos, "publicaciones", publicaciones));
    }

    private boolean matches(String field, String term) {
        return field != null && field.toLowerCase().contains(term);
    }
}
