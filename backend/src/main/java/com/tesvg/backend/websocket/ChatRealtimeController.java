package com.tesvg.backend.websocket;

import com.tesvg.backend.dto.TypingEventDTO;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.ChatGrupoMiembroRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
public class ChatRealtimeController {

    @Autowired private ChatGrupoMiembroRepository miembroRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/grupos/{grupoId}/typing")
    public void typing(@DestinationVariable Long grupoId,
                       @Payload Map<String, Object> body,
                       Principal principal) {
        if (principal == null) return;
        Usuario usuario = usuarioRepository.findByCorreo(principal.getName()).orElse(null);
        if (usuario == null) return;
        if (!miembroRepository.existsByGrupoIdAndUsuarioIdAndActivoTrue(grupoId, usuario.getId())) return;

        boolean typing = Boolean.TRUE.equals(body.get("typing"));
        messagingTemplate.convertAndSend(
                "/topic/grupos/" + grupoId + "/typing",
                new TypingEventDTO(grupoId, usuario.getId(), usuario.getUsername(), typing)
        );
    }
}
