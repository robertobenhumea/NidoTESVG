package com.tesvg.backend.dto;

public record SendGroupMessageRequest(
        String contenido,
        String messageType,
        String tipo,
        String fileUrl,
        String fileName,
        String fileType,
        Long fileSize,
        Integer durationSeconds,
        String waveformData,
        String archivoUrl,
        String nombreArchivo,
        Long replyToMessageId,
        Long originalMessageId,
        Boolean forwarded
) {}
