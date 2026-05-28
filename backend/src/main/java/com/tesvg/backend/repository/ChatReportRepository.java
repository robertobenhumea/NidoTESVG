package com.tesvg.backend.repository;

import com.tesvg.backend.model.ChatReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatReportRepository extends JpaRepository<ChatReport, Long> {
    List<ChatReport> findByStatusOrderByCreatedAtDesc(String status);
}
