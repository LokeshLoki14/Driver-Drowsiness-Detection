package com.drowsiness.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.drowsiness.entity.DrowsinessEvent;
import com.drowsiness.repository.DrowsinessEventRepository;

@RestController
@RequestMapping("/api")
public class EventController {

    private final DrowsinessEventRepository eventRepository;

    public EventController(DrowsinessEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping("/events")
    public List<DrowsinessEvent> events() {
        return eventRepository.findAllByOrderByDetectedAtDesc();
    }
}
