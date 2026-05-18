package com.tesvg.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.tesvg.backend.model.Publicacion;
import java.time.LocalDateTime;
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

    /** Home feed: show announcements + pinned always; normal posts only while not expired. */
    @Query("SELECT p FROM Publicacion p WHERE p.esAnuncio = true OR p.fijada = true OR p.expiresAt IS NULL OR p.expiresAt > :now ORDER BY p.fecha DESC")
    Page<Publicacion> findActiveFeed(@Param("now") LocalDateTime now, Pageable pageable);
}