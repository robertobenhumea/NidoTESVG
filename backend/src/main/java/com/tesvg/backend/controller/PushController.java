package com.tesvg.backend.controller;

import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.WebPushService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/push")
public class PushController {

    private final WebPushService pushService;
    private final UsuarioRepository usuarioRepository;

    @Value("${app.vapid.public-key}")
    private String vapidPublicKey;

    public PushController(WebPushService pushService, UsuarioRepository usuarioRepository) {
        this.pushService = pushService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", vapidPublicKey));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        Long usuarioId = resolveUsuarioId(request);
        if (usuarioId == null) return ResponseEntity.status(401).build();

        String endpoint = (String) body.get("endpoint");
        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) body.get("keys");
        if (endpoint == null || keys == null) return ResponseEntity.badRequest().build();

        pushService.subscribe(usuarioId, endpoint, keys.get("p256dh"), keys.get("auth"));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/subscribe")
    public ResponseEntity<Void> unsubscribe(@RequestBody Map<String, String> body,
                                             HttpServletRequest request) {
        Long usuarioId = resolveUsuarioId(request);
        if (usuarioId == null) return ResponseEntity.status(401).build();

        String endpoint = body.get("endpoint");
        if (endpoint == null) return ResponseEntity.badRequest().build();

        pushService.unsubscribe(usuarioId, endpoint);
        return ResponseEntity.ok().build();
    }

    private Long resolveUsuarioId(HttpServletRequest request) {
        String correo = (String) request.getAttribute("correo");
        if (correo == null) return null;
        return usuarioRepository.findByCorreo(correo).map(Usuario::getId).orElse(null);
    }
}
