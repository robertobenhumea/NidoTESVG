package com.tesvg.backend.dto;

import java.util.List;

public record CreateChatGroupRequest(
        String nombre,
        String descripcion,
        String foto,
        String tipo,
        List<Long> miembros
) {}
