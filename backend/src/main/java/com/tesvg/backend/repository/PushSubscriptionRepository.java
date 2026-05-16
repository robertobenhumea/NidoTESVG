package com.tesvg.backend.repository;

import com.tesvg.backend.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUsuarioId(Long usuarioId);
    Optional<PushSubscription> findByUsuarioIdAndEndpoint(Long usuarioId, String endpoint);
    void deleteByUsuarioIdAndEndpoint(Long usuarioId, String endpoint);
}
