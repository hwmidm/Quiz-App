# Quiz API - Node.js Backend

This is a comprehensive backend API for a quiz platform, built with Node.js, Express, and MongoDB (Mongoose). It provides full authentication, question management, quiz functionality, and result tracking.

## ✨ Key Features

* **Authentication & Authorization:** Secure user management with JWT, including sign-up, login, password reset, and role-based access control (User/Admin).
* **Question Management:** CRUD operations for questions (admin-only), and random question retrieval for quizzes.
* **Quiz System:** Start quizzes, submit answers, calculate scores, store detailed results, and view user quiz history.
* **Security & Error Handling:** Centralized error handling, NoSQL Injection prevention, XSS sanitization, rate limiting, and secure HTTP headers (Helmet).

## 🚀 Technologies Used

* **Node.js & Express.js:** Backend runtime and web framework.
* **MongoDB & Mongoose:** Database and ODM.
* **Authentication:** `jsonwebtoken` (JWT), `bcryptjs`.
* **Emailing:** `nodemailer`.
* **Security:** `helmet`, `express-rate-limit`, `express-mongo-sanitize`, `dompurify`, `jsdom`.

## 🌐 API Endpoints

Here are some key API routes. Use tools like Postman for testing.

**Authentication:**
* `POST /api/users/signup`
* `POST /api/users/login`
* `POST /api/users/forgotPassword`
* `PATCH /api/users/resetPassword/:token`
* `PATCH /api/users/updatePassword`
* `PATCH /api/users/updateMe`
* `PATCH /api/users/deleteMe`

**Questions:**
* `GET /api/questions`
* `POST /api/questions` (Admin only)
* `GET /api/questions/random`
* `GET /api/questions/:id`
* `PATCH /api/questions/:id` (Admin only)
* `DELETE /api/questions/:id` (Admin only)

**Quiz:**
* `GET /api/questions/createQuiz`
* `POST /api/questions/submitQuiz`
* `GET /api/users/myQuizResults`

## 🛠️ Setup & Run Locally

1.  **Clone:** `git clone https://github.com/hwm1dm/Quiz-App.git && cd Quiz-App`
2.  **Install:** `npm install`
3.  **Config:** Create a `.env` file in the root with `PORT`, `LocalDatabase`, `JWT_SECRET`, `JWT_EXPIRE`, `JWT_COOKIE_EXPIRES_IN`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USERNAME`, `EMAIL_PASSWORD`. (See full `README` for example values if needed).
4.  **Run:** `npm start`
5.  **Import Sample Data (Optional):** `node dev-data/import-dev-data.js --import`

---
