const pool = require("../db");

const getSchools = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    if (currentUser.role === "teacher") {
      const result = await pool.query(
        `
        SELECT DISTINCT
          s.id,
          s.name,
          s.full_name,
          s.address
        FROM schools s
        JOIN groups g ON g.school_id = s.id
        WHERE g.teacher_id = $1
        ORDER BY s.name
        `,
        [currentUser.id]
      );

      return res.json(result.rows);
    }

    if (currentUser.role === "parent") {
      const result = await pool.query(
        `
        SELECT DISTINCT
          s.id,
          s.name,
          s.full_name,
          s.address
        FROM schools s

        LEFT JOIN students st
          ON st.school_id = s.id

        LEFT JOIN parent_student ps_school
          ON ps_school.student_id = st.user_id
         AND ps_school.parent_id = $1

        LEFT JOIN groups g
          ON g.school_id = s.id

        LEFT JOIN student_group_course sgc
          ON sgc.group_id = g.id
         AND sgc.status = 'активен'

        LEFT JOIN parent_student ps_group
          ON ps_group.student_id = sgc.student_id
         AND ps_group.parent_id = $1

        WHERE ps_school.parent_id IS NOT NULL
           OR ps_group.parent_id IS NOT NULL

        ORDER BY s.name
        `,
        [currentUser.id]
      );

      return res.json(result.rows);
    }

    if (currentUser.role !== "admin") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const result = await pool.query(`
      SELECT
        id,
        name,
        full_name,
        address
      FROM schools
      ORDER BY name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении школ:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const createSchool = async (req, res) => {
  if (req.user?.role !== "admin" && req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { name, full_name, address } = req.body;

  try {
    const shortName = name?.trim();
    const fullName = full_name?.trim();
    const schoolAddress = address?.trim();

    if (!shortName) {
      return res.status(400).json({ error: "Введите сокращённое название школы" });
    }

    const duplicateCheck = await pool.query(
      `
      SELECT id
      FROM schools
      WHERE LOWER(name) = LOWER($1)
        OR (full_name IS NOT NULL AND LOWER(full_name) = LOWER($2))
      `,
      [shortName, fullName]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        error: "Такая школа уже существует",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO schools (name, full_name, address)
      VALUES ($1, $2, $3)
      RETURNING id, name, full_name, address
      `,
      [shortName, fullName || null, schoolAddress || null]
    );

    res.status(201).json({
      message: "Школа добавлена",
      school: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка при добавлении школы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const updateSchool = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const id = Number(req.params.id);
  const { name, full_name, address } = req.body;

  try {
    const shortName = name?.trim();
    const fullName = full_name?.trim();
    const schoolAddress = address?.trim();

    if (!shortName) {
      return res.status(400).json({ error: "Введите сокращённое название школы" });
    }

    const duplicateCheck = await pool.query(
      `
      SELECT id
      FROM schools
      WHERE LOWER(name) = LOWER($1)
        AND id <> $2
      `,
      [shortName, id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        error: "Школа с таким сокращённым названием уже существует",
      });
    }

    const result = await pool.query(
      `
      UPDATE schools
      SET name = $1,
          full_name = $2,
          address = $3
      WHERE id = $4
      RETURNING id, name, full_name, address
      `,
      [shortName, fullName || null, schoolAddress || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Школа не найдена" });
    }

    res.json({
      message: "Школа обновлена",
      school: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка при обновлении школы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const deleteSchool = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const id = Number(req.params.id);

  try {
    const studentsUsage = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM students
      WHERE school_id = $1
      `,
      [id]
    );

    const groupsUsage = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM groups
      WHERE school_id = $1
      `,
      [id]
    );

    const studentsCount = studentsUsage.rows[0].count;
    const groupsCount = groupsUsage.rows[0].count;

    if (studentsCount > 0 || groupsCount > 0) {
      return res.status(400).json({
        error:
          "Нельзя удалить школу, потому что она используется в группах или у студентов",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM schools
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Школа не найдена" });
    }

    res.json({ message: "Школа удалена" });
  } catch (error) {
    console.error("Ошибка при удалении школы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const getAllSchoolsForStudentEdit = async (req, res) => {
  try {
    if (req.user?.role !== "admin" && req.user?.role !== "teacher") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const result = await pool.query(`
      SELECT
        id,
        name,
        full_name,
        address
      FROM schools
      ORDER BY name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении школ для редактирования ученика:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getAllSchoolsForStudentEdit,
};