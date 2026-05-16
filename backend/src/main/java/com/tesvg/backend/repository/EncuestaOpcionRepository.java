package com.tesvg.backend.repository;

import com.tesvg.backend.model.EncuestaOpcion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EncuestaOpcionRepository extends JpaRepository<EncuestaOpcion, Long> {
    List<EncuestaOpcion> findByEncuestaId(Long encuestaId);
}
