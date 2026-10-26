package com.drowsiness.vision;

import java.io.File;

import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Point2f;
import org.bytedeco.opencv.opencv_core.Point2fVector;
import org.bytedeco.opencv.opencv_core.Point2fVectorVector;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.RectVector;
import org.bytedeco.opencv.opencv_face.FacemarkLBF;
import org.springframework.stereotype.Service;

import com.drowsiness.config.DetectionProperties;

import jakarta.annotation.PostConstruct;

@Service
public class LandmarkDetectorService {

    private final DetectionProperties properties;
    private FacemarkLBF facemark;

    public LandmarkDetectorService(DetectionProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    public void loadModel() {
        File modelFile = new File(properties.getLandmarkModelPath());

        if (!modelFile.exists()) {
            throw new IllegalStateException("Landmark model not found: " + modelFile.getAbsolutePath());
        }

        facemark = FacemarkLBF.create();
        facemark.loadModel(modelFile.getAbsolutePath());
    }

    public synchronized double[][] detect(Mat frame, Rect face) {
        RectVector faces = new RectVector(face);
        Point2fVectorVector landmarks = new Point2fVectorVector();

        boolean success = facemark.fit(frame, faces, landmarks);

        double[][] points = null;

        if (success && landmarks.size() > 0) {
            Point2fVector vector = landmarks.get(0);
            if (vector.size() == 68) {
                points = new double[68][2];
                for (int i = 0; i < 68; i++) {
                    Point2f p = vector.get(i);
                    points[i][0] = p.x();
                    points[i][1] = p.y();
                }
            }
        }

        faces.close();
        landmarks.close();
        return points;
    }
}
