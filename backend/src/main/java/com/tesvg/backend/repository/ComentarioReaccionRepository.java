package com.tesvg.backend.repository;

import com.tesvg.backend.model.ComentarioReaccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ComentarioReaccionRepository extends JpaRepository<ComentarioReaccion, Long> {

    Optional<ComentarioReaccion> findByComentarioIdAndUsuarioId(Long comentarioId, Long usuarioId);

    long countByComentarioId(Long comentarioId);

    List<ComentarioReaccion> findByComentarioId(Long comentarioId);

    @Query("""
        SELECT cr.tipo AS tipo, COUNT(cr) AS total
        FROM ComentarioReaccion cr
        WHERE cr.comentarioId = :comentarioId
        GROUP BY cr.tipo
        ORDER BY COUNT(cr) DESC
        """)
    List<Object[]> findTopReaccionesByComentarioId(@Param("comentarioId") Long comentarioId);

    List<ComentarioReaccion> findByUsuarioIdAndComentarioIdIn(Long usuarioId, List<Long> comentarioIds);
}
