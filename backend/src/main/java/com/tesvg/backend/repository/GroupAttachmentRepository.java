package com.tesvg.backend.repository;

import com.tesvg.backend.model.GroupAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GroupAttachmentRepository extends JpaRepository<GroupAttachment, Long> {
    List<GroupAttachment> findByGrupoIdAndActivoTrueOrderByFechaCreacionDesc(Long grupoId);
}
