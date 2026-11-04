MediCore Hospital Management System
MediCore is a full-stack hospital management system with role-based access for administrators, doctors, patients, receptionists, laboratory staff and pharmacists. It covers the whole patient journey: signup and verification, appointments, wards, laboratory, pharmacy and dispensing, billing with HMO cover, and records.
Live demo
Frontend: https://medicore-hms151.netlify.app
Backend API: https://medicore-backend-8ta5.onrender.com (health check: `/health`)
> The backend runs on a free hosting tier, so the first request after a period of inactivity can take up to a minute to respond.
Author: Tijani Aliyy Opeyemi | MMS / NIIT
Contact: opeyemialabi2004@gmail.com | GitHub: https://github.com/Itinerant151/hospital-management-system
---
Tech stack
Layer	Technology
Backend	Java 21, Spring Boot 4.1.1, Spring Security, JWT (jjwt 0.12.6), Maven
Database	MongoDB (MongoDB Atlas in production)
Frontend	React 19 with Vite 8, Axios, plain CSS (light and dark theme)
Email	Brevo (email over HTTPS)
Sign-in	Email or username with password, and Sign in with Google
Hosting	Render (Docker) for the backend, Netlify for the frontend
Dependencies
Backend (Maven)
Dependency	Purpose
spring-boot-starter-webmvc	REST controllers and the embedded web server
spring-boot-starter-security	Request filter chain, role-based access, CORS and BCrypt password hashing
spring-boot-starter-data-mongodb	MongoDB repositories and `MongoTemplate`
spring-boot-starter-mail	Mail support
jjwt-api, jjwt-impl, jjwt-jackson (0.12.6)	Creating and verifying JWTs
spring-boot-starter-webmvc-test, spring-boot-starter-data-mongodb-test	Test support (test scope)
Spring Boot's parent POM manages the versions of the Spring libraries, so only jjwt is pinned by hand.
Frontend (npm)
Package	Purpose
react, react-dom (19)	User interface
axios	HTTP requests to the API
vite, @vitejs/plugin-react	Development server and production build
eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh	Code linting
Roles
Role	What they can do
Admin	Manages users, approves staff accounts, verifies licences, manages the medicine inventory and categories, views all records, runs backups
Doctor	Manages assigned patients, appointments, diagnoses, prescriptions and laboratory orders
Patient	Views and updates their own records, books appointments, pays bills, views lab results and prescriptions
Receptionist	Checks patients, visitors and staff in and out, registers emergency patients, handles front-desk billing
Laboratory staff	Manages the test catalogue, enters results and issues printable lab reports
Pharmacist	Dispenses prescriptions and updates medicine stock levels by category. Cannot add, price or delete medicines
Features
Accounts and security
Signup with a 6-digit email verification code that expires. Login is blocked until the email is verified.
Login with email or username, or with Google.
JWT authentication with role-based access on every endpoint.
Receptionists, laboratory staff and pharmacists need administrator approval before they can log in.
Licence validation for doctors, laboratory staff and pharmacists: licensing body (for example MDCN, MLSCN or PCN), licence number and expiry date are collected at signup and checked by an administrator. Login stays blocked while a licence is pending, rejected or expired.
Audit log of key actions, including failed logins and who dispensed each prescription.
Name validation (letters only) and field-level error messages on forms.
Change password, forgot password, and editable username.
Patients and records
Patient records with gender, age, doctor assignment, medical history, allergies and next of kin.
Emergency patients can be registered without a login account. They receive a temporary password and must change it.
Account patients and emergency patients share one patient model, so every view stays synchronised.
Search and filter on patients and appointments.
Appointments and visiting doctors
Appointment status workflow with colour-coded badges. Appointments are marked Completed automatically once their time passes.
Visiting doctors with a weekly schedule, booking only inside that schedule, front-desk check-in, consultation-fee billing and hospital share of earnings.
Wards
Wards and beds, patient admission and discharge, and transfers between beds and wards.
Laboratory
Test catalogue, doctor-ordered tests, result entry by laboratory staff, patient and doctor result views, laboratory billing and printable lab reports.
Pharmacy and prescriptions
Medicine inventory managed by the admin: name, category, stock quantity, price and expiry date.
Medicine categories: Antibiotics, Anaesthetics, Analgesics, Antimalarials, Antihypertensives, Antidiabetics, Antihistamines, Antifungals, Vitamins & Supplements, IV Fluids and Others. Medicines added before categories existed show as Uncategorised until the admin assigns one.
Prescriptions are written by doctors for their own assigned patients, choosing medicines from the inventory, and are viewable by the patient.
Pharmacist stock menu: every category is listed with its number of medicines and total units. Opening a category lets the pharmacist set the amount available for each medicine. A category shows a Low stock badge when any medicine in it has fewer than 10 units, and shows nothing otherwise.
Prescription queue: Waiting and Dispensed tabs with search, oldest prescriptions first. Dispensing checks every item before anything is deducted. It is refused, with a message naming the medicine, if a medicine has expired or there is not enough stock. On success the stock is deducted and the pharmacist and time are recorded.
Medicines typed by hand by a doctor, instead of picked from the inventory, are not tracked in stock.
Pharmacist dashboard: prescriptions waiting, dispensed today and all time, medicines in stock, low stock and out of stock medicines, categories low on stock, and medicines expiring within 30 days.
Billing
Bills in naira with payments, receipts and a Print Receipt button.
HMO cover by percentage with provider, member number, covered amount, remaining balance and partial payment status.
Payment reminders for outstanding bills. No real payment gateway is connected.
Visitors, reminders and notifications
Visitor logbook recording whom each visitor is visiting, plus an admin view of who is visiting whom.
Appointment and payment reminders delivered to a notifications page.
Dashboards, ID cards and backup
Role-specific dashboards with statistics cards for each module.
Printable ID cards for patients and staff, including pharmacists.
Admin JSON export, and database backup and restore with `mongodump` and `mongorestore`.
Interface
Light and dark theme, confirmation dialogs in place of browser popups, and a Back button on every page.
---
Pharmacy API
Method	Endpoint	Who can use it
GET	`/api/medicines`	Admin, Doctor, Pharmacist
GET	`/api/medicines/categories`	Admin, Pharmacist
PUT	`/api/medicines/{id}/stock`	Admin, Pharmacist
POST, PUT, DELETE	`/api/medicines` and `/api/medicines/{id}`	Admin
GET	`/api/prescriptions`	Admin, Pharmacist
POST	`/api/prescriptions/{id}/dispense`	Admin, Pharmacist
Try the pharmacy flow
Sign up as a Pharmacist and enter the emailed code.
Log in as admin, accept the application under Staff applications, then verify the licence under Licence checks.
As admin, open Pharmacy and give each medicine a category.
As a doctor, write a prescription and pick the medicines from the inventory.
Log in as the pharmacist, open Prescriptions and press Dispense. Check Medicine stock to see the quantities drop.
---
Running locally
Prerequisites
Java 21 or newer, Maven, Node.js, and MongoDB (local or an Atlas connection string)
Backend
Make sure MongoDB is running (on Windows, `net start MongoDB` from an administrator terminal).
Set the required environment variable:
```powershell
   $env:JWT_SECRET="a-long-random-string-of-at-least-32-characters"
   ```
Optional variables:
`MONGODB_URI` to use Atlas instead of local MongoDB
`BREVO_API_KEY` and `MAIL_FROM` for real verification emails (without them, the code is printed in the backend console)
`CORS_ORIGINS` and `APP_FRONTEND_URL` for a non-default frontend address
Start the backend:
```
   mvn spring-boot:run
   ```
It runs on http://localhost:8080.
Frontend
```
cd hospital-frontend
npm install
npm run dev
```
The app opens at http://localhost:5173. To point it at a deployed backend, set `VITE_API_URL` before running `npm run build`. For Google sign-in, add your Google client ID to `hospital-frontend/.env` and `application.properties`.
Backups
Run `scripts/backup.bat` to create a `mongodump` backup. Admins can also export data as JSON from the dashboard.
Deployment
The backend is packaged with Docker and deployed on Render, with `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `APP_FRONTEND_URL`, `BREVO_API_KEY` and `MAIL_FROM` set as environment variables.
The frontend is built with Vite and deployed on Netlify.
Secrets are never committed. They are supplied through environment variables.