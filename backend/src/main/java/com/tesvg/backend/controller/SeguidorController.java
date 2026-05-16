package com.tesvg.backend.controller;

import com.tesvg.backend.model.Seguidor;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.SeguidorRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.NotificacionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/seguidores")
public class SeguidorController {

    @Autowired
    private SeguidorRepository seguidorRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private NotificacionService notificacionService;

    // Seguir o dejar de seguir (toggle)
    @PostMapping("/toggle/{seguidoId}")
    public ResponseEntity<?> toggleSeguir(@PathVariable Long seguidoId,
                                           HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (usuario.getId().equals(seguidoId)) {
            return ResponseEntity.badRequest().body("No puedes seguirte a ti mismo");
        }

        if (!usuarioRepository.existsById(seguidoId)) {
            return ResponseEntity.notFound().build();
        }

        Optional<Seguidor> existente = seguidorRepository
                .findBySeguidorIdAndSeguidoId(usuario.getId(), seguidoId);

        if (existente.isPresent()) {
            seguidorRepository.delete(existente.get());
            return ResponseEntity.ok(Map.of(
                "accion", "dejado de seguir",
                "seguidores", seguidorRepository.countBySeguidoId(seguidoId)
            ));
        } else {
            Seguidor seguidor = new Seguidor();
            seguidor.setSeguidorId(usuario.getId());
            seguidor.setSeguidoId(seguidoId);
            seguidor.setFecha(LocalDateTime.now());
            seguidorRepository.save(seguidor);
            notificacionService.crearYPush(
                    seguidoId, "seguidor",
                    usuario.getUsername() + " comenzó a seguirte",
                    usuario.getId());
            return ResponseEntity.ok(Map.of(
                "accion", "siguiendo",
                "seguidores", seguidorRepository.countBySeguidoId(seguidoId)
            ));
        }
    }

    // Ver seguidores de un usuario
    @GetMapping("/{usuarioId}/seguidores")
    public ResponseEntity<?> verSeguidores(@PathVariable Long usuarioId) {
        List<Seguidor> seguidores = seguidorRepository.findBySeguidoId(usuarioId);
        return ResponseEntity.ok(Map.of(
            "total", seguidores.size(),
            "seguidores", seguidores
        ));
    }

    // Ver a quiénes sigue un usuario
    @GetMapping("/{usuarioId}/siguiendo")
    public ResponseEntity<?> verSiguiendo(@PathVariable Long usuarioId) {
        List<Seguidor> siguiendo = seguidorRepository.findBySeguidorId(usuarioId);
        return ResponseEntity.ok(Map.of(
            "total", siguiendo.size(),
            "siguiendo", siguiendo
        ));
    }

    // Seguidores del usuario actual (token)
    @GetMapping("/mis-seguidores")
    public ResponseEntity<?> misSeguidores(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        List<Seguidor> seguidores = seguidorRepository.findBySeguidoId(usuario.getId());
        return ResponseEntity.ok(Map.of("total", seguidores.size(), "seguidores", seguidores));
    }

    // A quiénes sigue el usuario actual (token)
    @GetMapping("/mi-siguiendo")
    public ResponseEntity<?> miSiguiendo(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        List<Seguidor> siguiendo = seguidorRepository.findBySeguidorId(usuario.getId());
        return ResponseEntity.ok(Map.of("total", siguiendo.size(), "siguiendo", siguiendo));
    }

    // Ver si sigues a alguien
    @GetMapping("/estado/{seguidoId}")
    public ResponseEntity<?> estadoSeguimiento(@PathVariable Long seguidoId,
                                                HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        boolean siguiendo = seguidorRepository
                .findBySeguidorIdAndSeguidoId(usuario.getId(), seguidoId)
                .isPresent();

        return ResponseEntity.ok(Map.of(
            "siguiendo", siguiendo,
            "seguidores", seguidorRepository.countBySeguidoId(seguidoId)
        ));
    }
}