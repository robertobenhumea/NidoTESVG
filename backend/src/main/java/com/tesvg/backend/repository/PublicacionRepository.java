package com.tesvg.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.tesvg.backend.model.Publicacion;
import java.util.List;
import java.util.Optional;

public interface PublicacionRepository extends JpaRepository<Publicacion, Long> {
    List<Publicacion> findByUsuarioId(Long usuarioId);
    List<Publicacion> findByEsAnuncioTrueOrderByFechaDesc();
    List<Publicacion> findAllByOrderByFechaDesc();
    Page<Publicacion> findAllByOrderByFechaDesc(Pageable pageable);
    Optional<Publicacion> findByUsuarioIdAndFijadaTrue(Long usuarioId);
    List<Publicacion> findByUsuarioIdOrderByFechaDesc(Long usuarioId);
    Optional<Publicacion> findByUsuarioIdAndPublicacionOriginalId(Long usuarioId, Long publicacionOriginalId);
    int countByUsuarioId(Long usuarioId);
}