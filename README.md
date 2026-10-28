# \# MediCore Hospital Management System

# 

# MediCore is a full-stack hospital management system with role-based access for administrators, doctors, patients, receptionists and laboratory staff. It covers the whole patient journey: signup and verification, appointments, wards, laboratory, pharmacy, billing with HMO cover, and records.

# 

# \*\*Live demo\*\*

# \- Frontend: https://medicore-hms151.netlify.app

# \- Backend API: https://medicore-backend-8ta5.onrender.com (health check: `/health`)

# 

# > The backend runs on a free hosting tier, so the first request after a period of inactivity can take up to a minute to respond.

# 

# \*\*Author:\*\* \[Tijani Aliyy Opeyemi] | \[MMS / NIIT]

# \*\*Contact:\*\* \[opeyemialabi2004@gmail.com] | GitHub: \[https://github.com/Itinerant151/hospital-management-system]

# 

# \---

# nb

# \## Tech stack

# 

# | Layer | Technology |

# |---|---|

# | Backend | Java 24, Spring Boot 4.1.1, Spring Security, JWT, Maven |

# | Database | MongoDB (MongoDB Atlas in production) |

# | Frontend | React with Vite, Axios, plain CSS (light and dark theme) |

# | Email | Brevo (email over HTTPS) |

# | Sign-in | Email or username with password, and Sign in with Google |

# | Hosting | Render (Docker) for the backend, Netlify for the frontend |

# 

# \## Roles

# 

# | Role | What they can do |

# |---|---|

# | Admin | Manages users, approves staff accounts, verifies licences, views all records, runs backups |

# | Doctor | Manages assigned patients, appointments, diagnoses, prescriptions and laboratory orders |

# | Patient | Views and updates their own records, books appointments, pays bills, views lab results and prescriptions |

# | Receptionist | Checks patients, visitors and staff in and out, registers emergency patients, handles front-desk billing |

# | Laboratory staff | Manages the test catalogue, enters results and issues printable lab reports |

# 

# \## Features

# 

# \### Accounts and security

# \- Signup with a 6-digit email verification code that expires. Login is blocked until the email is verified.

# \- Login with email or username, or with Google.

# \- JWT authentication with role-based access on every endpoint.

# \- Staff accounts (receptionists, doctors, lab staff) need administrator approval.

# \- Licence validation for doctors and laboratory staff: licensing body, licence number and expiry date are collected at signup and checked by an administrator.

# \- Name validation (letters only) and field-level error messages on forms.

# \- Change password, forgot password, and editable username.

# 

# \### Patients and records

# \- Patient records with gender, age, doctor assignment, medical history, allergies and next of kin.

# \- Emergency patients can be registered without a login account. They receive a temporary password and must change it.

# \- Account patients and emergency patients share one patient model, so every view stays synchronised.

# \- Search and filter on patients and appointments.

# 

# \### Appointments and visiting doctors

# \- Appointment status workflow with colour-coded badges. Appointments are marked Completed automatically once their time passes.

# \- Visiting doctors with a weekly schedule, booking only inside that schedule, front-desk check-in, consultation-fee billing and hospital share of earnings.

# 

# \### Wards

# \- Wards and beds, patient admission and discharge, and transfers between beds and wards.

# 

# \### Laboratory

# \- Test catalogue, doctor-ordered tests, result entry by laboratory staff, patient and doctor result views, laboratory billing and printable lab reports.

# 

# \### Pharmacy and prescriptions

# \- Medicine inventory with editing, and prescriptions created by doctors for their own assigned patients and viewable by the patient.

# 

# \### Billing

# \- Bills in naira with payments, receipts and a Print Receipt button.

# \- HMO cover by percentage with provider, member number, covered amount, remaining balance and partial payment status.

# \- Payment reminders for outstanding bills. No real payment gateway is connected.

# 

# \### Visitors, reminders and notifications

# \- Visitor logbook recording whom each visitor is visiting, plus an admin view of who is visiting whom.

# \- Appointment and payment reminders delivered to a notifications page.

# 

# \### Dashboards, ID cards and backup

# \- Role-specific dashboards with statistics cards for each module.

# \- Printable ID cards for patients and staff.

# \- Admin JSON export, and database backup and restore with `mongodump` and `mongorestore`.

# 

# \### Interface

# \- Light and dark theme, confirmation dialogs in place of browser popups, and a Back button on every page.

# 

# \---

# 

# \## Running locally

# 

# \### Prerequisites

# \- Java 24, Maven, Node.js, and MongoDB (local or an Atlas connection string)

# 

# \### Backend

# 1\. Make sure MongoDB is running (on Windows, `net start MongoDB` from an administrator terminal).

# 2\. Set the required environment variable:

# &#x20;  ```powershell

# &#x20;  $env:JWT\_SECRET="a-long-random-string-of-at-least-32-characters"

# &#x20;  ```

# 3\. Optional variables:

# &#x20;  - `MONGODB\_URI` to use Atlas instead of local MongoDB

# &#x20;  - `BREVO\_API\_KEY` and `MAIL\_FROM` for real verification emails (without them, the code is printed in the backend console)

# &#x20;  - `CORS\_ORIGINS` and `APP\_FRONTEND\_URL` for a non-default frontend address

# 4\. Start the backend:

# &#x20;  ```

# &#x20;  mvn spring-boot:run

# &#x20;  ```

# &#x20;  It runs on http://localhost:8080.

# 

# \### Frontend

# ```

# cd hospital-frontend

# npm install

# npm run dev

# ```

# The app opens at http://localhost:5173. To point it at a deployed backend, set `VITE\_API\_URL` before running `npm run build`. For Google sign-in, add your Google client ID to `hospital-frontend/.env` and `application.properties`.

# 

# \### Backups

# Run `scripts/backup.bat` to create a `mongodump` backup. Admins can also export data as JSON from the dashboard.

# 

# \## Deployment

# \- The backend is packaged with Docker and deployed on Render, with `MONGODB\_URI`, `JWT\_SECRET`, `CORS\_ORIGINS`, `APP\_FRONTEND\_URL`, `BREVO\_API\_KEY` and `MAIL\_FROM` set as environment variables.

# \- The frontend is built with Vite and deployed on Netlify.

# \- Secrets are never committed. They are supplied through environment variables.

