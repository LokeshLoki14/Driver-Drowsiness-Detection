# 🚗 Real-Time Driver Drowsiness Detection and Alert System

A Java Full Stack application designed to monitor driver alertness using computer vision. The system analyzes facial features, including eye closure and mouth opening, to identify potential signs of drowsiness and generate alerts through an interactive dashboard.

## 📌 Project Overview

Driver fatigue can reduce concentration and reaction time, increasing the risk of road accidents. This project aims to help identify potential drowsiness by analyzing facial features captured through a webcam.

The application combines a Java and Spring Boot backend, OpenCV-based image processing, a MySQL database, and a web dashboard to provide driver monitoring and detection history.

## ✨ Features

* **Real-Time Camera Monitoring:** Capture webcam frames for driver monitoring.
* **Face Detection:** Identify the driver's face using an OpenCV Haar Cascade model.
* **Facial Landmark Detection:** Locate important facial points for eye and mouth analysis.
* **Eye Closure Detection:** Use the Eye Aspect Ratio (EAR) to analyze eye closure.
* **Yawning Detection:** Use the Mouth Aspect Ratio (MAR) to analyze mouth opening.
* **Drowsiness Alerts:** Generate visual and audible warnings when configured detection conditions are met.
* **Interactive Dashboard:** Display monitoring status, camera status, detection metrics, and event statistics.
* **Detection History:** View previously recorded drowsiness events.
* **Database Integration:** Store detection sessions and events in MySQL.
* **Unit Testing:** Test the drowsiness detection logic using JUnit.

> **Note:** This is a driver-assistance prototype, not a replacement for safe driving practices or certified vehicle safety systems.

## 🛠️ Technologies Used

| Technology            | Purpose                                 |
| --------------------- | --------------------------------------- |
| Java 21               | Backend programming                     |
| Spring Boot 3.4.5     | Backend application and REST APIs       |
| Spring Web            | HTTP endpoints and web integration      |
| Spring Data JPA       | Database persistence                    |
| MySQL                 | Store detection events and sessions     |
| Java OpenCV           | Image processing and computer vision    |
| HTML, CSS, JavaScript | Web dashboard and browser interactions  |
| Maven                 | Dependency management and project build |
| JUnit                 | Unit testing                            |
| Postman               | REST API testing                        |

The frontend technology should match the implementation included in this repository. If the dashboard uses a separate React application, include React.js in the frontend stack and document its build process.

## 🏗️ System Architecture

```text
                 Webcam
                    |
                    v
             Java + OpenCV
                    |
                    v
              Face Detection
                    |
                    v
        Facial Landmark Detection
                    |
             +------+------+
             |             |
             v             v
        Eye Analysis   Mouth Analysis
             |             |
             v             v
            EAR           MAR
             |             |
             +------+------+
                    |
                    v
         Drowsiness Detection
                    |
                    v
             Alert Service
                    |
                    v
           Spring Boot APIs
                    |
             +------+------+
             |             |
             v             v
           MySQL       Web Dashboard
```

## ⚙️ How It Works

1. The webcam captures video frames of the driver.
2. OpenCV processes the frames and detects the driver's face.
3. A facial landmark model identifies key points around the eyes and mouth.
4. The application calculates the Eye Aspect Ratio (EAR) and Mouth Aspect Ratio (MAR).
5. The detection logic evaluates these values against configured thresholds and frame-count conditions.
6. When a configured drowsiness condition is detected, the application generates an alert.
7. The backend records detection events and sessions in MySQL when the corresponding persistence functionality is enabled.
8. The dashboard displays the monitoring state and available detection information.

## 📁 Project Structure

```text
driver-drowsiness-detection/
├── pom.xml
├── README.md
├── .gitignore
├── download-models.bat
├── models/
│   ├── haarcascade_frontalface_default.xml
│   └── lbfmodel.yaml
├── sql/
│   └── schema.sql
├── docs/
└── src/
    ├── main/
    │   ├── java/com/drowsiness/
    │   │   ├── DrowsinessApplication.java
    │   │   ├── config/
    │   │   ├── camera/
    │   │   ├── vision/
    │   │   ├── detection/
    │   │   ├── alert/
    │   │   ├── controller/
    │   │   ├── entity/
    │   │   └── repository/
    │   └── resources/
    │       ├── application.properties
    │       └── static/
    └── test/
        └── java/com/drowsiness/
```

The exact files may vary depending on the current project version.

## 📋 Prerequisites

Install the following software before running the project:

* Java Development Kit (JDK) 21
* Eclipse IDE with Maven support
* MySQL Server
* Git (optional, for version control)
* Postman (optional, for API testing)

## 🚀 Getting Started

### 1. Download or Clone the Repository

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/driver-drowsiness-detection.git
```

Move into the project directory:

```bash
cd driver-drowsiness-detection
```

Replace `YOUR_USERNAME` with your GitHub username.

Alternatively, download the repository as a ZIP file and extract it.

### 2. Download the OpenCV Model Files

The project requires two model files.

**Face detection model**

Download:

https://raw.githubusercontent.com/opencv/opencv/4.x/data/haarcascades/haarcascade_frontalface_default.xml

Save it as:

```text
models/haarcascade_frontalface_default.xml
```

**Facial landmark model**

Download:

https://raw.githubusercontent.com/kurnianggoro/GSOC2017/master/data/lbfmodel.yaml

Save it as:

```text
models/lbfmodel.yaml
```

The landmark model is a large file. Download the actual file rather than creating an empty YAML file or copying only part of its contents.

Confirm that the model paths in `application.properties` match the locations expected by the Java implementation.

### 3. Configure MySQL

Start MySQL Server and create the database:

```sql
CREATE DATABASE drowsiness_db;
```

Open:

```text
src/main/resources/application.properties
```

Configure the database connection using your own local MySQL credentials.

Example:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/drowsiness_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

Set `DB_PASSWORD` to your local MySQL password before starting the application. Do not publish database credentials in a public repository.

If the project uses a different database configuration, retain the settings required by your current implementation.

### 4. Import the Project into Eclipse

1. Open Eclipse IDE.
2. Select **File → Import**.
3. Select **Maven → Existing Maven Projects**.
4. Browse to the directory containing `pom.xml`.
5. Select the project and click **Finish**.
6. Allow Maven to download the dependencies.

After importing, right-click the project and select:

**Maven → Update Project → OK**

### 5. Run the Application

Locate:

```text
src/main/java/com/drowsiness/DrowsinessApplication.java
```

Right-click the file and choose:

**Run As → Java Application**

Alternatively, use **Run As → Spring Boot App** if available.

Check the Eclipse Console for a successful startup message.

Open the application using the port configured in `application.properties`. For example:

```text
http://localhost:8081
```

Use `8080` instead if that is the configured server port.

## 🧪 Testing

The project includes unit tests for the detection logic.

To run tests in Eclipse:

1. Open `src/test/java`.
2. Locate the relevant test class.
3. Right-click the test class.
4. Select **Run As → JUnit Test**.

Verify the following scenarios where implemented:

* Normal eye and mouth measurements
* Prolonged eye closure
* Yawning detection
* Resetting counters after a normal blink
* Face not detected
* Camera unavailable
* Database connection failure
* REST API errors

Postman can also be used to test the REST endpoints defined by the project's controllers.

## 🔧 Configuration

Detection parameters are configured through `application.properties`.

Example:

```properties
detection.camera-index=0
detection.ear-threshold=0.25
detection.mar-threshold=0.80
detection.frame-threshold=18
detection.face-model-path=models/haarcascade_frontalface_default.xml
detection.landmark-model-path=models/lbfmodel.yaml
```

These are example project settings. Adjust thresholds and model paths according to the actual implementation and test results.

## 🔮 Future Enhancements

* Improve detection accuracy under different lighting conditions.
* Add additional alert mechanisms.
* Improve robustness when glasses or other obstructions are present.
* Add configurable detection thresholds through the dashboard.
* Enhance event reporting and monitoring analytics.
* Optimize computer vision performance for real-time processing.
* Explore secure cloud-based event reporting.

## 👨‍💻 Developer

**Lokesh R**
Computer Science and Engineering

GitHub: https://github.com/LokeshLoki14

LinkedIn: Add your LinkedIn profile URL here.

## 📄 License

Choose and add an appropriate open-source license before distributing the project publicly. Check the licenses and attribution requirements of any third-party model files and libraries included with the application.
