package com.tesvg.backend.repository;

import com.tesvg.backend.model.Story;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface StoryRepository extends JpaRepository<Story, Long> {
    List<Story> findByExpiraEnAfterOrderByFechaDesc(LocalDateTime now);
    List<Story> findByUsuarioIdOrderByFechaDesc(Long usuarioId);
}
