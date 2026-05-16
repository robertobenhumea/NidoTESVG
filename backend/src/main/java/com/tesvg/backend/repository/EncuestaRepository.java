package com.tesvg.backend.repository;

import com.tesvg.backend.model.Encuesta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EncuestaRepository extends JpaRepository<Encuesta, Long> {
    Optional<Encuesta> findByPublicacionId(Long publicacionId);
}
