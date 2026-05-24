const pool = require("../db");

const {
  buildUniqueLogin,
  generateTemporaryPassword,
  hashPassword,
} = require("../utils/auth.util");

const getTeachers = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const params = [];
    let whereClause = "";

    let groupsDataWhereClause = "";
    let countsParentJoin = "";
    let countsParentCondition = "";
    let studentsParentJoin = "";
    let studentsFilterCondition = "su.id IS NOT NULL";

    if (currentUser.role === "teacher") {
      params.push(currentUser.id);

      whereClause = `
        WHERE u.id = $1
      `;
    } else if (currentUser.role === "student") {
      params.push(currentUser.id);

      whereClause = `
        WHERE EXISTS (
          SELECT 1
          FROM groups g_filter
          JOIN student_group_course sgc_filter
            ON sgc_filter.group_id = g_filter.id
          AND sgc_filter.status = 'активен'
          WHERE g_filter.teacher_id = t.user_id
            AND sgc_filter.student_id = $1
        )
      `;

      groupsDataWhereClause = `
        WHERE EXISTS (
          SELECT 1
          FROM student_group_course sgc_filter
          WHERE sgc_filter.group_id = g.id
            AND sgc_filter.status = 'активен'
            AND sgc_filter.student_id = $1
        )
      `;

      countsParentCondition = `
        AND sgc.student_id = $1
      `;

      studentsFilterCondition = "su.id = $1";
    } else if (currentUser.role === "parent") {
      params.push(currentUser.id);

      whereClause = `
        WHERE EXISTS (
          SELECT 1
          FROM groups g_filter
          JOIN student_group_course sgc_filter
            ON sgc_filter.group_id = g_filter.id
           AND sgc_filter.status = 'активен'
          JOIN parent_student ps_filter
            ON ps_filter.student_id = sgc_filter.student_id
          WHERE g_filter.teacher_id = t.user_id
            AND ps_filter.parent_id = $1
        )
      `;

      groupsDataWhereClause = `
        WHERE EXISTS (
          SELECT 1
          FROM student_group_course sgc_filter
          JOIN parent_student ps_filter
            ON ps_filter.student_id = sgc_filter.student_id
          WHERE sgc_filter.group_id = g.id
            AND sgc_filter.status = 'активен'
            AND ps_filter.parent_id = $1
        )
      `;

      countsParentJoin = `
        LEFT JOIN parent_student ps_counts
          ON ps_counts.student_id = sgc.student_id
         AND ps_counts.parent_id = $1
      `;

      countsParentCondition = `
        AND ps_counts.parent_id IS NOT NULL
      `;

      studentsParentJoin = `
        JOIN parent_student ps_students
          ON ps_students.student_id = su.id
         AND ps_students.parent_id = $1
      `;

      studentsFilterCondition = "su.id IS NOT NULL";
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
        t.work_start_date,

        COALESCE(groups_data.group_names, '—') AS group_names,
        COALESCE(groups_data.groups_list, '[]'::json) AS groups_list,

        COALESCE(counts_data.senior_count, 0) AS senior_count,
        COALESCE(counts_data.junior_count, 0) AS junior_count,
        COALESCE(counts_data.total_count, 0) AS total_count,

        COALESCE(students_data.students_list, '[]'::json) AS students_list

      FROM teachers t
      JOIN users u ON t.user_id = u.id

      LEFT JOIN (
        SELECT
          teacher_groups.teacher_id,

          STRING_AGG(
            teacher_groups.group_name,
            E'\\n'
            ORDER BY teacher_groups.group_id
          ) AS group_names,

          JSON_AGG(
            JSONB_BUILD_OBJECT(
              'id', teacher_groups.group_id,
              'name', teacher_groups.group_name,
              'schedule_list', teacher_groups.schedule_list
            )
            ORDER BY teacher_groups.group_id
          ) AS groups_list

        FROM (
          SELECT
            g.teacher_id,
            g.id AS group_id,
            (sc.name || '-' || EXTRACT(HOUR FROM MIN(gs.start_time))) AS group_name,

            COALESCE(
              JSON_AGG(
                JSONB_BUILD_OBJECT(
                  'day_of_week', gs.day_of_week,
                  'start_time', TO_CHAR(gs.start_time, 'HH24:MI'),
                  'end_time', TO_CHAR(gs.end_time, 'HH24:MI')
                )
                ORDER BY
                  CASE gs.day_of_week
                    WHEN 'Понедельник' THEN 1
                    WHEN 'Вторник' THEN 2
                    WHEN 'Среда' THEN 3
                    WHEN 'Четверг' THEN 4
                    WHEN 'Пятница' THEN 5
                    WHEN 'Суббота' THEN 6
                    WHEN 'Воскресенье' THEN 7
                    ELSE 8
                  END,
                  gs.start_time
              ) FILTER (WHERE gs.group_id IS NOT NULL),
              '[]'::json
            ) AS schedule_list

          FROM groups g
          LEFT JOIN schools sc ON g.school_id = sc.id
          LEFT JOIN group_schedule gs ON gs.group_id = g.id

          ${groupsDataWhereClause}

          GROUP BY g.teacher_id, g.id, sc.name
        ) AS teacher_groups

        GROUP BY teacher_groups.teacher_id
      ) AS groups_data ON groups_data.teacher_id = t.user_id

      LEFT JOIN (
        SELECT
          g.teacher_id,

          COUNT(DISTINCT CASE
            WHEN c.level = 'С'
             AND su.status = 'active'
             ${countsParentCondition}
            THEN sgc.student_id
          END) AS senior_count,

          COUNT(DISTINCT CASE
            WHEN c.level = 'М'
             AND su.status = 'active'
             ${countsParentCondition}
            THEN sgc.student_id
          END) AS junior_count,

          COUNT(DISTINCT CASE
            WHEN sgc.student_id IS NOT NULL
             ${countsParentCondition}
            THEN sgc.student_id
          END) AS total_count

        FROM groups g

        LEFT JOIN student_group_course sgc
          ON sgc.group_id = g.id
         AND sgc.status = 'активен'

        LEFT JOIN users su ON sgc.student_id = su.id
        LEFT JOIN courses c ON sgc.course_id = c.id

        ${countsParentJoin}

        GROUP BY g.teacher_id
      ) AS counts_data ON counts_data.teacher_id = t.user_id

      LEFT JOIN (
        SELECT
          prepared_students.teacher_id,

          JSON_AGG(
            JSONB_BUILD_OBJECT(
              'id', prepared_students.id,
              'full_name', prepared_students.full_name,
              'status', prepared_students.status,
              'level', prepared_students.level
            )
            ORDER BY prepared_students.full_name
          ) AS students_list

        FROM (
          SELECT DISTINCT
            g.teacher_id,
            su.id,
            su.full_name,
            su.status,
            c.level

          FROM groups g

          JOIN student_group_course sgc
            ON sgc.group_id = g.id
           AND sgc.status = 'активен'

          JOIN users su ON sgc.student_id = su.id

          ${studentsParentJoin}

          LEFT JOIN courses c ON sgc.course_id = c.id

          WHERE ${studentsFilterCondition}
        ) AS prepared_students

        GROUP BY prepared_students.teacher_id
      ) AS students_data ON students_data.teacher_id = t.user_id

      ${whereClause}

      ORDER BY u.id
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении преподавателей:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const deleteTeacher = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Некорректный id преподавателя" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teacherResult = await client.query(
      `
      SELECT u.id
      FROM users u
      JOIN teachers t ON t.user_id = u.id
      WHERE u.id = $1
        AND u.role = 'teacher'
      `,
      [id]
    );

    if (teacherResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Преподаватель не найден" });
    }

    await client.query(
      `
      UPDATE groups
      SET teacher_id = NULL
      WHERE teacher_id = $1
      `,
      [id]
    );

    await client.query(
      `
      UPDATE users
      SET status = 'inactive'
      WHERE id = $1 AND role = 'teacher'
      `,
      [id]
    );

    await client.query("COMMIT");

    res.json({ message: "Преподаватель деактивирован" });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Ошибка деактивации преподавателя:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column,
    });

    res.status(500).json({
      error: "Ошибка сервера",
      details: error.message,
      code: error.code,
      constraint: error.constraint,
      table: error.table,
      column: error.column,
    });
  } finally {
    client.release();
  }
};

const createTeacher = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const { full_name, phone, status, groupIds, work_start_date } = req.body;

  const client = await pool.connect();

  try {
    if (!full_name || !phone) {
      return res.status(400).json({
        error: "Не все обязательные поля заполнены",
      });
    }

    if (phone !== "-" && !/^\+7\d{10}$/.test(phone)) {
      return res.status(400).json({
        error: "Некорректный формат телефона. Используйте формат +7XXXXXXXXXX",
      });
    }

    if (work_start_date && work_start_date < "2001-01-01") {
      return res.status(400).json({
        error: "Дата начала работы не может быть раньше 2001 года",
      });
    }

    if (groupIds !== undefined && !Array.isArray(groupIds)) {
      return res.status(400).json({
        error: "groupIds должен быть массивом",
      });
    }

    await client.query("BEGIN");

    const login = await buildUniqueLogin(client, full_name, "teacher");
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const userResult = await client.query(
      `
      INSERT INTO users (
        login,
        full_name,
        phone,
        role,
        password_hash,
        must_change_password,
        status
      )
      VALUES ($1, $2, $3, 'teacher', $4, TRUE, $5)
      RETURNING id, login, full_name, phone, status, must_change_password
      `,
      [login, full_name, phone, passwordHash, status || "active"]
    );

    const newTeacherId = userResult.rows[0].id;

    await client.query(
      `
      INSERT INTO teachers (user_id, work_start_date)
      VALUES ($1, COALESCE($2::date, CURRENT_DATE))
      `,
      [newTeacherId, work_start_date || null]
    );

    if (Array.isArray(groupIds) && groupIds.length > 0) {
      await client.query(
        `
        UPDATE groups
        SET teacher_id = $1
        WHERE id = ANY($2::int[])
        `,
        [newTeacherId, groupIds]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Преподаватель добавлен",
      teacher: {
        ...userResult.rows[0],
        work_start_date:
          work_start_date || new Date().toISOString().split("T")[0],
        group_names: "—",
        senior_count: 0,
        junior_count: 0,
        total_count: 0,
      },
      credentials: {
        full_name,
        role: "teacher",
        login,
        temporary_password: temporaryPassword,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при добавлении преподавателя:", error);

    if (error.code === "23505") {
      return res.status(400).json({ error: "Логин уже существует" });
    }

    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

const updateTeacher = async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  const id = Number(req.params.id);
  const { full_name, phone, status, groupIds } = req.body;

  const client = await pool.connect();

  try {
    if (!full_name || !phone || !status) {
      return res.status(400).json({
        error: "Не все обязательные поля заполнены",
      });
    }

    if (phone !== "-" && !/^\+7\d{10}$/.test(phone)) {
      return res.status(400).json({
        error: "Некорректный формат телефона. Используйте формат +7XXXXXXXXXX",
      });
    }

    if (groupIds !== undefined && !Array.isArray(groupIds)) {
      return res.status(400).json({
        error: "groupIds должен быть массивом",
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE users
      SET 
        full_name = $1,
        phone = $2,
        status = $3
      WHERE id = $4 AND role = 'teacher'
      RETURNING id, full_name, phone, status
      `,
      [full_name, phone, status, id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Преподаватель не найден" });
    }

    await client.query(
      `
      UPDATE groups
      SET teacher_id = NULL
      WHERE teacher_id = $1
      `,
      [id]
    );

    if (Array.isArray(groupIds) && groupIds.length > 0) {
      await client.query(
        `
        UPDATE groups
        SET teacher_id = $1
        WHERE id = ANY($2::int[])
        `,
        [id, groupIds]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Преподаватель обновлён",
      teacher: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при обновлении преподавателя:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

module.exports = {
  getTeachers,
  deleteTeacher,
  createTeacher,
  updateTeacher,
};