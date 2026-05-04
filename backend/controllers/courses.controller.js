const pool = require("../db");

const getCourses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, level, course_number
      FROM courses
      ORDER BY level, course_number
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении курсов:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = {
  getCourses,
};