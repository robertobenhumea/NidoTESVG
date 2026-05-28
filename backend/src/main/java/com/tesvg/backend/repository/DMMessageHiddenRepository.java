package com.tesvg.backend.repository;

import com.tesvg.backend.model.DMMessageHidden;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DMMessageHiddenRepository extends JpaRepository<DMMessageHidden, Long> {
    boolean existsByMessageIdAndUsuarioId(Long messageId, Long usuarioId);
    Optional<DMMessageHidden> findByMessageIdAndUsuarioId(Long messageId, Long usuarioId);
    List<DMMessageHidden> findByUsuarioIdAndMessageIdIn(Long usuarioId, List<Long> messageIds);
}
