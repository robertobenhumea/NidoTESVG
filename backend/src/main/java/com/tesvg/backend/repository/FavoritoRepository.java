package com.tesvg.backend.repository;

import com.tesvg.backend.model.Favorito;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FavoritoRepository extends JpaRepository<Favorito, Long> {
    Optional<Favorito> findByUsuarioIdAndProductoId(Long usuarioId, Long productoId);
    List<Favorito> findByUsuarioId(Long usuarioId);
    long countByProductoId(Long productoId);
    void deleteByProductoId(Long productoId);
}
