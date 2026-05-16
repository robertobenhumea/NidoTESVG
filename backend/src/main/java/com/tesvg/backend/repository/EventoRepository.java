package com.tesvg.backend.repository;

import com.tesvg.backend.model.Evento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface EventoRepository extends JpaRepository<Evento, Long> {
    List<Evento> findAllByOrderByFechaEventoAsc();
    List<Evento> findByFechaEventoBetweenOrderByFechaEventoAsc(LocalDate inicio, LocalDate fin);
}
