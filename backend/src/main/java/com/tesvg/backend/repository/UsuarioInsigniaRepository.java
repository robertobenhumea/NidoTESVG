package com.tesvg.backend.repository;

import com.tesvg.backend.model.UsuarioInsignia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface UsuarioInsigniaRepository extends JpaRepository<UsuarioInsignia, Long> {
    List<UsuarioInsignia> findByUsuarioId(Long usuarioId);
    boolean existsByUsuarioIdAndInsigniaId(Long usuarioId, Long insigniaId);

    @Query("SELECT COUNT(ui) FROM UsuarioInsignia ui WHERE ui.insigniaId = :insigniaId")
    long countByInsigniaId(@Param("insigniaId") Long insigniaId);
}
