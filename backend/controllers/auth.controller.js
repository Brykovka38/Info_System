const jwt = require("jsonwebtoken");
const pool = require("../db");
const { comparePassword } = require("../utils/auth.util");

const loginUser = async (req, res) => {
  const { login, password } = req.body;

  try {
    if (!login || !password) {
      return res.status(400).json({ error: "Введите логин и пароль" });
    }

    const result = await pool.query(
      `
      SELECT 
        id,
        login,
        full_name,
        role,
        phone,
        password_hash,
        must_change_password,
        status
      FROM users
      WHERE login = $1
      LIMIT 1
      `,
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const user = result.rows[0];

    if (user.status !== "active") {
      return res.status(403).json({ error: "Пользователь неактивен" });
    }

    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Неверный логин или пароль" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      message: "Вход выполнен",
      token,
      user: {
        id: user.id,
        login: user.login,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        must_change_password: Boolean(user.must_change_password),
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Ошибка входа:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = {
  loginUser,
};