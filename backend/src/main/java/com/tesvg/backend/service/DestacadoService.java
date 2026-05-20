package com.tesvg.backend.service;

import com.tesvg.backend.dto.CreateDestacadoRequest;
import com.tesvg.backend.dto.DestacadoDTO;
import com.tesvg.backend.dto.StoryDTO;
import com.tesvg.backend.model.Destacado;
import com.tesvg.backend.model.Story;
import com.tesvg.backend.model.Usuario;
import com.tesvg.backend.repository.DestacadoRepository;
import com.tesvg.backend.repository.StoryRepository;
import com.tesvg.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DestacadoService {

    @Autowired private DestacadoRepository destacadoRepository;
    @Autowired private StoryRepository storyRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    private StoryDTO mapStory(Story s) {
        return new StoryDTO(
            s.getId(),
            s.getImagenUrl(),
            s.getTexto(),
            s.getColorFondo(),
            s.getFecha() != null ? s.getFecha().toString() : null
        );
    }

    private DestacadoDTO mapDestacado(Destacado d) {
        DestacadoDTO dto = new DestacadoDTO();
        dto.setId(d.getId());
        dto.setNombre(d.getNombre());
        dto.setEmoji(d.getEmoji());
        dto.setCoverImageUrl(d.getCoverImageUrl());
        dto.setCoverColor(d.getCoverColor());
        dto.setOrden(d.getOrden());
        dto.setPublico(d.isPublico());
        List<StoryDTO> stories = d.getHistorias().stream().map(this::mapStory).collect(Collectors.toList());
        dto.setHistorias(stories);
        dto.setHistoriaCount(stories.size());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<DestacadoDTO> getDestacados(Long usuarioId, boolean soloPublicos) {
        List<Destacado> list;
        if (soloPublicos) {
            list = destacadoRepository.findByUsuarioIdAndPublico(
                usuarioId, true, Sort.by(Sort.Direction.ASC, "orden")
            );
        } else {
            list = destacadoRepository.findByUsuarioIdOrderByOrdenAsc(usuarioId);
        }
        return list.stream().map(this::mapDestacado).collect(Collectors.toList());
    }

    private static final int MAX_DESTACADOS_PER_USER = 9;
    private static final int MAX_HISTORIAS_PER_DESTACADO = 30;

    public DestacadoDTO createDestacado(Long usuarioId, CreateDestacadoRequest req) {
        if (req.getNombre() == null || req.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }

        long count = destacadoRepository.countByUsuarioId(usuarioId);
        if (count >= MAX_DESTACADOS_PER_USER) {
            throw new IllegalArgumentException("Límite alcanzado: máximo " + MAX_DESTACADOS_PER_USER + " destacados por usuario");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Destacado d = new Destacado();
        d.setUsuario(usuario);
        d.setNombre(req.getNombre().trim());
        d.setEmoji(req.getEmoji());
        d.setCoverImageUrl(req.getCoverImageUrl());
        d.setCoverColor(req.getCoverColor());
        d.setPublico(req.isPublico());

        d.setOrden((int) count);

        if (req.getHistoriaIds() != null && !req.getHistoriaIds().isEmpty()) {
            List<Story> historias = req.getHistoriaIds().stream()
                .map(hid -> storyRepository.findById(hid).orElse(null))
                .filter(s -> s != null && s.getUsuarioId().equals(usuarioId))
                .collect(Collectors.toList());
            d.setHistorias(historias);
        }

        return mapDestacado(destacadoRepository.save(d));
    }

    public DestacadoDTO updateDestacado(Long destacadoId, Long usuarioId, CreateDestacadoRequest req) {
        Destacado d = destacadoRepository.findById(destacadoId)
            .orElseThrow(() -> new RuntimeException("Destacado no encontrado"));

        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new SecurityException("No tienes permiso para editar este destacado");
        }

        if (req.getNombre() != null && !req.getNombre().isBlank()) {
            d.setNombre(req.getNombre().trim());
        }
        d.setEmoji(req.getEmoji());
        d.setCoverImageUrl(req.getCoverImageUrl());
        d.setCoverColor(req.getCoverColor());
        d.setPublico(req.isPublico());

        if (req.getHistoriaIds() != null) {
            List<Story> historias = req.getHistoriaIds().stream()
                .map(hid -> storyRepository.findById(hid).orElse(null))
                .filter(s -> s != null && s.getUsuarioId().equals(usuarioId))
                .collect(Collectors.toList());
            if (historias.size() > MAX_HISTORIAS_PER_DESTACADO) {
                throw new IllegalArgumentException("Límite alcanzado: máximo " + MAX_HISTORIAS_PER_DESTACADO + " historias por destacado");
            }
            d.setHistorias(historias);
        }

        return mapDestacado(destacadoRepository.save(d));
    }

    public void deleteDestacado(Long destacadoId, Long usuarioId) {
        Destacado d = destacadoRepository.findById(destacadoId)
            .orElseThrow(() -> new RuntimeException("Destacado no encontrado"));

        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new SecurityException("No tienes permiso para eliminar este destacado");
        }

        destacadoRepository.delete(d);
    }

    public DestacadoDTO addHistoria(Long destacadoId, Long historiaId, Long usuarioId) {
        Destacado d = destacadoRepository.findById(destacadoId)
            .orElseThrow(() -> new RuntimeException("Destacado no encontrado"));

        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new SecurityException("No tienes permiso");
        }

        Story story = storyRepository.findById(historiaId)
            .orElseThrow(() -> new RuntimeException("Historia no encontrada"));

        if (!story.getUsuarioId().equals(usuarioId)) {
            throw new SecurityException("Solo puedes agregar tus propias historias");
        }

        boolean alreadyIn = d.getHistorias().stream().anyMatch(s -> s.getId().equals(historiaId));
        if (!alreadyIn) {
            if (d.getHistorias().size() >= MAX_HISTORIAS_PER_DESTACADO) {
                throw new IllegalArgumentException("Límite alcanzado: máximo " + MAX_HISTORIAS_PER_DESTACADO + " historias por destacado");
            }
            d.getHistorias().add(story);
            destacadoRepository.save(d);
        }

        return mapDestacado(d);
    }

    public DestacadoDTO removeHistoria(Long destacadoId, Long historiaId, Long usuarioId) {
        Destacado d = destacadoRepository.findById(destacadoId)
            .orElseThrow(() -> new RuntimeException("Destacado no encontrado"));

        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new SecurityException("No tienes permiso");
        }

        d.getHistorias().removeIf(s -> s.getId().equals(historiaId));
        return mapDestacado(destacadoRepository.save(d));
    }

    public void reorderDestacados(Long usuarioId, List<Long> ordenIds) {
        List<Destacado> todos = destacadoRepository.findByUsuarioIdOrderByOrdenAsc(usuarioId);
        for (int i = 0; i < ordenIds.size(); i++) {
            final int idx = i;
            final Long did = ordenIds.get(i);
            todos.stream()
                .filter(d -> d.getId().equals(did) && d.getUsuario().getId().equals(usuarioId))
                .findFirst()
                .ifPresent(d -> {
                    d.setOrden(idx);
                    destacadoRepository.save(d);
                });
        }
    }
}
