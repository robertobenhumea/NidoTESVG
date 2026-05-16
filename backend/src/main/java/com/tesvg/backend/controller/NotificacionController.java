package com.tesvg.backend.controller;

import com.tesvg.backend.model.Notificacion;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.NotificacionRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notificaciones")
public class NotificacionController {

    @Autowired
    private NotificacionRepository notificacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping
    public List<Notificacion> listar(HttpServletRequest request) {
        Usuario usuario = getUsuario(request);
        return notificacionRepository.findByUsuarioIdOrderByFechaDesc(usuario.getId());
    }

    @GetMapping("/no-leidas")
    public ResponseEntity<?> contarNoLeidas(HttpServletRequest request) {
        Usuario usuario = getUsuario(request);
        long count = notificacionRepository.countByUsuarioIdAndLeidaFalse(usuario.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/leer-todas")
    public ResponseEntity<?> leerTodas(HttpServletRequest request) {
        Usuario usuario = getUsuario(request);
        notificacionRepository.marcarTodasLeidas(usuario.getId());
        return ResponseEntity.ok(Map.of("mensaje", "Notificaciones marcadas como leídas"));
    }

    @PutMapping("/{id}/leer")
    public ResponseEntity<?> leerUna(@PathVariable Long id, HttpServletRequest request) {
        Usuario usuario = getUsuario(request);
        notificacionRepository.marcarUnaLeida(id, usuario.getId());
        return ResponseEntity.ok(Map.of("mensaje", "Notificación marcada como leída"));
    }

    private Usuario getUsuario(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        return usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }
}
