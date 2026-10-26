package com.drowsiness.detection;

import org.bytedeco.javacpp.BytePointer;
import org.bytedeco.opencv.global.opencv_imgcodecs;
import org.bytedeco.opencv.global.opencv_imgproc;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Point;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.Scalar;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.drowsiness.alert.AlertService;
import com.drowsiness.camera.CameraService;
import com.drowsiness.vision.EyeAnalyzer;
import com.drowsiness.vision.FaceDetectorService;
import com.drowsiness.vision.LandmarkDetectorService;
import com.drowsiness.vision.MouthAnalyzer;

import jakarta.annotation.PreDestroy;

@Service
public class DetectionLoop {

    private static final Logger log = LoggerFactory.getLogger(DetectionLoop.class);
    private static final int MAX_MISSED_FRAMES = 8;

    private final CameraService cameraService;
    private final FaceDetectorService faceDetectorService;
    private final LandmarkDetectorService landmarkDetectorService;
    private final EyeAnalyzer eyeAnalyzer;
    private final MouthAnalyzer mouthAnalyzer;
    private final DrowsinessDetector drowsinessDetector;
    private final AlertService alertService;

    private volatile boolean running = false;
    private volatile byte[] latestJpeg;
    private volatile DetectionResult latestResult =
            new DetectionResult(DriverState.NO_FACE, 0, 0, null, 0, 0);
    private Thread worker;

    private Rect lastFace;
    private int missedFrames = 0;

    public DetectionLoop(CameraService cameraService,
            FaceDetectorService faceDetectorService,
            LandmarkDetectorService landmarkDetectorService,
            EyeAnalyzer eyeAnalyzer,
            MouthAnalyzer mouthAnalyzer,
            DrowsinessDetector drowsinessDetector,
            AlertService alertService) {
        this.cameraService = cameraService;
        this.faceDetectorService = faceDetectorService;
        this.landmarkDetectorService = landmarkDetectorService;
        this.eyeAnalyzer = eyeAnalyzer;
        this.mouthAnalyzer = mouthAnalyzer;
        this.drowsinessDetector = drowsinessDetector;
        this.alertService = alertService;
    }

    public synchronized boolean start() {
        if (running) {
            return true;
        }
        if (!cameraService.start()) {
            return false;
        }

        drowsinessDetector.reset();
        lastFace = null;
        missedFrames = 0;
        alertService.startSession();
        running = true;

        worker = new Thread(this::runLoop, "detection-loop");
        worker.setDaemon(true);
        worker.start();
        return true;
    }

    @PreDestroy
    public synchronized void stop() {
        if (!running) {
            return;
        }
        running = false;

        try {
            worker.join(3000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        worker = null;

        cameraService.stop();
        alertService.endSession();
        latestJpeg = null;
        latestResult = new DetectionResult(DriverState.NO_FACE, 0, 0, null, 0, 0);
    }

    public boolean isRunning() {
        return running;
    }

    public byte[] getLatestJpeg() {
        return latestJpeg;
    }

    public DetectionResult getLatestResult() {
        return latestResult;
    }

    private void runLoop() {
        while (running) {
            try {
                Mat frame = cameraService.readFrame();
                if (frame == null) {
                    Thread.sleep(50);
                    continue;
                }
                processFrame(frame);
                frame.release();
                Thread.sleep(20);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                log.error("Frame processing failed", e);
            }
        }
    }

    private void processFrame(Mat frame) {
        DetectionResult result = null;
        Rect face = faceDetectorService.detectLargestFace(frame);

        if (face != null) {
            lastFace = face;
            missedFrames = 0;
        } else if (lastFace != null && missedFrames < MAX_MISSED_FRAMES) {
            face = lastFace;
            missedFrames++;
        } else {
            lastFace = null;
        }

        if (face != null) {
            double[][] points = landmarkDetectorService.detect(frame, face);

            if (points != null) {
                double ear = eyeAnalyzer.calculateEar(points);
                double mar = mouthAnalyzer.calculateMar(points);
                result = drowsinessDetector.analyze(ear, mar);

                boolean drowsy = result.getState() == DriverState.DROWSY;
                Scalar boxColor = drowsy ? new Scalar(0, 0, 255, 0) : new Scalar(0, 255, 0, 0);
                drawFaceBox(frame, face, boxColor);

                for (int i = 36; i < 68; i++) {
                    Point dot = new Point((int) points[i][0], (int) points[i][1]);
                    opencv_imgproc.circle(frame, dot, 2, new Scalar(0, 255, 255, 0));
                }
            }
        }

        if (result == null) {
            result = drowsinessDetector.noFace();
        }

        alertService.handle(result);
        latestResult = result;

        drawText(frame, result);
        latestJpeg = encode(frame);
    }

    private void drawFaceBox(Mat frame, Rect face, Scalar color) {
        int padX = face.width() / 6;
        int padTop = face.height() / 6;
        int padBottom = face.height() / 4;

        int left = Math.max(0, face.x() - padX);
        int top = Math.max(0, face.y() - padTop);
        int right = Math.min(frame.cols() - 1, face.x() + face.width() + padX);
        int bottom = Math.min(frame.rows() - 1, face.y() + face.height() + padBottom);

        Rect box = new Rect(left, top, right - left, bottom - top);
        opencv_imgproc.rectangle(frame, box, color, 3, opencv_imgproc.LINE_8, 0);
    }

    private void drawText(Mat frame, DetectionResult result) {
        Scalar white = new Scalar(255, 255, 255, 0);
        Scalar red = new Scalar(0, 0, 255, 0);

        opencv_imgproc.putText(frame, String.format("EAR: %.2f", result.getEar()),
                new Point(30, 30), opencv_imgproc.FONT_HERSHEY_SIMPLEX, 0.7, white);
        opencv_imgproc.putText(frame, String.format("MAR: %.2f", result.getMar()),
                new Point(30, 60), opencv_imgproc.FONT_HERSHEY_SIMPLEX, 0.7, white);

        if (result.getState() == DriverState.DROWSY) {
            String message;
            if ("DROWSINESS".equals(result.getEventType())) {
                message = "DROWSINESS ALERT!";
            } else if ("YAWNING".equals(result.getEventType())) {
                message = "YAWNING ALERT!";
            } else {
                message = "EYE CLOSURE ALERT!";
            }
            opencv_imgproc.putText(frame, message, new Point(50, 110),
                    opencv_imgproc.FONT_HERSHEY_SIMPLEX, 1.0, red, 3,
                    opencv_imgproc.LINE_8, false);
        } else if (result.getState() == DriverState.NO_FACE) {
            opencv_imgproc.putText(frame, "NO FACE DETECTED", new Point(30, 90),
                    opencv_imgproc.FONT_HERSHEY_SIMPLEX, 0.7, white);
        }
    }

    private byte[] encode(Mat frame) {
        BytePointer buffer = new BytePointer();
        opencv_imgcodecs.imencode(".jpg", frame, buffer);
        byte[] bytes = new byte[(int) buffer.limit()];
        buffer.get(bytes);
        buffer.close();
        return bytes;
    }
}
