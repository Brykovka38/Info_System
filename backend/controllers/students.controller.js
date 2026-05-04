const pool = require("../db");

const {
  buildUniqueLogin,
  generateTemporaryPassword,
  hashPassword,
} = require("../utils/auth.util");

const getStudents = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const params = [];
    let whereClause = "";

    if (currentUser.role === "teacher") {
      params.push(currentUser.id);

      whereClause = `
        WHERE EXISTS (
          SELECT 1
          FROM student_group_course sgc_filter
          JOIN groups g_filter ON g_filter.id = sgc_filter.group_id
          WHERE sgc_filter.student_id = s.user_id
            AND sgc_filter.status = 'активен'
            AND g_filter.teacher_id = $1
        )
      `;
    } else if (currentUser.role === "parent") {
      params.push(currentUser.id);

      whereClause = `
        WHERE EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = s.user_id
            AND ps_filter.parent_id = $1
        )
      `;
    } else if (currentUser.role === "student") {
      params.push(currentUser.id);

      whereClause = `
        WHERE s.user_id = $1
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
        s.class,
        s.school_id,
        sc.name AS school_name,

        sgc.group_id,
        sgc.course_id,

        c.code AS course_code,
        p.full_name AS parent_name,

        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', p.id,
              'full_name', p.full_name,
              'relation_type', ps.relation_type,
              'benefit', ps.benefit
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS parents_list,

        sc_group.name || '-' || g.cabinet || ' (' ||
        TO_CHAR(MIN(gs.start_time), 'HH24:MI') || '–' ||
        TO_CHAR(MIN(gs.end_time), 'HH24:MI') || ')' AS group_name,

        g.teacher_id AS teacher_id,
        teacher_user.full_name AS teacher_name

      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN schools sc ON s.school_id = sc.id

      LEFT JOIN student_group_course sgc
        ON sgc.student_id = s.user_id
       AND sgc.status = 'активен'

      LEFT JOIN courses c ON sgc.course_id = c.id
      LEFT JOIN groups g ON sgc.group_id = g.id
      LEFT JOIN schools sc_group ON g.school_id = sc_group.id
      LEFT JOIN group_schedule gs ON gs.group_id = g.id

      LEFT JOIN teachers t ON t.user_id = g.teacher_id
      LEFT JOIN users teacher_user ON teacher_user.id = t.user_id

      LEFT JOIN parent_student ps ON ps.student_id = s.user_id
      LEFT JOIN users p ON ps.parent_id = p.id

      ${whereClause}

      GROUP BY
        u.id, u.full_name, u.phone, u.status,
        s.class, s.school_id, sc.name,
        sgc.group_id, sgc.course_id,
        c.code, p.full_name, sc_group.name,
        g.cabinet,
        g.teacher_id,
        teacher_user.full_name

      ORDER BY u.id
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении студентов:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const deleteStudent = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const id = req.params.id;

  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);

    res.json({ message: "Студент удалён" });
  } catch (error) {
    console.error("Ошибка удаления студента:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const createStudent = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const {
    full_name,
    phone,
    class_name,
    school_id,
    course_id,
    group_id,
    parent_id,
    relation_type,
  } = req.body;

  try {
    if (!full_name || !phone) {
      return res.status(400).json({ error: "ФИО и номер телефона обязательны" });
    }

    const login = await buildUniqueLogin(pool, full_name, "student");
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const userResult = await pool.query(
      `
      INSERT INTO users (login, full_name, phone, role, password_hash, must_change_password, status)
      VALUES ($1, $2, $3, 'student', $4, TRUE, 'active')
      RETURNING id, login, full_name, phone, status, must_change_password
      `,
      [login, full_name, phone, passwordHash]
    );

    const newStudentId = userResult.rows[0].id;

    await pool.query(
      `
      UPDATE students
      SET class = $1,
          school_id = $2
      WHERE user_id = $3
      `,
      [class_name?.trim() ? class_name.trim() : "-", school_id || null, newStudentId]
    );

    if (course_id || group_id) {
      await pool.query(
        `
        INSERT INTO student_group_course
          (student_id, group_id, course_id, start_date, status)
        VALUES
          ($1, $2, $3, CURRENT_DATE, 'активен')
        `,
        [newStudentId, group_id || null, course_id || null]
      );
    }

    if (parent_id && relation_type) {
      await pool.query(
        `
        INSERT INTO parent_student (parent_id, student_id, relation_type, benefit)
        VALUES ($1, $2, $3, FALSE)
        `,
        [parent_id, newStudentId, relation_type]
      );
    }

    let schoolName = null;
    let courseCode = null;
    let groupName = null;
    let parentName = null;

    if (school_id) {
      const schoolResult = await pool.query(
        `SELECT name FROM schools WHERE id = $1`,
        [school_id]
      );
      schoolName = schoolResult.rows[0]?.name || null;
    }

    if (course_id) {
      const courseResult = await pool.query(
        `SELECT code FROM courses WHERE id = $1`,
        [course_id]
      );
      courseCode = courseResult.rows[0]?.code || null;
    }

    if (group_id) {
      const groupResult = await pool.query(
        `
        SELECT
          sc.name || '-' || g.cabinet || ' (' ||
          TO_CHAR(MIN(gs.start_time), 'HH24:MI') || '–' ||
          TO_CHAR(MIN(gs.end_time), 'HH24:MI') || ')' AS group_name
        FROM groups g
        JOIN schools sc ON g.school_id = sc.id
        LEFT JOIN group_schedule gs ON gs.group_id = g.id
        WHERE g.id = $1
        GROUP BY sc.name, g.cabinet
        `,
        [group_id]
      );
      groupName = groupResult.rows[0]?.group_name || null;
    }

    if (parent_id) {
      const parentResult = await pool.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [parent_id]
      );
      parentName = parentResult.rows[0]?.full_name || null;
    }

    res.status(201).json({
      message: "Студент добавлен",
      student: {
        ...userResult.rows[0],
        class: class_name?.trim() ? class_name.trim() : "-",
        school_name: schoolName,
        course_code: courseCode,
        parent_name: parentName,
        group_name: groupName,
      },
      credentials: {
        full_name,
        role: "student",
        login,
        temporary_password: temporaryPassword,
      },
    });
  } catch (error) {
    console.error("Ошибка при добавлении студента:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const getFreeStudents = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN parent_student ps ON ps.student_id = s.user_id
      WHERE ps.student_id IS NULL
      ORDER BY u.full_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении свободных учеников:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const getFreeStudentsForGroup = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        last_course.course_id,
        c.code AS course_code
      FROM students s
      JOIN users u ON u.id = s.user_id

      LEFT JOIN (
        SELECT DISTINCT student_id
        FROM student_group_course
        WHERE status = 'активен'
          AND group_id IS NOT NULL
      ) busy ON busy.student_id = s.user_id

      LEFT JOIN (
        SELECT DISTINCT ON (sgc.student_id)
          sgc.student_id,
          sgc.course_id
        FROM student_group_course sgc
        ORDER BY
          sgc.student_id,
          CASE WHEN sgc.status = 'активен' THEN 0 ELSE 1 END,
          sgc.start_date DESC,
          sgc.id DESC
      ) last_course ON last_course.student_id = s.user_id

      LEFT JOIN courses c ON c.id = last_course.course_id

      WHERE busy.student_id IS NULL
        AND u.status = 'active'

      ORDER BY u.full_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении свободных учеников для группы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const updateStudent = async (req, res) => {
  const id = req.params.id;
  const {
    full_name,
    phone,
    status,
    class_name,
    school_id,
    group_id,
    course_id,
  } = req.body;

  const client = await pool.connect();

  try {
    if (!full_name || !status) {
      return res.status(400).json({ error: "Не все обязательные поля заполнены" });
    }

    await client.query("BEGIN");

      if (req.user.role === "teacher") {
        const belongsToTeacher = await isTeacherStudent(client, req.user.id, id);

        if (!belongsToTeacher) {
          await client.query("ROLLBACK");
          return res.status(403).json({
            error: "Вы можете редактировать только своих учеников",
          });
        }

        const groupBelongsToTeacher = await isTeacherGroup(
          client,
          req.user.id,
          group_id
        );

        if (!groupBelongsToTeacher) {
          await client.query("ROLLBACK");
          return res.status(403).json({
            error: "Вы можете перевести ученика только в свою группу",
          });
        }
      }

    const userResult = await client.query(
      `
      UPDATE users
      SET full_name = $1,
          phone = $2,
          status = $3
      WHERE id = $4 AND role = 'student'
      RETURNING id, full_name, phone, status
      `,
      [full_name, phone || "-", status, id]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Студент не найден" });
    }

    const studentResult = await client.query(
          `
          UPDATE students
          SET class = $1,
              school_id = $2
          WHERE user_id = $3
          RETURNING user_id, class, school_id
          `,
          [class_name?.trim() || "", school_id || null, id]
        );

        const activeEnrollment = await client.query(
  `
  SELECT id, group_id, course_id
  FROM student_group_course
  WHERE student_id = $1
    AND status = 'активен'
  ORDER BY id DESC
  LIMIT 1
  `,
  [id]
);

if (group_id !== null || course_id !== null) {
  if (activeEnrollment.rows.length > 0) {
    await client.query(
      `
      UPDATE student_group_course
      SET group_id = $1,
          course_id = $2
      WHERE id = $3
      `,
      [group_id || null, course_id || null, activeEnrollment.rows[0].id]
    );
  } else {
    const existingEnrollment = await client.query(
      `
      SELECT id
      FROM student_group_course
      WHERE student_id = $1
        AND group_id IS NOT DISTINCT FROM $2
        AND course_id IS NOT DISTINCT FROM $3
      ORDER BY id DESC
      LIMIT 1
      `,
      [id, group_id || null, course_id || null]
    );

    if (existingEnrollment.rows.length > 0) {
      await client.query(
        `
        UPDATE student_group_course
        SET status = 'активен',
            end_date = NULL
        WHERE id = $1
        `,
        [existingEnrollment.rows[0].id]
      );
    } else {
      await client.query(
        `
        INSERT INTO student_group_course
          (student_id, group_id, course_id, start_date, status)
        VALUES
          ($1, $2, $3, CURRENT_DATE, 'активен')
        `,
        [id, group_id || null, course_id || null]
      );
    }
  }
} else {
  if (activeEnrollment.rows.length > 0) {
    await client.query(
      `
      UPDATE student_group_course
      SET status = 'завершён',
          end_date = CURRENT_DATE
      WHERE id = $1
      `,
      [activeEnrollment.rows[0].id]
    );
  }
}

    await client.query("COMMIT");

    res.json({
      message: "Студент обновлён",
      student: {
        ...userResult.rows[0],
        class: studentResult.rows[0]?.class || "",
        school_id: studentResult.rows[0]?.school_id || null,
        group_id: group_id || null,
        course_id: course_id || null,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при обновлении студента:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

const addParentToStudent = async (req, res) => {
    if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { studentId } = req.params;
  const { parent_id, relation_type } = req.body;

  try {
    if (!parent_id || !relation_type) {
      return res.status(400).json({ error: "Не выбран родитель или тип связи" });
    }

    const exists = await pool.query(
      `
      SELECT id
      FROM parent_student
      WHERE student_id = $1 AND parent_id = $2
      `,
      [studentId, parent_id]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Этот родитель уже привязан к студенту" });
    }

    await pool.query(
      `
      INSERT INTO parent_student (parent_id, student_id, relation_type, benefit)
      VALUES ($1, $2, $3, FALSE)
      `,
      [parent_id, studentId, relation_type]
    );

    res.json({ message: "Родитель привязан к студенту" });
  } catch (error) {
    console.error("Ошибка при добавлении родителя студенту:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const removeParentFromStudent = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { studentId, parentId } = req.params;

  try {
    const result = await pool.query(
      `
      DELETE FROM parent_student
      WHERE student_id = $1 AND parent_id = $2
      RETURNING id
      `,
      [studentId, parentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Связь родителя со студентом не найдена" });
    }

    res.json({ message: "Родитель отвязан от студента" });
  } catch (error) {
    console.error("Ошибка при удалении родителя у студента:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const isTeacherStudent = async (clientOrPool, teacherUserId, studentId) => {
  const result = await clientOrPool.query(
    `
    SELECT 1
    FROM student_group_course sgc
    JOIN groups g ON g.id = sgc.group_id
    WHERE sgc.student_id = $1
      AND sgc.status = 'активен'
      AND g.teacher_id = $2
    LIMIT 1
    `,
    [studentId, teacherUserId]
  );

  return result.rows.length > 0;
};

const isTeacherGroup = async (clientOrPool, teacherUserId, groupId) => {
  if (!groupId) return true;

  const result = await clientOrPool.query(
    `
    SELECT 1
    FROM groups
    WHERE id = $1
      AND teacher_id = $2
    LIMIT 1
    `,
    [groupId, teacherUserId]
  );

  return result.rows.length > 0;
};

const getMyGroupStudents = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    if (currentUser.role !== "student") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const activeGroupResult = await pool.query(
      `
      SELECT
        sgc.group_id
      FROM student_group_course sgc
      WHERE sgc.student_id = $1
        AND sgc.status = 'активен'
        AND sgc.group_id IS NOT NULL
      ORDER BY sgc.id DESC
      LIMIT 1
      `,
      [currentUser.id]
    );

    const groupId = activeGroupResult.rows[0]?.group_id;

    if (!groupId) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.status,
        s.class,
        c.code AS course_code,

        sc.name || '-' || g.cabinet || ' (' ||
        TO_CHAR(MIN(gs.start_time), 'HH24:MI') || '–' ||
        TO_CHAR(MIN(gs.end_time), 'HH24:MI') || ')' AS group_name

      FROM student_group_course sgc
      JOIN users u ON u.id = sgc.student_id
      JOIN students s ON s.user_id = u.id
      LEFT JOIN courses c ON c.id = sgc.course_id
      LEFT JOIN groups g ON g.id = sgc.group_id
      LEFT JOIN schools sc ON sc.id = g.school_id
      LEFT JOIN group_schedule gs ON gs.group_id = g.id

      WHERE sgc.group_id = $1
        AND sgc.status = 'активен'
        AND u.status = 'active'

      GROUP BY
        u.id,
        u.full_name,
        u.status,
        s.class,
        c.code,
        sc.name,
        g.cabinet

      ORDER BY u.full_name
      `,
      [groupId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении учеников моей группы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = {
  getStudents,
  deleteStudent,
  createStudent,
  updateStudent,
  getFreeStudents,
  getFreeStudentsForGroup,
  addParentToStudent,
  removeParentFromStudent,
  getMyGroupStudents,
};