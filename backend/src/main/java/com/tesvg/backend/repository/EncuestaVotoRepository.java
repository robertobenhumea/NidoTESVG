package com.tesvg.backend.repository;

import com.tesvg.backend.model.EncuestaVoto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EncuestaVotoRepository extends JpaRepository<EncuestaVoto, Long> {
    Optional<EncuestaVoto> findByEncuestaIdAndUsuarioId(Long encuestaId, Long usuarioId);
    List<EncuestaVoto> findByUsuarioId(Long usuarioId);
    int countByOpcionId(Long opcionId);
}
