package com.tesvg.backend.dto;

public record ChatRealtimeEventDTO(
        String type,
        Long grupoId,
        Long messageId,
        ChatGroupMessageDTO message,
        Long actorId
) {}
