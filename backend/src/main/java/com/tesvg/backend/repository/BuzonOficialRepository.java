package com.tesvg.backend.repository;

import com.tesvg.backend.model.BuzonOficial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BuzonOficialRepository extends JpaRepository<BuzonOficial, Long> {
    List<BuzonOficial> findByActivoTrueOrderByNombreAsc();
    Optional<BuzonOficial> findByAlias(String alias);
    boolean existsByAlias(String alias);
}
