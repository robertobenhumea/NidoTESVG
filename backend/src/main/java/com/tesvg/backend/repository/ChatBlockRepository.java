package com.tesvg.backend.repository;

import com.tesvg.backend.model.ChatBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatBlockRepository extends JpaRepository<ChatBlock, Long> {
    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);
    Optional<ChatBlock> findByBlockerIdAndBlockedId(Long blockerId, Long blockedId);
    List<ChatBlock> findByBlockerId(Long blockerId);
    boolean existsByBlockerIdAndBlockedIdOrBlockerIdAndBlockedId(Long blockerA, Long blockedA, Long blockerB, Long blockedB);
}
