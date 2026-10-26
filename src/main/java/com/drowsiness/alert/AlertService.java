package com.drowsiness.alert;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;

import com.drowsiness.detection.DetectionResult;
import com.drowsiness.detection.DriverState;
import com.drowsiness.entity.DetectionSession;
import com.drowsiness.entity.DrowsinessEvent;
import com.drowsiness.repository.DetectionSessionRepository;
import com.drowsiness.repository.DrowsinessEventRepository;

@Service
public class AlertService {

    private final DetectionSessionRepository sessionRepository;
    private final DrowsinessEventRepository eventRepository;

    private Long currentSessionId;
    private boolean alarmActive = false;

    public AlertService(DetectionSessionRepository sessionRepository,
            DrowsinessEventRepository eventRepository) {
        this.sessionRepository = sessionRepository;
        this.eventRepository = eventRepository;
    }

    public synchronized void startSession() {
        DetectionSession session = new DetectionSession();
        session.setStartedAt(LocalDateTime.now());
        currentSessionId = sessionRepository.save(session).getId();
        alarmActive = false;
    }

    public synchronized void endSession() {
        if (currentSessionId != null) {
            sessionRepository.findById(currentSessionId).ifPresent(session -> {
                session.setEndedAt(LocalDateTime.now());
                sessionRepository.save(session);
            });
            currentSessionId = null;
        }
        alarmActive = false;
    }

    public synchronized void handle(DetectionResult result) {
        if (result.getState() == DriverState.DROWSY) {
            if (!alarmActive && currentSessionId != null) {
                DrowsinessEvent event = new DrowsinessEvent();
                event.setSessionId(currentSessionId);
                event.setEventType(result.getEventType());
                event.setEarValue(result.getEar());
                event.setMarValue(result.getMar());
                event.setDetectedAt(LocalDateTime.now());
                eventRepository.save(event);
            }
            alarmActive = true;
        } else {
            alarmActive = false;
        }
    }
}
