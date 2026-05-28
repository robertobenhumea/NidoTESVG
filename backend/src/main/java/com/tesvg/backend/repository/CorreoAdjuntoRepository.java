package com.tesvg.backend.repository;

import com.tesvg.backend.model.CorreoAdjunto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CorreoAdjuntoRepository extends JpaRepository<CorreoAdjunto, Long> {

    List<CorreoAdjunto> findByCorreoId(Long correoId);
    Optional<CorreoAdjunto> findByArchivoUrl(String archivoUrl);
    void deleteByCorreoId(Long correoId);

    long countByCorreoId(Long correoId);

    @Query("SELECT COALESCE(SUM(a.tamanio), 0) FROM CorreoAdjunto a WHERE a.correoId = :correoId")
    long sumTamanioByCorreoId(@Param("correoId") Long correoId);
}
