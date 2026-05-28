package com.tesvg.backend.websocket;

import com.tesvg.backend.security.JwtUtil;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.ChatGrupoMiembroRepository;
import com.tesvg.backend.repository.ChatBlockRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ChatGrupoMiembroRepository miembroRepository;

    @Autowired
    private ChatBlockRepository blockRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    String token = authHeader.substring(7);
                    String correo = jwtUtil.obtenerCorreo(token);
                    if (correo != null) {
                        accessor.setUser(new UsernamePasswordAuthenticationToken(
                                correo, null, List.of()));
                    }
                } catch (Exception ignored) {
                    // Token inválido — sin principal, la suscripción fallará silenciosamente
                }
            }
        }
        if (accessor != null && StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/grupos/")) {
                Long grupoId = extractGroupId(destination);
                String correo = accessor.getUser() != null ? accessor.getUser().getName() : null;
                if (grupoId == null || correo == null) return null;
                Usuario usuario = usuarioRepository.findByCorreo(correo).orElse(null);
                if (usuario == null || !miembroRepository.existsByGrupoIdAndUsuarioIdAndActivoTrue(grupoId, usuario.getId())) {
                    return null;
                }
            }
            if (destination != null && destination.startsWith("/topic/dm/")) {
                Long[] participants = extractConversationParticipants(destination);
                String correo = accessor.getUser() != null ? accessor.getUser().getName() : null;
                if (participants == null || correo == null) return null;
                Usuario usuario = usuarioRepository.findByCorreo(correo).orElse(null);
                if (usuario == null || (!usuario.getId().equals(participants[0]) && !usuario.getId().equals(participants[1]))) {
                    return null;
                }
                if (blockRepository.existsByBlockerIdAndBlockedId(participants[0], participants[1])
                        || blockRepository.existsByBlockerIdAndBlockedId(participants[1], participants[0])) {
                    return null;
                }
            }
        }
        return message;
    }

    private Long extractGroupId(String destination) {
        try {
            String rest = destination.substring("/topic/grupos/".length());
            String id = rest.contains("/") ? rest.substring(0, rest.indexOf('/')) : rest;
            return Long.valueOf(id);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Long[] extractConversationParticipants(String destination) {
        try {
            String rest = destination.substring("/topic/dm/".length());
            String conversationId = rest.contains("/") ? rest.substring(0, rest.indexOf('/')) : rest;
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
