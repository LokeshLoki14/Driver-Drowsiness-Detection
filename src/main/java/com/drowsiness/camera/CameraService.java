package com.drowsiness.camera;

import org.bytedeco.opencv.global.opencv_imgproc;
import org.bytedeco.opencv.global.opencv_videoio;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Size;
import org.bytedeco.opencv.opencv_videoio.VideoCapture;
import org.springframework.stereotype.Service;

import com.drowsiness.config.DetectionProperties;

import jakarta.annotation.PreDestroy;

@Service
public class CameraService {

    private final DetectionProperties properties;
    private VideoCapture capture;

    public CameraService(DetectionProperties properties) {
        this.properties = properties;
    }

    public synchronized boolean start() {
        if (capture != null && capture.isOpened()) {
            return true;
        }

        capture = new VideoCapture(properties.getCameraIndex(), opencv_videoio.CAP_DSHOW);

        if (!capture.isOpened()) {
            capture.release();
            capture = new VideoCapture(properties.getCameraIndex());
        }

        if (!capture.isOpened()) {
            return false;
        }

        Mat warmUp = new Mat();
        for (int i = 0; i < 30; i++) {
            capture.read(warmUp);
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        warmUp.release();

        return true;
    }

    public synchronized Mat readFrame() {
        if (capture == null || !capture.isOpened()) {
            return null;
        }

        Mat original = new Mat();
        if (!capture.read(original) || original.empty()) {
            original.release();
            return null;
        }

        Mat resized = new Mat();
        opencv_imgproc.resize(original, resized, new Size(640, 480));
        original.release();
        return resized;
    }

    public synchronized boolean isRunning() {
        return capture != null && capture.isOpened();
    }

    @PreDestroy
    public synchronized void stop() {
        if (capture != null) {
            capture.release();
            capture = null;
        }
    }
}
