# Hospital Management System

A full-stack hospital management system built with **Spring Boot** (backend) and **React** (frontend), using **MongoDB** as the database.

## Tech Stack

**Backend**
- Java 24
- Spring Boot 4.1.1
- Spring Data MongoDB
- Maven

**Frontend**
- React (via Vite)
- JavaScript

**Database**
- MongoDB Community Server 8.3

## Project Structure

```
HOSPITAL MANAGEMENT SYSTEM (SPRINGBOOT)/
├── project/                  # Spring Boot backend
│   ├── src/main/java/hospitalmgt/project/
│   │   ├── Patient.java
│   │   ├── PatientRepository.java
│   │   ├── PatientController.java
│   │   ├── Doctor.java
│   │   ├── DoctorRepository.java
│   │   ├── DoctorController.java
│   │   └── ProjectApplication.java
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── pom.xml
│   └── hospital-frontend/    # React frontend
│       ├── src/
│       ├── package.json
│       └── vite.config.js
└── README.md
```

## Features

- **Patients** — create, view, and delete patient records (name, age, gender, diagnosis)
- **Doctors** — create, view, and delete doctor records (name, specialization, phone number)
- REST API backend with a React-based admin frontend

## Getting Started

### Prerequisites

- [Java 17+](https://www.oracle.com/java/technologies/downloads/)
- [Maven](https://maven.apache.org/download.cgi)
- [Node.js](https://nodejs.org/)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community)

### 1. Start MongoDB

Make sure the MongoDB service is running locally on the default port:

```
mongodb://localhost:27017
```

On Windows, this typically runs automatically as a service once installed. You can verify with:

```bash
mongosh
```

### 2. Run the Backend (Spring Boot)

```bash
cd project
mvn spring-boot:run
```

The backend will start on **http://localhost:8080**.

Configuration (database name, etc.) can be found in:
```
project/src/main/resources/application.properties
```

### 3. Run the Frontend (React)

```bash
cd project/hospital-frontend
npm install
npm run dev
```

The frontend will start on **http://localhost:5173** (default Vite port).

## API Endpoints

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients` | Get all patients |
| GET | `/patients/{id}` | Get a patient by ID |
| POST | `/patients` | Add a new patient |
| DELETE | `/patients/{id}` | Delete a patient |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/doctors` | Get all doctors |
| GET | `/doctors/{id}` | Get a doctor by ID |
| POST | `/doctors` | Add a new doctor |
| DELETE | `/doctors/{id}` | Delete a doctor |

### Example: Add a Patient

```bash
curl -X POST http://localhost:8080/patients \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "age": 34, "gender": "Male", "diagnosis": "Malaria"}'
```

## Roadmap

- [ ] Link patients to doctors
- [ ] Add appointments/scheduling
- [ ] Add input validation
- [ ] Add authentication/login
- [ ] Build out React admin pages (Patients, Doctors, navigation)

## License

This project is for educational purposes.