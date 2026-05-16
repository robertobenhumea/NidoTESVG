package com.tesvg.backend.repository;

import com.tesvg.backend.model.GrupoPublicacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface GrupoPublicacionRepository extends JpaRepository<GrupoPublicacion, Long> {
    List<GrupoPublicacion> findByGrupoIdOrderByIdDesc(Long grupoId);
    @Transactional
    void deleteByPublicacionId(Long publicacionId);
}
