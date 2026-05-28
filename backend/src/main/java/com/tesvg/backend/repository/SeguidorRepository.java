package com.tesvg.backend.repository;

import com.tesvg.backend.model.Seguidor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface SeguidorRepository extends JpaRepository<Seguidor, Long> {
    Optional<Seguidor> findBySeguidorIdAndSeguidoId(Long seguidorId, Long seguidoId);
    List<Seguidor> findBySeguidoId(Long seguidoId);
    List<Seguidor> findBySeguidorId(Long seguidorId);
    List<Seguidor> findBySeguidoIdOrderByFechaDesc(Long seguidoId);
    List<Seguidor> findBySeguidorIdOrderByFechaDesc(Long seguidorId);
    int countBySeguidoId(Long seguidoId);
    int countBySeguidorId(Long seguidorId);

    // Cuántos usuarios de los que sigue u1 también siguen a u2
    @Query("SELECT COUNT(s1) FROM Seguidor s1 WHERE s1.seguidorId = :u1 " +
           "AND s1.seguidoId IN (SELECT s2.seguidorId FROM Seguidor s2 WHERE s2.seguidoId = :u2)")
    int countMutuals(@Param("u1") Long u1, @Param("u2") Long u2);
}