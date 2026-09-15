Hospital Management System
Description
Managing patient and doctor records in a hospital often relies on scattered paperwork or disconnected spreadsheets, making it slow to look up, update, or share information. This project solves that by providing a centralized system where patient and doctor records can be created, viewed, and managed through a simple web interface backed by a real database — making hospital record-keeping faster, more organized, and easier to maintain.
Features
Add, view, and delete patient records (name, age, gender, diagnosis)
Add, view, and delete doctor records (name, specialization, phone number)
REST API backend serving data to a React-based admin frontend
Data persisted in a MongoDB database, so records remain available across sessions
Planned features:
Linking patients to their assigned doctors
Appointment scheduling
Input validation
Authentication/login for admin access
Tech Stack
Backend: Java, Spring Boot, Spring Data MongoDB, Maven
Frontend: React (via Vite), JavaScript
Database: MongoDB
How to Run
Prerequisites
Java 17+
Maven
Node.js
MongoDB Community Server (running locally on the default port, `27017`)
1. Start the backend
```bash
cd project
mvn spring-boot:run
```
Backend runs at http://localhost:8080
2. Start the frontend
```bash
cd project/hospital-frontend
npm install
npm run dev
```
Frontend runs at http://localhost:5173
3. Try it out
   Visit `http://localhost:8080/patients` or `http://localhost:8080/doctors` in your browser to see the raw API data, or use the React frontend at `http://localhost:5173` once built out.
   Author
   Tijani Aliyy Opeyemi
   Contact: opeyemialabi2004@gmail.com