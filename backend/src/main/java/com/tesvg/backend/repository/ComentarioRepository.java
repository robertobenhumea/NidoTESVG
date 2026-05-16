package com.tesvg.backend.repository;

import com.tesvg.backend.model.Comentario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComentarioRepository extends JpaRepository<Comentario, Long> {
    List<Comentario> findByPublicacionIdOrderByFechaAsc(Long publicacionId);
}