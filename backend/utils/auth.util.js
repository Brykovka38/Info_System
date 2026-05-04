const bcrypt = require("bcrypt");

const translitMap = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const transliterate = (text = "") => {
  return text
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] ?? char)
    .join("")
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim();
};

const generateLoginFromFullName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0) {
    return `user${Date.now()}`;
  }

  const lastName = transliterate(parts[0] || "");
  const firstName = transliterate(parts[1] || "");
  const middleName = transliterate(parts[2] || "");

  let baseLogin = lastName;

  if (firstName) {
    baseLogin += firstName[0];
  }

  if (middleName) {
    baseLogin += middleName[0];
  }

  baseLogin = baseLogin.replace(/\s+/g, "");

  if (!baseLogin) {
    baseLogin = `user${Date.now()}`;
  }

  return baseLogin;
};

const generateTemporaryPassword = (length = 10) => {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  return password;
};

const hashPassword = async (plainPassword) => {
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
};

const comparePassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash);
};

const buildUniqueLogin = async (pool, fullName) => {
  const baseLogin = generateLoginFromFullName(fullName);
  let login = baseLogin;
  let counter = 1;

  while (true) {
    const result = await pool.query(
      "SELECT id FROM users WHERE login = $1 LIMIT 1",
      [login]
    );

    if (result.rows.length === 0) {
      return login;
    }

    counter += 1;
    login = `${baseLogin}${counter}`;
  }
};

module.exports = {
  generateLoginFromFullName,
  generateTemporaryPassword,
  hashPassword,
  comparePassword,
  buildUniqueLogin,
};