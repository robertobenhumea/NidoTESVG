package com.tesvg.backend.dto;

public record TypingEventDTO(
        Long grupoId,
        Long usuarioId,
        String nombre,
        Boolean typing
) {}
