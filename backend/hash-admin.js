const bcrypt = require("bcrypt");
const pool = require("./db");

async function hashAdmin() {
  try {
    const login = "admin1";
    const plainPassword = "admin123";

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const result = await pool.query(
      `
      UPDATE users
      SET password_hash = $1,
          must_change_password = TRUE
      WHERE login = $2
      RETURNING id, login, full_name, must_change_password
      `,
      [passwordHash, login]
    );

    if (result.rows.length === 0) {
      console.log("Пользователь не найден");
    } else {
      console.log("Пароль обновлён:");
      console.log(result.rows[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error("Ошибка при обновлении пароля:", error);
    process.exit(1);
  }
}

hashAdmin();