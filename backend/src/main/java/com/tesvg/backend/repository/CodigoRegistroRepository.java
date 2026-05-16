package com.tesvg.backend.repository;

import com.tesvg.backend.model.CodigoRegistro;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CodigoRegistroRepository extends JpaRepository<CodigoRegistro, Long> {
    Optional<CodigoRegistro> findByCodigoAndActivoTrue(String codigo);
    List<CodigoRegistro> findAllByOrderByFechaDesc();
}
