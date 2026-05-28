package com.tesvg.backend.dto;

import java.time.LocalDateTime;

public record DMRealtimeEventDTO(
        String eventType,
        String conversationId,
        Long messageId,
        Long senderId,
        Long recipientId,
        LocalDateTime createdAt,
        Object payload
) {}
