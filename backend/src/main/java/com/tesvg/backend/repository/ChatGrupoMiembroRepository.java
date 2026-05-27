package com.tesvg.backend.repository;

import com.tesvg.backend.model.ChatGrupoMiembro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ChatGrupoMiembroRepository extends JpaRepository<ChatGrupoMiembro, Long> {

    List<ChatGrupoMiembro> findByGrupoIdAndActivoTrue(Long grupoId);

    Optional<ChatGrupoMiembro> findByGrupoIdAndUsuarioId(Long grupoId, Long usuarioId);

    boolean existsByGrupoIdAndUsuarioIdAndActivoTrue(Long grupoId, Long usuarioId);

    @Modifying
    @Transactional
    @Query("UPDATE ChatGrupoMiembro m SET m.ultimaLectura = :ts WHERE m.grupoId = :grupoId AND m.usuarioId = :usuarioId")
    void actualizarUltimaLectura(@Param("grupoId") Long grupoId, @Param("usuarioId") Long usuarioId, @Param("ts") LocalDateTime ts);
}
