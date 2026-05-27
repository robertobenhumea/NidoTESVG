package com.tesvg.backend.dto;

public record PresenceEventDTO(
        Long usuarioId,
        String nombre,
        Boolean online,
        Long activeConnections
) {}
