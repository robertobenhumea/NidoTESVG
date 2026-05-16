package com.tesvg.backend.controller;

import com.tesvg.backend.model.Story;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.StoryRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stories")
public class StoryController {

    @Autowired
    private StoryRepository storyRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

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

    // Registrar una vista (no cuenta si es el propio autor)
    @PostMapping("/{id}/vista")
    public ResponseEntity<?> registrarVista(@PathVariable Long id, HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario visor = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Story story = storyRepository.findById(id).orElse(null);
        if (story == null) return ResponseEntity.notFound().build();

        if (!story.getUsuarioId().equals(visor.getId())) {
            story.setVistas(story.getVistas() + 1);
            storyRepository.save(story);
        }

        return ResponseEntity.ok(Map.of("vistas", story.getVistas()));
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

        storyRepository.delete(story);
        return ResponseEntity.ok(Map.of("mensaje", "Story eliminada"));
    }
}
