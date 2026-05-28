package com.tesvg.backend.repository;

import com.tesvg.backend.model.DMConversationPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DMConversationPreferenceRepository extends JpaRepository<DMConversationPreference, Long> {
    Optional<DMConversationPreference> findByUsuarioIdAndPartnerId(Long usuarioId, Long partnerId);
    List<DMConversationPreference> findByUsuarioIdAndArchivedTrue(Long usuarioId);
}
