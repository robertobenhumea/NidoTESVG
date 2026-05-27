package com.tesvg.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ChatGroupDetailDTO(
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
        String ultimoEmisor,
        String miRol,
        List<ChatGroupMemberDTO> miembros,
        List<ChatGroupMemberDTO> admins
) {}
