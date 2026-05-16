package com.tesvg.backend.repository;

import com.tesvg.backend.model.Insignia;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InsigniaRepository extends JpaRepository<Insignia, Long> {
    List<Insignia> findByTipo(Insignia.Tipo tipo);
    List<Insignia> findAllByOrderByTipoAscUmbralAsc();
}
