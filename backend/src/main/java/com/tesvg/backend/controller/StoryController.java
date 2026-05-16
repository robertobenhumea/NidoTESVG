package com.tesvg.backend.controller;

import com.tesvg.backend.model.Story;
import com.tesvg.backend.model.StoryViewer;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.StoryRepository;
import com.tesvg.backend.repository.StoryViewerRepository;
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

@RestController
@RequestMapping("/stories")
public class StoryController {

    @Autowired private StoryRepository storyRepository;
    @Autowired private StoryViewerRepository storyViewerRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    // Publicar una story (expira en 24 h)
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Story body, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if ((body.getTexto() == null || body.getTexto().isBlank())
                && (body.getImagenUrl() == null || body.getImagenUrl().isBlank())) {
            return ResponseEntity.badRequest().body("La story debe tener texto o imagen");
        }

        Story story = new Story();
        story.setUsuarioId(usuario.getId());
        story.setTexto(body.getTexto());
        story.setImagenUrl(body.getImagenUrl());
        story.setColorFondo(body.getColorFondo() != null ? body.getColorFondo() : "#1A1A2E");
        story.setFecha(LocalDateTime.now());
        story.setExpiraEn(LocalDateTime.now().plusHours(24));
        story.setVistas(0);

        return ResponseEntity.ok(storyRepository.save(story));
    }

    // Todas las stories activas (no expiradas), ordenadas más recientes primero
    @GetMapping("/activas")
    public List<Story> activas() {
        return storyRepository.findByExpiraEnAfterOrderByFechaDesc(LocalDateTime.now());
    }

    // Stories del usuario autenticado (incluyendo las ya expiradas)
    @GetMapping("/mis-stories")
    public List<Story> misStories(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return storyRepository.findByUsuarioIdOrderByFechaDesc(usuario.getId());
    }

    // Registrar una vista — deduplica por usuario, almacena quién vio
    @PostMapping("/{id}/vista")
    public ResponseEntity<?> registrarVista(@PathVariable Long id, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario visor = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Story story = storyRepository.findById(id).orElse(null);
        if (story == null) return ResponseEntity.notFound().build();

        // Don't count own views, but still return current count
        if (!story.getUsuarioId().equals(visor.getId())) {
            boolean alreadySeen = storyViewerRepository
                    .findByStoryIdAndUsuarioId(id, visor.getId()).isPresent();
            if (!alreadySeen) {
                StoryViewer sv = new StoryViewer();
                sv.setStoryId(id);
                sv.setUsuarioId(visor.getId());
                sv.setVistoEn(LocalDateTime.now());
                storyViewerRepository.save(sv);

                story.setVistas(story.getVistas() + 1);
                storyRepository.save(story);
            }
        }

        return ResponseEntity.ok(Map.of("vistas", story.getVistas()));
    }

    // Lista de viewers (solo visible para el dueño de la story)
    @GetMapping("/{id}/viewers")
    public ResponseEntity<?> listarViewers(@PathVariable Long id, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario solicitante = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Story story = storyRepository.findById(id).orElse(null);
        if (story == null) return ResponseEntity.notFound().build();
        if (!story.getUsuarioId().equals(solicitante.getId()))
            return ResponseEntity.status(403).body("Solo el dueño puede ver los viewers");

        List<StoryViewer> viewers = storyViewerRepository.findByStoryIdOrderByVistoEnDesc(id);
        List<Map<String, Object>> result = new ArrayList<>();
        for (StoryViewer sv : viewers) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("userId", sv.getUsuarioId());
            entry.put("vistoEn", sv.getVistoEn());
            usuarioRepository.findById(sv.getUsuarioId()).ifPresent(u -> {
                entry.put("username", u.getUsername());
                entry.put("fotoPerfil", u.getFotoPerfil());
            });
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }

    // Eliminar story propia
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Story story = storyRepository.findById(id).orElse(null);
        if (story == null) return ResponseEntity.notFound().build();
        if (!story.getUsuarioId().equals(usuario.getId()))
            return ResponseEntity.status(403).body("No puedes eliminar esta story");

        // Remove viewers first
        storyViewerRepository.findByStoryIdOrderByVistoEnDesc(id)
                .forEach(sv -> storyViewerRepository.delete(sv));

        storyRepository.delete(story);
        return ResponseEntity.ok(Map.of("mensaje", "Story eliminada"));
    }
}
