package com.tesvg.backend.repository;

import com.tesvg.backend.model.GrupoSocial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GrupoSocialRepository extends JpaRepository<GrupoSocial, Long> {
    List<GrupoSocial> findAllByOrderByFechaDesc();
    List<GrupoSocial> findByTipo(GrupoSocial.TipoGrupo tipo);
}
