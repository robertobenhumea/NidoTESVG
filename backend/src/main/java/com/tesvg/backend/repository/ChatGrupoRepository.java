package com.tesvg.backend.repository;

import com.tesvg.backend.model.ChatGrupo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatGrupoRepository extends JpaRepository<ChatGrupo, Long> {

    @Query("SELECT g FROM ChatGrupo g JOIN ChatGrupoMiembro m ON g.id = m.grupoId WHERE m.usuarioId = :uid AND m.activo = true AND g.activo = true ORDER BY g.fechaCreacion DESC")
    List<ChatGrupo> findByMiembro(@Param("uid") Long uid);
}
