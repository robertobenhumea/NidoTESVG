package com.tesvg.backend.repository;

import com.tesvg.backend.model.Reclutamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReclutamientoRepository extends JpaRepository<Reclutamiento, Long> {

    List<Reclutamiento> findByEstadoOrderByFechaDesc(Reclutamiento.EstadoReclutamiento estado);

    List<Reclutamiento> findByUsuarioIdOrderByFechaDesc(Long usuarioId);
}
