# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

stracture folder and file for backend
#### backend-online-enrollment/

│
├── config/
│   ├── db.php
│   ├── cors.php
│   └── mail_config.php
│
├── uploads/
│   ├── report_cards/
│   ├── birth_certificates/
│   ├── good_moral/
│   └── profile/
│
├── admin/
│   ├── check_admin_exists.php
│   ├── send_verification_code.php
│   ├── verify_code.php
│   ├── admin_register.php
│   ├── admin_login.php
│   ├── forgot_password.php
│   ├── reset_password.php
│   ├── change_password.php
│   ├── admin_logout.php
│   │
│   ├── dashboard_summary.php
│   │
│   ├── create_staff.php
│   ├── update_staff.php
│   ├── delete_staff.php
│   ├── toggle_staff_status.php
│   ├── get_staff.php
│   │
│   ├── get_system_settings.php
│   └── update_system_settings.php
│
├── staff/
│   ├── staff_login.php
│   ├── staff_logout.php
│   │
│   ├── get_pending_enrollments.php
│   ├── get_student_details.php
│   ├── approve_enrollment.php
│   ├── reject_enrollment.php
│   │
│   ├── create_section.php
│   ├── update_section.php
│   ├── delete_section.php
│   ├── get_sections.php
│   │
│   ├── create_strand.php
│   ├── update_strand.php
│   ├── delete_strand.php
│   ├── get_strands.php
│   │
│   ├── create_subject.php
│   ├── get_subjects.php
│   ├── update_subject.php
│   ├── delete_subject.php
│   │
│   ├── generate_timetable.php
│   ├── get_timetable.php
│   └── delete_timetable.php
│
├── student/
│   ├── student_register.php
│   ├── student_login.php
│   ├── student_logout.php
│   ├── verify_email.php
│   ├── resend_verification.php
│   │
│   ├── get_student_profile.php
│   ├── update_student_profile.php
│   │
│   ├── submit_enrollment.php
│   ├── get_enrollment_status.php
│   ├── get_assigned_section.php
│   ├── get_schedule.php
│   │
│   ├── upload_profile_picture.php
│   └── delete_profile_picture.php
│
├── ocr/
│   ├── scan_report_card.php
│   ├── process_ocr.php
│   ├── assign_section.php
│   │
│   └── python/
│       ├── extract_text.py
│       └── requirements.txt
│
├── chatbot/
│   ├── chatbot.php
│   ├── send_message.php
│   │
│   └── python/
│       ├── ollama_chat.py
│       └── prompt.txt
│
├── utils/
│   ├── response.php
│   ├── validator.php
│   ├── upload_helper.php
│   └── auth.php
│
└── index.php
