package com.tesvg.backend.websocket;

import com.tesvg.backend.dto.PresenceEventDTO;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.UsuarioRepository;
import com.tesvg.backend.service.RedisCacheService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PresenceService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;
    @Autowired private RedisCacheService redisCacheService;

    private final Map<String, String> sessionToCorreo = new ConcurrentHashMap<>();
    private final Map<Long, Set<String>> userSessions = new ConcurrentHashMap<>();

    public void connected(String sessionId, String correo) {
        if (sessionId == null || correo == null) return;
        Optional<Usuario> userOpt = usuarioRepository.findByCorreo(correo);
        if (userOpt.isEmpty()) return;
        Usuario user = userOpt.get();
        sessionToCorreo.put(sessionId, correo);
        Set<String> sessions = userSessions.computeIfAbsent(user.getId(), ignored -> ConcurrentHashMap.newKeySet());
        boolean wasOffline = sessions.isEmpty();
        sessions.add(sessionId);
        redisCacheService.setValue("presence:session:" + sessionId, user.getId().toString(), Duration.ofHours(2));
        redisCacheService.setAdd("presence:user:" + user.getId() + ":sessions", sessionId, Duration.ofHours(2));
        if (wasOffline) publish(user, true, sessions.size());
    }

    public void disconnected(String sessionId) {
        String correo = sessionToCorreo.remove(sessionId);
        if (correo == null) return;
        Optional<Usuario> userOpt = usuarioRepository.findByCorreo(correo);
        if (userOpt.isEmpty()) return;
        Usuario user = userOpt.get();
        Set<String> sessions = userSessions.get(user.getId());
        if (sessions == null) return;
        sessions.remove(sessionId);
        redisCacheService.setRemove("presence:user:" + user.getId() + ":sessions", sessionId);
        redisCacheService.delete("presence:session:" + sessionId);
        if (sessions.isEmpty()) {
            userSessions.remove(user.getId());
            publish(user, false, 0);
        }
    }

    public long activeConnections() {
        AtomicLong total = new AtomicLong();
        userSessions.values().forEach(sessions -> total.addAndGet(sessions.size()));
        return total.get();
    }

    private void publish(Usuario user, boolean online, long connections) {
        messagingTemplate.convertAndSend(
                "/topic/presence",
                new PresenceEventDTO(user.getId(), user.getUsername(), online, connections)
        );
    }
}
