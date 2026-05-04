const pool = require("../db");
const { hashPassword, comparePassword } = require("../utils/auth.util");

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, role, phone, status
      FROM users
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении пользователей:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = Number(req.params.id);
    const { full_name, phone } = req.body;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const isSelf = Number(currentUser.id) === Number(userId);
    const isAdmin = currentUser.role === "admin";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    if (!full_name?.trim()) {
      return res.status(400).json({ error: "ФИО обязательно" });
    }

    if (phone && phone !== "-" && !/^\+7\d{10}$/.test(phone)) {
      return res.status(400).json({
        error: "Некорректный формат телефона. Используйте формат +7XXXXXXXXXX",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        full_name = $1,
        phone = $2
      WHERE id = $3
      RETURNING
        id,
        login,
        full_name,
        role,
        must_change_password,
        status,
        phone
      `,
      [full_name.trim(), phone || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Ошибка обновления профиля:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const updatePassword = async (req, res) => {
  try {
    const currentUser = req.user;
    const userId = Number(req.params.id);
    const { current_password, new_password } = req.body;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const isSelf = Number(currentUser.id) === Number(userId);

    if (!isSelf) {
      return res.status(403).json({ error: "Можно менять только свой пароль" });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "Новый пароль должен быть не короче 6 символов",
      });
    }

    const userResult = await pool.query(
      `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = userResult.rows[0];

    const isPasswordCorrect = await comparePassword(
      current_password,
      user.password_hash
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({ error: "Текущий пароль указан неверно" });
    }

    const newPasswordHash = await hashPassword(new_password);

    await pool.query(
      `
      UPDATE users
      SET
        password_hash = $1,
        must_change_password = FALSE
      WHERE id = $2
      `,
      [newPasswordHash, userId]
    );

    res.json({ message: "Пароль успешно изменён" });
  } catch (error) {
    console.error("Ошибка изменения пароля:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const changeTemporaryPassword = async (req, res) => {
  const userId = Number(req.params.id);
  const { current_password, new_password } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Некорректный id пользователя" });
  }

  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Заполните текущий и новый пароль" });
  }

  if (String(new_password).length < 6) {
    return res.status(400).json({
      error: "Новый пароль должен быть не короче 6 символов",
    });
  }

  if (Number(req.user.id) !== Number(req.params.id)) {
    return res.status(403).json({ error: "Нельзя изменить чужой пароль" });
  }

  try {
    const userResult = await pool.query(
      `
      SELECT id, password_hash, must_change_password
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    const user = userResult.rows[0];

    const isCurrentPasswordCorrect = await comparePassword(
      current_password,
      user.password_hash
    );

    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({
        error: "Текущий пароль указан неверно",
      });
    }

    const newPasswordHash = await hashPassword(new_password);

    const result = await pool.query(
      `
      UPDATE users
      SET 
        password_hash = $1,
        must_change_password = false
      WHERE id = $2
      RETURNING 
        id,
        login,
        full_name,
        role,
        phone,
        must_change_password,
        status
      `,
      [newPasswordHash, userId]
    );

    res.json({
      message: "Пароль успешно изменён",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка при смене временного пароля:", error);
    res.status(500).json({ error: "Не удалось изменить пароль" });
  }
};

module.exports = {
  getUsers,
  updateProfile,
  updatePassword,
  changeTemporaryPassword,
};