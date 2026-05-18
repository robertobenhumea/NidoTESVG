package com.tesvg.backend.repository;

import com.tesvg.backend.model.SolicitudReclutamiento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SolicitudReclutamientoRepository extends JpaRepository<SolicitudReclutamiento, Long> {

    List<SolicitudReclutamiento> findByReclutamientoIdOrderByFechaDesc(Long reclutamientoId);

    List<SolicitudReclutamiento> findByUsuarioId(Long usuarioId);

    Optional<SolicitudReclutamiento> findByReclutamientoIdAndUsuarioId(Long reclutamientoId, Long usuarioId);

    boolean existsByReclutamientoIdAndUsuarioId(Long reclutamientoId, Long usuarioId);
}
