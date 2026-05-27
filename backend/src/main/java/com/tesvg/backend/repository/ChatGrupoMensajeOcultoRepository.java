package com.tesvg.backend.repository;

import com.tesvg.backend.model.ChatGrupoMensajeOculto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatGrupoMensajeOcultoRepository extends JpaRepository<ChatGrupoMensajeOculto, Long> {
    boolean existsByMensajeIdAndUsuarioId(Long mensajeId, Long usuarioId);
    List<ChatGrupoMensajeOculto> findByUsuarioIdAndMensajeIdIn(Long usuarioId, List<Long> mensajeIds);
}
