package com.tesvg.backend.repository;

import com.tesvg.backend.model.BuzonMiembro;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BuzonMiembroRepository extends JpaRepository<BuzonMiembro, Long> {
    List<BuzonMiembro> findByBuzonId(Long buzonId);
    Optional<BuzonMiembro> findByBuzonIdAndUsuarioId(Long buzonId, Long usuarioId);
    void deleteByBuzonIdAndUsuarioId(Long buzonId, Long usuarioId);
    List<BuzonMiembro> findByUsuarioId(Long usuarioId);
}
