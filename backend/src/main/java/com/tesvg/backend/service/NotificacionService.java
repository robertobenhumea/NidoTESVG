package com.tesvg.backend.service;

import com.tesvg.backend.model.Notificacion;
import com.tesvg.backend.repository.NotificacionRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class NotificacionService {

    @Autowired private NotificacionRepository notificacionRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    public void crearYPush(Long destinatarioId, String tipo, String mensaje, Long referenciaId) {
        Notificacion n = new Notificacion();
        n.setUsuarioId(destinatarioId);
        n.setTipo(tipo);
        n.setMensaje(mensaje);
        n.setFecha(LocalDateTime.now());
        n.setReferenciaId(referenciaId);
        n.setLeida(false);
        notificacionRepository.save(n);

        // Push WebSocket al destinatario usando su correo como principal
        usuarioRepository.findById(destinatarioId).ifPresent(u -> {
            try {
                messagingTemplate.convertAndSendToUser(
                        u.getCorreo(), "/queue/notificaciones", n);
            } catch (Exception ignored) {
                // Si el usuario no está conectado por WS, el polling actúa de fallback
            }
        });
    }
}
