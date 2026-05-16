package com.tesvg.backend.repository;

import com.tesvg.backend.model.Like;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LikeRepository extends JpaRepository<Like, Long> {
    List<Like> findByPublicacionId(Long publicacionId);
    List<Like> findByUsuarioId(Long usuarioId);
    Optional<Like> findByUsuarioIdAndPublicacionId(Long usuarioId, Long publicacionId);
    int countByPublicacionId(Long publicacionId);
}