const pool = require("../db");

const {
  buildUniqueLogin,
  generateTemporaryPassword,
  hashPassword,
} = require("../utils/auth.util");

const getParents = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const params = [];
    let teacherFilter = "";

    if (currentUser.role === "teacher") {
      params.push(currentUser.id);

      teacherFilter = `
        AND EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          JOIN student_group_course sgc_filter
            ON sgc_filter.student_id = ps_filter.student_id
          JOIN groups g_filter
            ON g_filter.id = sgc_filter.group_id
          WHERE ps_filter.parent_id = u.id
            AND sgc_filter.status = 'активен'
            AND g_filter.teacher_id = $1
        )
      `;
    } else if (currentUser.role !== "admin") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.phone,
        u.status,

        BOOL_OR(ps.benefit) FILTER (WHERE ps.id IS NOT NULL) AS benefit,

        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'student_id', s.user_id,
              'student_name', su.full_name,
              'group_id', g.id,
              'group_name', COALESCE(
                sc.name || '-' || EXTRACT(HOUR FROM gs.start_time)::TEXT,
                '—'
              ),
              'relation_type', ps.relation_type,
              'benefit', ps.benefit
            )
          ) FILTER (WHERE s.user_id IS NOT NULL),
          '[]'
        ) AS children_groups_list

      FROM users u
      LEFT JOIN parent_student ps
        ON ps.parent_id = u.id
      LEFT JOIN students s
        ON s.user_id = ps.student_id
      LEFT JOIN users su
        ON su.id = s.user_id
      LEFT JOIN student_group_course sgc
        ON sgc.student_id = s.user_id
        AND sgc.status = 'активен'
      LEFT JOIN groups g
        ON g.id = sgc.group_id
      LEFT JOIN schools sc
        ON sc.id = g.school_id
      LEFT JOIN group_schedule gs
        ON gs.group_id = g.id

      WHERE u.role = 'parent'
      ${teacherFilter}

      GROUP BY u.id, u.full_name, u.phone, u.status
      ORDER BY u.full_name ASC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении родителей:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const deleteParent = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const id = req.params.id;

  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "Родитель удалён" });
  } catch (error) {
    console.error("Ошибка удаления родителя:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const createParent = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { full_name, phone, links } = req.body;

  const client = await pool.connect();

  try {
    if (!full_name) {
      return res.status(400).json({ error: "ФИО обязательно" });
    }

    await client.query("BEGIN");

    const login = await buildUniqueLogin(pool, full_name, "parent");
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const parentResult = await client.query(
      `
      INSERT INTO users (login, full_name, phone, role, password_hash, must_change_password, status)
      VALUES ($1, $2, $3, 'parent', $4, TRUE, 'active')
      RETURNING id, login, full_name, phone, status, must_change_password
      `,
      [login, full_name, phone || "-", passwordHash]
    );

    const parentId = parentResult.rows[0].id;

    if (Array.isArray(links) && links.length > 0) {
      for (const link of links) {
        if (!link.student_id || !link.relation_type) continue;

        await client.query(
          `
          INSERT INTO parent_student (parent_id, student_id, relation_type, benefit)
          VALUES ($1, $2, $3, FALSE)
          `,
          [parentId, link.student_id, link.relation_type]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Родитель добавлен",
      parent: parentResult.rows[0],
      credentials: {
        full_name,
        role: "parent",
        login,
        temporary_password: temporaryPassword,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при добавлении родителя:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

const updateParent = async (req, res) => {
  if (req.user?.role !== "admin" && req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const id = req.params.id;
  const { full_name, phone, status } = req.body;

  try {
    if (!full_name || !status) {
      return res.status(400).json({ error: "Не все обязательные поля заполнены" });
    }

    if (req.user.role === "teacher") {
      const belongsToTeacher = await isTeacherParent(pool, req.user.id, id);

      if (!belongsToTeacher) {
        return res.status(403).json({
          error: "Вы можете редактировать только родителей своих учеников",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE users
      SET full_name = $1,
          phone = $2,
          status = $3
      WHERE id = $4 AND role = 'parent'
      RETURNING id, full_name, phone, status
      `,
      [full_name, phone || "-", status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Родитель не найден" });
    }

    res.json({
      message: "Родитель обновлён",
      parent: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка при обновлении родителя:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const updateParentStudentLink = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { parentId, studentId } = req.params;
  const { relation_type, benefit } = req.body;

  try {
    const result = await pool.query(
      `
      UPDATE parent_student
      SET relation_type = $1,
          benefit = $2
      WHERE parent_id = $3 AND student_id = $4
      RETURNING id, parent_id, student_id, relation_type, benefit
      `,
      [relation_type, benefit, parentId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Связь родителя с учеником не найдена" });
    }

    res.json({
      message: "Связь обновлена",
      link: result.rows[0],
    });
  } catch (error) {
    console.error("Ошибка при обновлении связи родитель-ученик:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const removeStudentFromParent = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { parentId, studentId } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM parent_student
      WHERE parent_id = $1 AND student_id = $2
      RETURNING id
      `,
      [parentId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Связь родителя с ребёнком не найдена" });
    }

    res.json({ message: "Связь удалена" });
  } catch (error) {
    console.error("Ошибка при удалении связи родитель-ребёнок:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const addStudentToParent = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { parentId } = req.params;
  const { student_id, relation_type } = req.body;

  try {
    if (!student_id || !relation_type) {
      return res.status(400).json({ error: "Не выбран ребёнок или тип связи" });
    }

    const existingLink = await pool.query(
      `
      SELECT id
      FROM parent_student
      WHERE student_id = $1
      `,
      [student_id]
    );

    if (existingLink.rows.length > 0) {
      return res.status(400).json({ error: "У этого ребёнка уже есть родитель" });
    }

    await pool.query(
      `
      INSERT INTO parent_student (parent_id, student_id, relation_type, benefit)
      VALUES ($1, $2, $3, FALSE)
      `,
      [parentId, student_id, relation_type]
    );

    res.json({ message: "Ребёнок добавлен родителю" });
  } catch (error) {
    console.error("Ошибка при добавлении ребёнка родителю:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const isTeacherParent = async (poolOrClient, teacherUserId, parentId) => {
  const result = await poolOrClient.query(
    `
    SELECT 1
    FROM parent_student ps
    JOIN student_group_course sgc
      ON sgc.student_id = ps.student_id
    JOIN groups g
      ON g.id = sgc.group_id
    WHERE ps.parent_id = $1
      AND sgc.status = 'активен'
      AND g.teacher_id = $2
    LIMIT 1
    `,
    [parentId, teacherUserId]
  );

  return result.rows.length > 0;
};

module.exports = {
  getParents,
  deleteParent,
  createParent,
  addStudentToParent,
  removeStudentFromParent,
  updateParent,
  updateParentStudentLink,
};