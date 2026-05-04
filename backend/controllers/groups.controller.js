const pool = require("../db");

const getGroups = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: "Пользователь не авторизован" });
    }

    const params = [];
    let whereClause = "";
    let parentJoin = "";
    let studentsListFilter = "WHERE su.id IS NOT NULL";

    if (currentUser.role === "teacher") {
  params.push(currentUser.id);
  whereClause = "WHERE g.teacher_id = $1";
    } else if (currentUser.role === "parent") {
      params.push(currentUser.id);

      whereClause = `
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
    } else if (currentUser.role === "student") {
      params.push(currentUser.id);

      whereClause = `
        WHERE EXISTS (
          SELECT 1
          FROM student_group_course sgc_filter
          WHERE sgc_filter.group_id = g.id
            AND sgc_filter.status = 'активен'
            AND sgc_filter.student_id = $1
        )
      `;
    } else if (currentUser.role !== "admin") {
      return res.status(403).json({ error: "Недостаточно прав" });
    }

    const result = await pool.query(
      `
      SELECT
        g.id,
        g.school_id,
        g.teacher_id,
        g.cabinet,

        sc.name AS school_name,
        u.full_name AS teacher_name,

        sc.name || '-' || g.cabinet || ' (' ||
        TO_CHAR(MIN(gs.start_time), 'HH24:MI') || '–' ||
        TO_CHAR(MIN(gs.end_time), 'HH24:MI') || ')' AS group_name,
        
        COALESCE(
          STRING_AGG(DISTINCT gs.day_of_week, ', '),
          '—'
        ) AS days,

        MIN(gs.start_time) AS start_time,
        MIN(gs.end_time) AS end_time,

        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'day_of_week', gs.day_of_week,
              'start_time', gs.start_time,
              'end_time', gs.end_time
            )
          ) FILTER (WHERE gs.id IS NOT NULL),
          '[]'::json
        ) AS schedule_list,

        COUNT(DISTINCT sgc.student_id) AS total_students,

        COUNT(
          DISTINCT CASE 
            WHEN su.status = 'active' 
            THEN sgc.student_id 
          END
        ) AS active_students,

        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', su.id,
              'full_name', su.full_name,
              'status', su.status
            )
          ) FILTER (${studentsListFilter}),
          '[]'::json
        ) AS students_list

      FROM groups g
      LEFT JOIN schools sc ON g.school_id = sc.id
      LEFT JOIN teachers t ON g.teacher_id = t.user_id
      LEFT JOIN users u ON t.user_id = u.id

      LEFT JOIN group_schedule gs ON gs.group_id = g.id

      LEFT JOIN student_group_course sgc
        ON sgc.group_id = g.id 
       AND sgc.status = 'активен'

      LEFT JOIN users su ON su.id = sgc.student_id

      ${parentJoin}

      ${whereClause}

      GROUP BY
        g.id,
        g.school_id,
        g.teacher_id,
        g.cabinet,
        sc.name,
        u.full_name

      ORDER BY g.id
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении групп:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const deleteGroup = async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query("DELETE FROM groups WHERE id = $1", [id]);
    res.json({ message: "Группа удалена" });
  } catch (error) {
    console.error("Ошибка удаления группы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const createGroup = async (req, res) => {
  const {
    school_id,
    cabinet,
    teacher_id,
    schedule,
    student_ids,
  } = req.body;

  const client = await pool.connect();

  try {
    if (!school_id || !cabinet || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ error: "Не заполнены обязательные поля группы" });
    }

    await client.query("BEGIN");

    const teacherIdForInsert = teacher_id || null;

    const groupResult = await client.query(
      `
      INSERT INTO groups (teacher_id, school_id, cabinet)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [teacherIdForInsert, school_id, cabinet.trim()]
    );

    const groupId = groupResult.rows[0].id;

    for (const item of schedule) {
      await client.query(
        `
        INSERT INTO group_schedule (group_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        `,
        [groupId, item.day_of_week, item.start_time, item.end_time]
      );
    }

    // const skippedStudents = [];

    if (Array.isArray(student_ids) && student_ids.length > 0) {
      for (const studentId of student_ids) {
        const courseResult = await client.query(
          `
          SELECT sgc.course_id
          FROM student_group_course sgc
          WHERE sgc.student_id = $1
          ORDER BY
            CASE WHEN sgc.status = 'активен' THEN 0 ELSE 1 END,
            sgc.start_date DESC,
            sgc.id DESC
          LIMIT 1
          `,
          [studentId]
        );

        const courseId = courseResult.rows[0]?.course_id || null;

        await client.query(
          `
          INSERT INTO student_group_course
            (student_id, group_id, course_id, start_date, status)
          VALUES
            ($1, $2, $3, CURRENT_DATE, 'активен')
          `,
          [studentId, groupId, courseId]
        );
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Группа добавлена",
      group_id: groupId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при добавлении группы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

const unassignTeacherFromGroup = async (req, res) => {
  const { groupId } = req.params;

  try {
    const result = await pool.query(
      `
      UPDATE groups
      SET teacher_id = NULL
      WHERE id = $1
      RETURNING id, teacher_id
      `,
      [groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Группа не найдена" });
    }

    res.json({ message: "Группа снята с преподавателя" });
  } catch (error) {
    console.error("Ошибка при снятии группы с преподавателя:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const assignTeacherToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { teacher_id } = req.body;

  try {
    const checkGroup = await pool.query(
      `SELECT id, teacher_id FROM groups WHERE id = $1`,
      [groupId]
    );

    if (checkGroup.rows.length === 0) {
      return res.status(404).json({ error: "Группа не найдена" });
    }

    if (checkGroup.rows[0].teacher_id) {
      return res.status(400).json({ error: "У группы уже есть преподаватель" });
    }

    await pool.query(
      `
      UPDATE groups
      SET teacher_id = $1
      WHERE id = $2
      `,
      [teacher_id, groupId]
    );

    res.json({ message: "Группа назначена преподавателю" });
  } catch (error) {
    console.error("Ошибка при назначении группы преподавателю:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

const updateGroup = async (req, res) => {
  const id = req.params.id;
  const { school_id, cabinet, teacher_id, schedule } = req.body;

  const client = await pool.connect();

  try {
    if (!school_id || !schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ error: "Не все обязательные поля заполнены" });
    }

    await client.query("BEGIN");

    const groupResult = await client.query(
      `
      UPDATE groups
      SET school_id = $1,
          cabinet = $2,
          teacher_id = $3
      WHERE id = $4
      RETURNING id, school_id, cabinet, teacher_id
      `,
      [school_id, cabinet || "-", teacher_id || null, id]
    );

    if (groupResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Группа не найдена" });
    }

    await client.query(
      `
      DELETE FROM group_schedule
      WHERE group_id = $1
      `,
      [id]
    );

    for (const item of schedule) {
      await client.query(
        `
        INSERT INTO group_schedule (group_id, day_of_week, start_time, end_time)
        VALUES ($1, $2, $3, $4)
        `,
        [id, item.day_of_week, item.start_time, item.end_time]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Группа обновлена",
      group: groupResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при обновлении группы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

const removeStudentFromGroup = async (req, res) => {
  const { groupId, studentId } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const activeLink = await client.query(
      `
      SELECT id, course_id
      FROM student_group_course
      WHERE group_id = $1
        AND student_id = $2
        AND status = 'активен'
      ORDER BY id DESC
      LIMIT 1
      `,
      [groupId, studentId]
    );

    if (activeLink.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Активная связь ученика с группой не найдена" });
    }

    const currentLink = activeLink.rows[0];
    const courseId = currentLink.course_id;

    // Проверяем, нет ли уже активной записи без группы, но с тем же курсом
    const existingCourseOnly = await client.query(
      `
      SELECT id
      FROM student_group_course
      WHERE student_id = $1
        AND group_id IS NULL
        AND course_id IS NOT DISTINCT FROM $2
        AND status = 'активен'
      ORDER BY id DESC
      LIMIT 1
      `,
      [studentId, courseId]
    );

    if (existingCourseOnly.rows.length > 0) {
      // Текущую групповую запись завершаем
      await client.query(
        `
        UPDATE student_group_course
        SET status = 'завершён',
            end_date = CURRENT_DATE
        WHERE id = $1
        `,
        [currentLink.id]
      );
    } else {
      // Просто убираем группу, курс оставляем
      await client.query(
        `
        UPDATE student_group_course
        SET group_id = NULL,
            status = 'активен',
            end_date = NULL
        WHERE id = $1
        `,
        [currentLink.id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Ученик убран из группы" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при удалении ученика из группы:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

const addStudentToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { student_id, course_id } = req.body;

  const client = await pool.connect();

  try {
    if (!student_id) {
      return res.status(400).json({ error: "Не выбран ученик" });
    }

    await client.query("BEGIN");

    // 1. Уже есть активная запись с группой
    const activeWithGroup = await client.query(
      `
      SELECT id, group_id, course_id
      FROM student_group_course
      WHERE student_id = $1
        AND status = 'активен'
        AND group_id IS NOT NULL
      ORDER BY id DESC
      LIMIT 1
      `,
      [student_id]
    );

    if (activeWithGroup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Ученик уже состоит в активной группе" });
    }

    // 2. Есть ли уже строка с этой же группой и курсом за сегодня
    const existingSameToday = await client.query(
      `
      SELECT id
      FROM student_group_course
      WHERE student_id = $1
        AND group_id = $2
        AND course_id IS NOT DISTINCT FROM $3
        AND start_date = CURRENT_DATE
      ORDER BY id DESC
      LIMIT 1
      `,
      [student_id, groupId, course_id || null]
    );

    // 3. Есть ли активная запись без группы
    const activeWithoutGroup = await client.query(
      `
      SELECT id, course_id
      FROM student_group_course
      WHERE student_id = $1
        AND status = 'активен'
        AND group_id IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
      [student_id]
    );

    // Если уже есть нужная строка за сегодня — просто активируем её
    if (existingSameToday.rows.length > 0) {
      await client.query(
        `
        UPDATE student_group_course
        SET status = 'активен',
            end_date = NULL
        WHERE id = $1
        `,
        [existingSameToday.rows[0].id]
      );

      // А лишнюю активную запись без группы завершаем
      if (activeWithoutGroup.rows.length > 0) {
        await client.query(
          `
          UPDATE student_group_course
          SET status = 'завершён',
              end_date = CURRENT_DATE
          WHERE id = $1
          `,
          [activeWithoutGroup.rows[0].id]
        );
      }

      await client.query("COMMIT");
      return res.json({ message: "Ученик добавлен в группу" });
    }

    // Если есть активная запись без группы — обновляем её
    if (activeWithoutGroup.rows.length > 0) {
      const existingCourseId = activeWithoutGroup.rows[0].course_id;

      await client.query(
        `
        UPDATE student_group_course
        SET group_id = $1,
            course_id = $2
        WHERE id = $3
        `,
        [groupId, existingCourseId || course_id || null, activeWithoutGroup.rows[0].id]
      );

      await client.query("COMMIT");
      return res.json({ message: "Ученик добавлен в группу" });
    }

    // Иначе создаём новую запись
    await client.query(
      `
      INSERT INTO student_group_course
        (student_id, group_id, course_id, start_date, status)
      VALUES
        ($1, $2, $3, CURRENT_DATE, 'активен')
      `,
      [student_id, groupId, course_id || null]
    );

    await client.query("COMMIT");
    res.json({ message: "Ученик добавлен в группу" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при добавлении ученика в группу:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

module.exports = {
  getGroups,
  deleteGroup,
  createGroup,
  unassignTeacherFromGroup,
  assignTeacherToGroup,
  updateGroup,
  removeStudentFromGroup,
  addStudentToGroup,
};