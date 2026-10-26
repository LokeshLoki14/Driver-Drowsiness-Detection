\# Real-Time Driver Drowsiness Detection and Alert System



A Java full-stack web application that watches a driver through a webcam and raises an alert when it detects \*\*prolonged eye closure\*\* or \*\*yawning\*\*. It is a Java rebuild of an academic project that was originally written in Python with OpenCV and Dlib.



!\[Dashboard](docs/dashboard.png)



\## How it works



1\. The webcam frame is captured with OpenCV (JavaCV).

2\. A Haar cascade detects the face.

3\. A 68-point facial landmark model (FacemarkLBF) locates the eyes and mouth.

4\. \*\*EAR\*\* (Eye Aspect Ratio) measures eye closure and \*\*MAR\*\* (Mouth Aspect Ratio) measures yawning.

5\. If EAR stays below its threshold, or MAR stays above its threshold, for \*\*18 consecutive frames\*\*, the driver is marked \*\*DROWSY\*\*. Normal blinks are ignored.

6\. The dashboard shows live video, a warning banner and an alarm beep. Each drowsiness episode is saved once to MySQL.



```

Webcam -> OpenCV -> Face Detection -> 68 Landmarks -> EAR + MAR

&#x20;      -> Drowsiness Decision -> Spring Boot -> MySQL -> HTML/CSS/JS Dashboard

```



\*\*Formulas\*\*



```

EAR = ( |p1-p5| + |p2-p4| ) / ( 2 \* |p0-p3| )          per eye, then averaged

MAR = ( |61-67| + |62-66| + |63-65| ) / |60-64|

```



\## Screenshots



| Dashboard | Eye closure alert |

|---|---|

| !\[Dashboard](docs/dashboard.png) | !\[Eye closure](docs/eye-closure.png) |



| Yawning alert | Event history |

|---|---|

| !\[Yawning](docs/yawning.png) | !\[History](docs/history.png) |



\## Features



\- Live webcam video with face box and eye/mouth landmark points

\- Three separate alerts: \*\*Eye closure\*\*, \*\*Yawning\*\* and \*\*Drowsiness\*\* (both together)

\- Frame-based decision logic that ignores normal blinks

\- Short face-loss tolerance, so a wide yawn does not reset detection

\- Modern dark dashboard: sidebar, stat cards, live EAR/MAR gauges, frame progress bars and live trend chart

\- Visual alert banner, screen glow and audible alarm (can be muted)

\- History page backed by MySQL with filters and analytics charts

\- Server and camera status indicators

\- REST API for control, status and events

\- JUnit tests for the decision logic



\## Tech stack



| Layer | Technology |

|---|---|

| Frontend | HTML, CSS, JavaScript |

| Backend | Java 17+, Spring Boot, Spring Data JPA |

| Database | MySQL 8 |

| Computer vision | OpenCV via JavaCV (`org.bytedeco`) |

| Build tool | Maven |



\## Project structure



```

src/main/java/com/drowsiness/

&#x20; DrowsinessApplication.java   Application entry point

&#x20; alert/        AlertService               Saves sessions and one event per alarm

&#x20; camera/       CameraService              Opens the webcam and reads frames

&#x20; config/       DetectionProperties        Thresholds and model paths

&#x20; controller/   DetectionController        Start, stop, status

&#x20;               VideoStreamController      Live MJPEG stream

&#x20;               EventController            Saved events

&#x20; detection/    DetectionLoop              Background thread running the pipeline

&#x20;               DrowsinessDetector         Decision rules (18-frame logic)

&#x20;               DetectionResult, DriverState

&#x20; entity/       DetectionSession, DrowsinessEvent

&#x20; repository/   Spring Data JPA repositories

&#x20; vision/       FaceDetectorService, LandmarkDetectorService,

&#x20;               EyeAnalyzer (EAR), MouthAnalyzer (MAR)



src/main/resources/

&#x20; application.properties

&#x20; static/       index.html, css/style.css, js/app.js   (dashboard)



models/         OpenCV model files (downloaded, see Setup)

sql/schema.sql  Optional manual database script

```



\## Setup



\### Requirements



\- JDK 17 or higher

\- Maven (or use Eclipse / IntelliJ)

\- MySQL 8 running locally

\- A webcam



\### 1. Clone



```

git clone https://github.com/<LokeshLoki14>/driver-drowsiness-detection.git

cd driver-drowsiness-detection

```



\### 2. Download the model files



The landmark model is about 54 MB, so it is not stored in this repository.



On Windows, run this from the project root:



```

download-models.bat

```



Or download them manually into a `models` folder in the project root:



\- `haarcascade\_frontalface\_default.xml`

&#x20; https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade\_frontalface\_default.xml

\- `lbfmodel.yaml`

&#x20; https://raw.githubusercontent.com/kurnianggoro/GSOC2017/master/data/lbfmodel.yaml



\### 3. Configure the database



The app creates `drowsiness\_db` and its tables automatically. Provide your MySQL credentials as environment variables:



```

set DB\_USERNAME=your_name

set DB\_PASSWORD=your_password

```



(Linux / macOS: use `export` instead of `set`.)



\### 4. Run



```

mvn spring-boot:run

```



Or in Eclipse: right-click `DrowsinessApplication.java` -> Run As -> Java Application.



Open http://localhost:8081 



Close other apps that use the webcam before starting. The first Maven build downloads the OpenCV native libraries, so it can take several minutes.



\## Usage



1\. Open the dashboard and click \*\*Start detection\*\*.

2\. Close your eyes for 1 to 2 seconds to trigger an \*\*Eye closure\*\* alert.

3\. Open your mouth wide for 1 to 2 seconds to trigger a \*\*Yawning\*\* alert.

4\. Do both together to trigger a \*\*Drowsiness\*\* alert.

5\. Open the \*\*History\*\* page to see saved events, filters and analytics.

6\. Click \*\*Stop detection\*\* when finished.



\## Configuration



Set in `src/main/resources/application.properties`:



| Property | Default | Meaning |

|---|---|---|

| `detection.ear-threshold` | 0.25 | EAR below this means eyes closed |

| `detection.mar-threshold` | 0.70 | MAR above this means yawning |

| `detection.frame-threshold` | 18 | Consecutive frames needed to trigger an alert |

| `detection.camera-index` | 0 | Webcam index |

| `server.port` | 8081 | Web server port |



Thresholds may need tuning for your camera, lighting and face.



\## REST API



| Method | Endpoint | Description |

|---|---|---|

| POST | `/api/detection/start` | Start camera and detection |

| POST | `/api/detection/stop` | Stop detection |

| GET | `/api/status` | State, EAR, MAR, frame counters and thresholds |

| GET | `/api/video/stream` | Live MJPEG video |

| GET | `/api/events` | Saved drowsiness events (newest first) |



\## Database



| Table | Columns |

|---|---|

| `detection\_session` | id, started\_at, ended\_at |

| `drowsiness\_event` | id, session\_id, event\_type, ear\_value, mar\_value, detected\_at |



`event\_type` is one of `EYE\_CLOSURE`, `YAWNING` or `DROWSINESS`.



\## Tests



```

mvn test

```



\## Troubleshooting



| Problem | Fix |

|---|---|

| `Face model not found` | Run `download-models.bat` and check the `models/` folder |

| `Public Key Retrieval is not allowed` | Keep `allowPublicKeyRetrieval=true` in the datasource URL |

| Black camera image | Close other apps using the webcam, then restart |

| Dashboard shows no styling | Hard refresh with Ctrl+F5, or clean and restart the project |

| Yawn not detected | Lower `detection.mar-threshold` slightly |



\## Limitations



\- OpenCV reads the webcam on the machine running the server, so run the application locally.

\- Landmarks come from OpenCV's LBF model, which is less precise than Dlib, so thresholds may need tuning.

\- Detection is affected by low light, sunglasses, partial face coverage and camera angle.

\- The CNN eye/mouth classifiers from the original Python project are not included. This version uses EAR and MAR only.



\## Future improvements



\- Save a snapshot image for every alert

\- Login and per-driver reports

\- Adjustable thresholds from the dashboard

\- Deployment with a remote camera stream



\## Acknowledgements



Based on the Eye Aspect Ratio method of Soukupova and Cech, "Real-Time Eye Blink Detection using Facial Landmarks".

#   D r i v e r - D r o w s i n e s s - D e t e c t i o n  
 