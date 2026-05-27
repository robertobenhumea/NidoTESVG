package com.tesvg.backend.dto;

import java.time.LocalDateTime;

public record ChatGroupDTO(
        Long id,
        String nombre,
        String descripcion,
        String foto,
        String tipo,
        Long creadorId,
        String rol,
        Long noLeidos,
        LocalDateTime fechaCreacion,
        String ultimoMensaje,
        String ultimoTipo,
        LocalDateTime ultimaFecha,
        String ultimoEmisor
) {}
