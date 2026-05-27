package com.tesvg.backend.dto;

public record ReplyPreviewDTO(
        Long id,
        Long senderId,
        String senderName,
        String contenido,
        String tipo,
        Boolean eliminado
) {}
