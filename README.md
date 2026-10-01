# MediCore – Updated Features

## Receptionists
- Receptionists can submit an account application.
- Receptionist accounts remain blocked until an administrator approves them.
- Admin has a dedicated Receptionist Applications tab with Accept/Reject actions.

## Emergency / No-Account Patients
- Emergency patients can be registered without creating a login account.
- Each emergency patient receives a MongoDB hospital patient ID.
- Emergency records include personal, contact, blood group/Rh factor, medical history, allergies, disabilities, insurance, next-of-kin, emergency contact and clinical notes.
- Emergency patients have billing and visitation records and can be assigned to doctors.

## Shared Medical Records
- Account patients and emergency patients use the same Patient model.
- Admins and doctors can update medical information.
- Patients can update their own permitted medical information from their portal.
- Changes are saved to the same MongoDB patient document, so authorized views stay synchronized.
- Diagnosis remains a staff-controlled field.

## Billing and Demo Payments
- Account patients have a My Billing page.
- Patients can make a demo payment that generates a fake transaction ID.
- Receptionists/admins can create bills and handle front-desk demo payments.
- Emergency patient records show their billing status.

## Payment Reminders
- Outstanding bills can generate in-system payment reminders.
- Account patients see reminders in Notifications.
- Emergency-patient payment reminders are logged for staff/admin visibility.

## Existing features preserved
- Appointments, visitation, pharmacy, reminders, authentication, password reset, theme support and existing dashboard functionality remain in the project.
