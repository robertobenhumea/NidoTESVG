package com.tesvg.backend.repository;

import com.tesvg.backend.model.Reporte;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReporteRepository extends JpaRepository<Reporte, Long> {
    List<Reporte> findByAtendidoFalseOrderByFechaDesc();
    long countByAtendidoFalse();
    boolean existsByPublicacionIdAndReportanteId(Long publicacionId, Long reportanteId);
    List<Reporte> findByPublicacionId(Long publicacionId);
}
