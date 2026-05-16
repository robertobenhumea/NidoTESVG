package com.tesvg.backend.repository;

import com.tesvg.backend.model.CorreoEtiqueta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CorreoEtiquetaRepository extends JpaRepository<CorreoEtiqueta, Long> {
    List<CorreoEtiqueta> findByUsuarioId(Long usuarioId);
    Optional<CorreoEtiqueta> findByUsuarioIdAndNombre(Long usuarioId, String nombre);
}
