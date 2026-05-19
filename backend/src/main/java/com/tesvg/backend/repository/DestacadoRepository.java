package com.tesvg.backend.repository;

import com.tesvg.backend.model.Destacado;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DestacadoRepository extends JpaRepository<Destacado, Long> {

    List<Destacado> findByUsuarioIdOrderByOrdenAsc(Long usuarioId);

    List<Destacado> findByUsuarioIdAndPublico(Long usuarioId, boolean publico, Sort sort);

    long countByUsuarioId(Long usuarioId);
}
