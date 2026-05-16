package com.tesvg.backend.service;

import com.tesvg.backend.model.Correo;
import com.tesvg.backend.model.CorreoDestinatario;
import com.tesvg.backend.repository.CorreoDestinatarioRepository;
import com.tesvg.backend.repository.CorreoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class CorreoScheduler {

    @Autowired private CorreoRepository correoRepository;
    @Autowired private CorreoDestinatarioRepository destRepository;

    /* Cada minuto: enviar correos programados cuya hora llegó */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void enviarProgramados() {
        List<Correo> listos = correoRepository.findProgramadosParaEnviar(LocalDateTime.now());
        for (Correo c : listos) {
            c.setEsBorrador(false);
            c.setProgramadoPara(null);
            correoRepository.save(c);
        }
    }

    /* Una vez al día a las 3 AM: vaciar papelera con más de 30 días */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void vaciarPapeleraAntigua() {
        LocalDateTime limite = LocalDateTime.now().minusDays(30);
        List<CorreoDestinatario> viejos = destRepository.findPapeleraAntigua(limite);
        for (CorreoDestinatario d : viejos) {
            destRepository.delete(d);
        }
    }
}
