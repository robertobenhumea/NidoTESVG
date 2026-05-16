package com.tesvg.backend.repository;

import com.tesvg.backend.model.Aviso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AvisoRepository extends JpaRepository<Aviso, Long> {

    List<Aviso> findAllByOrderByFechaDesc();

    @Query("SELECT a FROM Aviso a WHERE a.carrera = :carrera OR a.carrera IS NULL ORDER BY a.fecha DESC")
    List<Aviso> findByCarreraOrGlobal(@Param("carrera") String carrera);
}
