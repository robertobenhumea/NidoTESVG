package com.tesvg.backend.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
public class WebSocketPresenceListener {

    @Autowired private PresenceService presenceService;

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        if (user != null) presenceService.connected(accessor.getSessionId(), user.getName());
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        presenceService.disconnected(event.getSessionId());
    }
}
