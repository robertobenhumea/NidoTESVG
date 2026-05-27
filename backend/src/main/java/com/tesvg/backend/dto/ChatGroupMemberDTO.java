package com.tesvg.backend.dto;

import java.time.LocalDateTime;

public record ChatGroupMemberDTO(
        Long usuarioId,
        String rol,
        LocalDateTime fechaUnion,
        Boolean silenciado,
        String nombre,
        String foto,
        String carrera
) {}
