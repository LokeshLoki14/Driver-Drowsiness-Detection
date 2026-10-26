package com.drowsiness.detection;

import org.springframework.stereotype.Service;

import com.drowsiness.config.DetectionProperties;

@Service
public class DrowsinessDetector {

    private final DetectionProperties properties;
    private int eyeCounter = 0;
    private int yawnCounter = 0;

    public DrowsinessDetector(DetectionProperties properties) {
        this.properties = properties;
    }

    public synchronized DetectionResult analyze(double ear, double mar) {
        if (ear < properties.getEarThreshold()) {
            eyeCounter++;
        } else {
            eyeCounter = 0;
        }

        if (mar > properties.getMarThreshold()) {
            yawnCounter++;
        } else {
            yawnCounter = Math.max(0, yawnCounter - 2);
        }

        DriverState state = DriverState.ALERT;
        String eventType = null;

        boolean eyesClosed = eyeCounter >= properties.getFrameThreshold();
        boolean yawning = yawnCounter >= properties.getFrameThreshold();

        if (eyesClosed && yawning) {
            state = DriverState.DROWSY;
            eventType = "DROWSINESS";
        } else if (yawning) {
            state = DriverState.DROWSY;
            eventType = "YAWNING";
        } else if (eyesClosed) {
            state = DriverState.DROWSY;
            eventType = "EYE_CLOSURE";
        }

        return new DetectionResult(state, ear, mar, eventType, eyeCounter, yawnCounter);
    }

    public synchronized DetectionResult noFace() {
        eyeCounter = 0;
        yawnCounter = 0;
        return new DetectionResult(DriverState.NO_FACE, 0, 0, null, 0, 0);
    }

    public synchronized void reset() {
        eyeCounter = 0;
        yawnCounter = 0;
    }
}
