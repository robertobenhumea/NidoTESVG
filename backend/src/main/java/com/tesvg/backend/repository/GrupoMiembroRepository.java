package com.tesvg.backend.repository;

import com.tesvg.backend.model.GrupoMiembro;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GrupoMiembroRepository extends JpaRepository<GrupoMiembro, Long> {
    List<GrupoMiembro> findByGrupoId(Long grupoId);
    List<GrupoMiembro> findByUsuarioId(Long usuarioId);
    Optional<GrupoMiembro> findByGrupoIdAndUsuarioId(Long grupoId, Long usuarioId);
    int countByGrupoId(Long grupoId);
    boolean existsByGrupoIdAndUsuarioId(Long grupoId, Long usuarioId);
}
