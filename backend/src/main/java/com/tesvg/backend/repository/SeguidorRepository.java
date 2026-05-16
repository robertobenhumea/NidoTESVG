package com.tesvg.backend.repository;

import com.tesvg.backend.model.Seguidor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SeguidorRepository extends JpaRepository<Seguidor, Long> {
    Optional<Seguidor> findBySeguidorIdAndSeguidoId(Long seguidorId, Long seguidoId);
    List<Seguidor> findBySeguidoId(Long seguidoId);   // quiénes me siguen
    List<Seguidor> findBySeguidorId(Long seguidorId); // a quiénes sigo
    int countBySeguidoId(Long seguidoId);             // total seguidores
    int countBySeguidorId(Long seguidorId);           // total seguidos
}