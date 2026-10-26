package com.drowsiness;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.drowsiness.config.DetectionProperties;
import com.drowsiness.detection.DetectionResult;
import com.drowsiness.detection.DriverState;
import com.drowsiness.detection.DrowsinessDetector;

class DrowsinessDetectorTest {

    private DrowsinessDetector detector;

    @BeforeEach
    void setUp() {
        DetectionProperties properties = new DetectionProperties();
        properties.setEarThreshold(0.25);
        properties.setMarThreshold(1.10);
        properties.setFrameThreshold(18);
        detector = new DrowsinessDetector(properties);
    }

    @Test
    void openEyesAndClosedMouthIsAlert() {
        DetectionResult result = detector.analyze(0.30, 0.40);
        assertEquals(DriverState.ALERT, result.getState());
        assertNull(result.getEventType());
    }

    @Test
    void eyesClosedFor18FramesIsDrowsy() {
        DetectionResult result = null;
        for (int i = 1; i <= 17; i++) {
            result = detector.analyze(0.15, 0.40);
            assertEquals(DriverState.ALERT, result.getState());
        }
        result = detector.analyze(0.15, 0.40);
        assertEquals(DriverState.DROWSY, result.getState());
        assertEquals("EYE_CLOSURE", result.getEventType());
    }

    @Test
    void normalBlinkResetsCounter() {
        for (int i = 0; i < 10; i++) {
            detector.analyze(0.15, 0.40);
        }
        detector.analyze(0.30, 0.40);
        DetectionResult result = detector.analyze(0.15, 0.40);
        assertEquals(1, result.getEyeFrames());
        assertEquals(DriverState.ALERT, result.getState());
    }

    @Test
    void yawningFor18FramesIsDrowsy() {
        DetectionResult result = null;
        for (int i = 1; i <= 18; i++) {
            result = detector.analyze(0.30, 1.30);
        }
        assertEquals(DriverState.DROWSY, result.getState());
        assertEquals("YAWNING", result.getEventType());
    }

    @Test
    void noFaceResetsCounters() {
        for (int i = 0; i < 10; i++) {
            detector.analyze(0.15, 0.40);
        }
        DetectionResult noFace = detector.noFace();
        assertEquals(DriverState.NO_FACE, noFace.getState());

        DetectionResult result = detector.analyze(0.15, 0.40);
        assertEquals(1, result.getEyeFrames());
    }

    @Test
    void eyesClosedAndYawningTogetherIsDrowsiness() {
        DetectionResult result = null;
        for (int i = 1; i <= 18; i++) {
            result = detector.analyze(0.15, 1.30);
        }
        assertEquals(DriverState.DROWSY, result.getState());
        assertEquals("DROWSINESS", result.getEventType());
    }
}
