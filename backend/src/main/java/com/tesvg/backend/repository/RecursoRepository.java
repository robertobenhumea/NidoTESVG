package com.tesvg.backend.repository;

import com.tesvg.backend.model.Recurso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface RecursoRepository extends JpaRepository<Recurso, Long> {

    List<Recurso> findAllByOrderByFechaDesc();

    @Query("""
        SELECT r FROM Recurso r WHERE
          (:carrera IS NULL OR r.carrera = :carrera) AND
          (:materia  IS NULL OR LOWER(r.materia) LIKE LOWER(CONCAT('%',:materia,'%'))) AND
          (:tipo     IS NULL OR r.tipo = :tipo)
        ORDER BY r.fecha DESC
        """)
    List<Recurso> buscar(@Param("carrera") String carrera,
                         @Param("materia")  String materia,
                         @Param("tipo")     Recurso.Tipo tipo);

    List<Recurso> findByUsuarioIdOrderByFechaDesc(Long usuarioId);
}
