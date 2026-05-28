package com.tesvg.backend.repository;

import com.tesvg.backend.model.ChatAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatAuditLogRepository extends JpaRepository<ChatAuditLog, Long> {
}
