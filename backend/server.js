require("dotenv").config();
const express = require("express");
const cors = require("cors");

const teachersRoutes = require("./routes/teachers.routes");
const studentsRoutes = require("./routes/students.routes");
const parentsRoutes = require("./routes/parents.routes");
const groupsRoutes = require("./routes/groups.routes");
const usersRoutes = require("./routes/users.routes");
const schoolsRoutes = require("./routes/schools.routes");
const coursesRoutes = require("./routes/courses.routes");
const authRoutes = require("./routes/auth.routes");
const paymentsRoutes = require("./routes/payments.routes");
const recordBooksRoutes = require("./routes/recordBooks.routes");
const historyRoutes = require("./routes/history.routes");

const app = express();
const PORT = 3001;

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

app.use("/teachers", teachersRoutes);
app.use("/students", studentsRoutes);
app.use("/parents", parentsRoutes);
app.use("/groups", groupsRoutes);
app.use("/users", usersRoutes);
app.use("/schools", schoolsRoutes);
app.use("/courses", coursesRoutes);
app.use("/auth", authRoutes);
app.use("/payments", paymentsRoutes);
app.use("/record-books", recordBooksRoutes);
app.use("/history", historyRoutes);

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});