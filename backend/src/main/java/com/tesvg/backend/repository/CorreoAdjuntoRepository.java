package com.tesvg.backend.repository;

import com.tesvg.backend.model.CorreoAdjunto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CorreoAdjuntoRepository extends JpaRepository<CorreoAdjunto, Long> {
    List<CorreoAdjunto> findByCorreoId(Long correoId);
    Optional<CorreoAdjunto> findByArchivoUrl(String archivoUrl);
    void deleteByCorreoId(Long correoId);
}
