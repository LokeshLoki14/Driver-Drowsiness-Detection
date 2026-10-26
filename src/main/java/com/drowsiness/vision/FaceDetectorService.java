package com.drowsiness.vision;

import java.io.File;

import org.bytedeco.opencv.global.opencv_imgproc;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.RectVector;
import org.bytedeco.opencv.opencv_core.Size;
import org.bytedeco.opencv.opencv_objdetect.CascadeClassifier;
import org.springframework.stereotype.Service;

import com.drowsiness.config.DetectionProperties;

import jakarta.annotation.PostConstruct;

@Service
public class FaceDetectorService {

    private final DetectionProperties properties;
    private CascadeClassifier faceCascade;

    public FaceDetectorService(DetectionProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    public void loadModel() {
        File modelFile = new File(properties.getFaceModelPath());
        faceCascade = new CascadeClassifier();

        if (!modelFile.exists() || !faceCascade.load(modelFile.getAbsolutePath())) {
            throw new IllegalStateException("Face model not found: " + modelFile.getAbsolutePath());
        }
    }

    public Rect detectLargestFace(Mat frame) {
        Mat gray = new Mat();
        opencv_imgproc.cvtColor(frame, gray, opencv_imgproc.COLOR_BGR2GRAY);
        opencv_imgproc.equalizeHist(gray, gray);

        RectVector faces = new RectVector();
        faceCascade.detectMultiScale(gray, faces, 1.1, 5, 0, new Size(80, 80), new Size());

        Rect largest = null;
        for (long i = 0; i < faces.size(); i++) {
            Rect current = faces.get(i);
            if (largest == null || current.area() > largest.area()) {
                largest = new Rect(current.x(), current.y(), current.width(), current.height());
            }
        }

        gray.release();
        faces.close();
        return largest;
    }
}
