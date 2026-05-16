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
    @Autowired private WebPushService pushService;

    public void crearYPush(Long destinatarioId, String tipo, String mensaje, Long referenciaId) {
        Notificacion n = new Notificacion();
        n.setUsuarioId(destinatarioId);
        n.setTipo(tipo);
        n.setMensaje(mensaje);
        n.setFecha(LocalDateTime.now());
        n.setReferenciaId(referenciaId);
        n.setLeida(false);
        notificacionRepository.save(n);

        usuarioRepository.findById(destinatarioId).ifPresent(u -> {
            // WebSocket (app abierta)
            try {
                messagingTemplate.convertAndSendToUser(
                        u.getCorreo(), "/queue/notificaciones", n);
            } catch (Exception ignored) {}

            // Web Push (app cerrada)
            String url = resolveUrl(tipo, referenciaId);
            pushService.sendToUser(destinatarioId, "NidoTESVG", mensaje, url);
        });
    }

    private String resolveUrl(String tipo, Long referenciaId) {
        return switch (tipo) {
            case "like", "comentario", "compartir" -> "/home.html";
            case "seguidor"                        -> "/perfil.html";
            case "COMPRA"                          -> "/marketplace.html";
            case "comunicado", "aviso"             -> "/avisos.html";
            case "mensaje_doc"                     -> "/correo.html";
            case "evento"                          -> "/calendario.html";
            default                                -> "/home.html";
        };
    }
}
