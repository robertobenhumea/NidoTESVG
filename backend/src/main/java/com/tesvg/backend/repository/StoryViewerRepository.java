package com.tesvg.backend.repository;

import com.tesvg.backend.model.StoryViewer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StoryViewerRepository extends JpaRepository<StoryViewer, Long> {
    Optional<StoryViewer> findByStoryIdAndUsuarioId(Long storyId, Long usuarioId);
    List<StoryViewer> findByStoryIdOrderByVistoEnDesc(Long storyId);
    long countByStoryId(Long storyId);
}
