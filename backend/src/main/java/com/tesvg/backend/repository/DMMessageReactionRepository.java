package com.tesvg.backend.repository;

import com.tesvg.backend.model.DMMessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DMMessageReactionRepository extends JpaRepository<DMMessageReaction, Long> {
    List<DMMessageReaction> findByMessageId(Long messageId);
    List<DMMessageReaction> findByMessageIdIn(List<Long> messageIds);
    Optional<DMMessageReaction> findByMessageIdAndUsuarioId(Long messageId, Long usuarioId);
}
