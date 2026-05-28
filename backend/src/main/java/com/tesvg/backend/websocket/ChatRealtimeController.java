package com.tesvg.backend.websocket;

import com.tesvg.backend.dto.DMRealtimeEventDTO;
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

import java.time.LocalDateTime;
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

    @MessageMapping("/dm/{conversationId}/typing")
    public void dmTyping(@DestinationVariable String conversationId,
                         @Payload Map<String, Object> body,
                         Principal principal) {
        if (principal == null) return;
        Usuario usuario = usuarioRepository.findByCorreo(principal.getName()).orElse(null);
        if (usuario == null || !belongsToConversation(usuario.getId(), conversationId)) return;

        Long recipientId = otherParticipant(usuario.getId(), conversationId);
        if (recipientId == null) return;
        boolean typing = Boolean.TRUE.equals(body.get("typing"));
        messagingTemplate.convertAndSend(
                "/topic/dm/" + conversationId + "/events",
                new DMRealtimeEventDTO(
                        "DM_TYPING",
                        conversationId,
                        null,
                        usuario.getId(),
                        recipientId,
                        LocalDateTime.now(),
                        Map.of(
                                "typing", typing,
                                "senderName", usuario.getUsername()
                        )
                )
        );
    }

    @MessageMapping("/dm/{conversationId}/status")
    public void dmConnectionStatus(@DestinationVariable String conversationId,
                                   @Payload Map<String, Object> body,
                                   Principal principal) {
        if (principal == null) return;
        Usuario usuario = usuarioRepository.findByCorreo(principal.getName()).orElse(null);
        if (usuario == null || !belongsToConversation(usuario.getId(), conversationId)) return;

        Long recipientId = otherParticipant(usuario.getId(), conversationId);
        if (recipientId == null) return;
        String status = body.get("status") != null ? String.valueOf(body.get("status")) : "connected";
        messagingTemplate.convertAndSend(
                "/topic/dm/" + conversationId + "/events",
                new DMRealtimeEventDTO(
                        "DM_CONNECTION_STATUS",
                        conversationId,
                        null,
                        usuario.getId(),
                        recipientId,
                        LocalDateTime.now(),
                        Map.of("status", status)
                )
        );
    }

    private boolean belongsToConversation(Long usuarioId, String conversationId) {
        Long[] participants = parseConversationId(conversationId);
        return participants != null && (usuarioId.equals(participants[0]) || usuarioId.equals(participants[1]));
    }

    private Long otherParticipant(Long usuarioId, String conversationId) {
        Long[] participants = parseConversationId(conversationId);
        if (participants == null) return null;
        if (usuarioId.equals(participants[0])) return participants[1];
        if (usuarioId.equals(participants[1])) return participants[0];
        return null;
    }

    private Long[] parseConversationId(String conversationId) {
        try {
            String[] parts = conversationId.split("-");
            if (parts.length != 2) return null;
            Long first = Long.valueOf(parts[0]);
            Long second = Long.valueOf(parts[1]);
            if (first.equals(second) || first > second) return null;
            return new Long[] { first, second };
        } catch (Exception ignored) {
            return null;
        }
    }
}
