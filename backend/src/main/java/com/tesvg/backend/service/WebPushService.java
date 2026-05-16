package com.tesvg.backend.service;

import com.tesvg.backend.model.PushSubscription;
import com.tesvg.backend.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import nl.martijndwars.webpush.Subscription.Keys;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Security;
import java.util.List;

@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    @Value("${app.vapid.public-key}")
    private String vapidPublicKey;

    @Value("${app.vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${app.vapid.subject}")
    private String vapidSubject;

    private final PushSubscriptionRepository repo;
    private PushService pushService;

    public WebPushService(PushSubscriptionRepository repo) {
        this.repo = repo;
    }

    @PostConstruct
    public void init() throws Exception {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
    }

    public void subscribe(Long usuarioId, String endpoint, String p256dh, String auth) {
        repo.findByUsuarioIdAndEndpoint(usuarioId, endpoint).ifPresentOrElse(
            existing -> {},
            () -> {
                PushSubscription sub = new PushSubscription();
                sub.setUsuarioId(usuarioId);
                sub.setEndpoint(endpoint);
                sub.setP256dh(p256dh);
                sub.setAuth(auth);
                repo.save(sub);
            }
        );
    }

    @Transactional
    public void unsubscribe(Long usuarioId, String endpoint) {
        repo.deleteByUsuarioIdAndEndpoint(usuarioId, endpoint);
    }

    public void sendToUser(Long usuarioId, String title, String body, String url) {
        List<PushSubscription> subs = repo.findByUsuarioId(usuarioId);
        if (subs.isEmpty()) return;

        String payload = buildPayload(title, body, url);

        for (PushSubscription sub : subs) {
            try {
                Keys keys = new Keys(sub.getP256dh(), sub.getAuth());
                Subscription subscription = new Subscription(sub.getEndpoint(), keys);
                Notification notification = new Notification(subscription, payload);
                pushService.send(notification);
            } catch (Exception e) {
                log.warn("Push failed for endpoint {}: {}", sub.getEndpoint(), e.getMessage());
                if (isExpiredEndpoint(e)) {
                    repo.delete(sub);
                }
            }
        }
    }

    private String buildPayload(String title, String body, String url) {
        String safeTitle = title.replace("\"", "\\\"");
        String safeBody  = body.replace("\"", "\\\"");
        String safeUrl   = url.replace("\"", "\\\"");
        return "{\"title\":\"" + safeTitle + "\",\"body\":\"" + safeBody + "\",\"url\":\"" + safeUrl + "\"}";
    }

    private boolean isExpiredEndpoint(Exception e) {
        String msg = e.getMessage();
        return msg != null && (msg.contains("410") || msg.contains("404") || msg.contains("Gone"));
    }
}
