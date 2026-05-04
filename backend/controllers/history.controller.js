const pool = require("../db");

const canAccessGroup = async (clientOrPool, user, groupId) => {
  if (user?.role === "admin") {
    return true;
  }

  if (user?.role === "teacher") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM groups
      WHERE id = $1
        AND teacher_id = $2
      LIMIT 1
      `,
      [groupId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "parent") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM student_group_course sgc
      JOIN parent_student ps ON ps.student_id = sgc.student_id
      WHERE sgc.group_id = $1
        AND sgc.status = 'активен'
        AND ps.parent_id = $2
      LIMIT 1
      `,
      [groupId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "student") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM student_group_course sgc
      WHERE sgc.group_id = $1
        AND sgc.status = 'активен'
        AND sgc.student_id = $2
      LIMIT 1
      `,
      [groupId, user.id]
    );

    return result.rows.length > 0;
  }

  return false;
};

const canAccessLesson = async (clientOrPool, user, lessonId) => {
  if (user?.role === "admin") {
    return true;
  }

  if (user?.role === "teacher") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM lessons l
      JOIN groups g ON g.id = l.group_id
      WHERE l.id = $1
        AND g.teacher_id = $2
      LIMIT 1
      `,
      [lessonId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "parent") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM lessons l
      JOIN student_group_course sgc
        ON sgc.group_id = l.group_id
       AND sgc.status = 'активен'
      JOIN parent_student ps
        ON ps.student_id = sgc.student_id
      WHERE l.id = $1
        AND ps.parent_id = $2
      LIMIT 1
      `,
      [lessonId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "student") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM lessons l
      JOIN student_group_course sgc
        ON sgc.group_id = l.group_id
       AND sgc.status = 'активен'
      WHERE l.id = $1
        AND sgc.student_id = $2
      LIMIT 1
      `,
      [lessonId, user.id]
    );

    return result.rows.length > 0;
  }

  return false;
};

const canAccessEnrollment = async (clientOrPool, user, enrollmentId) => {
  if (user?.role === "admin") {
    return true;
  }

  if (user?.role === "teacher") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM student_group_course sgc
      JOIN groups g ON g.id = sgc.group_id
      WHERE sgc.id = $1
        AND g.teacher_id = $2
      LIMIT 1
      `,
      [enrollmentId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "parent") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM student_group_course sgc
      JOIN parent_student ps ON ps.student_id = sgc.student_id
      WHERE sgc.id = $1
        AND ps.parent_id = $2
      LIMIT 1
      `,
      [enrollmentId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "student") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM student_group_course sgc
      WHERE sgc.id = $1
        AND sgc.student_id = $2
      LIMIT 1
      `,
      [enrollmentId, user.id]
    );

    return result.rows.length > 0;
  }

  return false;
};

const canAccessAttendance = async (clientOrPool, user, attendanceId) => {
  if (user?.role === "admin") {
    return true;
  }

  if (user?.role === "teacher") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM attendance a
      JOIN student_group_course sgc ON sgc.id = a.enrollment_id
      JOIN groups g ON g.id = sgc.group_id
      WHERE a.id = $1
        AND g.teacher_id = $2
      LIMIT 1
      `,
      [attendanceId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "parent") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM attendance a
      JOIN student_group_course sgc ON sgc.id = a.enrollment_id
      JOIN parent_student ps ON ps.student_id = sgc.student_id
      WHERE a.id = $1
        AND ps.parent_id = $2
      LIMIT 1
      `,
      [attendanceId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "student") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM attendance a
      JOIN student_group_course sgc ON sgc.id = a.enrollment_id
      WHERE a.id = $1
        AND sgc.student_id = $2
      LIMIT 1
      `,
      [attendanceId, user.id]
    );

    return result.rows.length > 0;
  }

  return false;
};

const ensureReadHistoryAccess = (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: "Пользователь не авторизован" });
    return false;
  }

  if (
    req.user.role !== "admin" &&
    req.user.role !== "teacher" &&
    req.user.role !== "parent" &&
    req.user.role !== "student"
  ) {
    res.status(403).json({ message: "Недостаточно прав" });
    return false;
  }

  return true;
};

const ensureAdminOrTeacher = (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: "Пользователь не авторизован" });
    return false;
  }

  if (req.user.role !== "admin" && req.user.role !== "teacher") {
    res.status(403).json({ message: "Недостаточно прав" });
    return false;
  }

  return true;
};

const getLessons = async (req, res) => {
  try {
    if (!ensureReadHistoryAccess(req, res)) return;

    const params = [];
    let roleFilter = "";

    if (req.user.role === "teacher") {
      params.push(req.user.id);
      roleFilter = "WHERE g.teacher_id = $1";
    }

    if (req.user.role === "parent") {
      params.push(req.user.id);
      roleFilter = `
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
    }

    if (req.user.role === "student") {
      params.push(req.user.id);
      roleFilter = `
        WHERE EXISTS (
          SELECT 1
          FROM student_group_course sgc_filter
          WHERE sgc_filter.group_id = g.id
            AND sgc_filter.status = 'активен'
            AND sgc_filter.student_id = $1
        )
      `;
    }

    const result = await pool.query(
      `
      SELECT 
        l.id,
        l.group_id,
        l.teacher_id,
        TO_CHAR(l.lesson_date, 'YYYY-MM-DD') AS lesson_date,
        l.note,
        g.cabinet,
        sc.name AS school_name,
        u.full_name AS teacher_name
      FROM lessons l
      JOIN groups g ON g.id = l.group_id
      JOIN schools sc ON sc.id = g.school_id
      JOIN users u ON u.id = l.teacher_id
      ${roleFilter}
      ORDER BY l.lesson_date DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении занятий:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const createLesson = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!ensureAdminOrTeacher(req, res)) return;

    const { group_id, teacher_id, lesson_date, note, attendance } = req.body;

    if (!group_id || !lesson_date) {
      return res.status(400).json({
        message: "Не указана группа или дата занятия",
      });
    }

    if (!Array.isArray(attendance)) {
      return res.status(400).json({
        message: "Некорректный список посещаемости",
      });
    }

    const hasGroupAccess = await canAccessGroup(client, req.user, group_id);

    if (!hasGroupAccess) {
      return res.status(403).json({
        message: "Вы можете создавать занятия только для своих групп",
      });
    }

    for (const item of attendance) {
      const hasEnrollmentAccess = await canAccessEnrollment(
        client,
        req.user,
        item.enrollment_id
      );

      if (!hasEnrollmentAccess) {
        return res.status(403).json({
          message: "Вы можете отмечать посещаемость только своих учеников",
        });
      }
    }

    await client.query("BEGIN");

    const actualTeacherId =
      req.user.role === "teacher" ? req.user.id : teacher_id;

    let lessonResult = await client.query(
      `
      SELECT *
      FROM lessons
      WHERE group_id = $1
        AND lesson_date = $2
      `,
      [group_id, lesson_date]
    );

    let lesson;

    if (lessonResult.rows.length > 0) {
      lessonResult = await client.query(
        `
        UPDATE lessons
        SET
          teacher_id = $1,
          note = $2
        WHERE group_id = $3
          AND lesson_date = $4
        RETURNING *
        `,
        [actualTeacherId, note || null, group_id, lesson_date]
      );

      lesson = lessonResult.rows[0];
    } else {
      lessonResult = await client.query(
        `
        INSERT INTO lessons (group_id, teacher_id, lesson_date, note)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [group_id, actualTeacherId, lesson_date, note || null]
      );

      lesson = lessonResult.rows[0];
    }

    for (const item of attendance) {
      await client.query(
        `
        INSERT INTO attendance (
          lesson_id,
          enrollment_id,
          attendance_date,
          record_type,
          status,
          duration_value,
          format,
          topic,
          note
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (lesson_id, enrollment_id)
        DO UPDATE SET
          attendance_date = EXCLUDED.attendance_date,
          record_type = EXCLUDED.record_type,
          status = EXCLUDED.status,
          duration_value = EXCLUDED.duration_value,
          format = EXCLUDED.format,
          topic = EXCLUDED.topic,
          note = EXCLUDED.note
        `,
        [
          lesson.id,
          item.enrollment_id,
          lesson_date,
          "lesson",
          item.status,
          item.duration_value,
          item.format || "offline",
          item.topic || null,
          item.note || null,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Занятие сохранено",
      lesson,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при сохранении занятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  } finally {
    client.release();
  }
};

const getStudentsForGroup = async (req, res) => {
  try {
    if (!ensureReadHistoryAccess(req, res)) return;

    const { groupId } = req.params;

    const hasAccess = await canAccessGroup(pool, req.user, groupId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете видеть учеников только доступных групп",
      });
    }

    const params = [groupId];
    let roleFilter = "";

    if (req.user.role === "parent") {
      params.push(req.user.id);
      roleFilter = `
        AND EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = sgc.student_id
            AND ps_filter.parent_id = $2
        )
      `;
    }

    if (req.user.role === "student") {
      params.push(req.user.id);
      roleFilter = `
        AND sgc.student_id = $2
      `;
    }

    const result = await pool.query(
      `
      SELECT
        sgc.id AS enrollment_id,
        sgc.student_id,
        u.full_name AS student_name,
        c.code AS course_code
      FROM student_group_course sgc
      JOIN users u ON u.id = sgc.student_id
      LEFT JOIN courses c ON c.id = sgc.course_id
      WHERE sgc.group_id = $1
        AND sgc.status = 'активен'
        ${roleFilter}
      ORDER BY u.full_name
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении учеников группы:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const getLessonAttendance = async (req, res) => {
  try {
    if (!ensureReadHistoryAccess(req, res)) return;

    const { lessonId } = req.params;

    const hasAccess = await canAccessLesson(pool, req.user, lessonId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете видеть посещаемость только доступных занятий",
      });
    }

    const params = [lessonId];
    let roleFilter = "";

    if (req.user.role === "parent") {
      params.push(req.user.id);
      roleFilter = `
        AND EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = sgc.student_id
            AND ps_filter.parent_id = $2
        )
      `;
    }

    if (req.user.role === "student") {
      params.push(req.user.id);
      roleFilter = `
        AND sgc.student_id = $2
      `;
    }

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.lesson_id,
        a.enrollment_id,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        a.record_type,
        a.status,
        a.duration_value,
        a.format,
        a.topic,
        a.note,
        u.full_name AS student_name,
        c.code AS course_code
      FROM attendance a
      JOIN student_group_course sgc ON sgc.id = a.enrollment_id
      JOIN users u ON u.id = sgc.student_id
      LEFT JOIN courses c ON c.id = sgc.course_id
      WHERE a.lesson_id = $1
        ${roleFilter}
      ORDER BY u.full_name
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении посещаемости занятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const getStudentHistory = async (req, res) => {
  try {
    if (!ensureReadHistoryAccess(req, res)) return;

    const params = [];
    let roleFilter = "";

    if (req.user.role === "teacher") {
      params.push(req.user.id);
      roleFilter = "WHERE g.teacher_id = $1";
    }

    if (req.user.role === "parent") {
      params.push(req.user.id);
      roleFilter = `
        WHERE EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = sgc.student_id
            AND ps_filter.parent_id = $1
        )
      `;
    }

    if (req.user.role === "student") {
      params.push(req.user.id);
      roleFilter = `
        WHERE sgc.student_id = $1
      `;
    }

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.lesson_id,
        a.enrollment_id,
        sgc.student_id,
        TO_CHAR(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        a.record_type,
        a.status,
        a.duration_value,
        a.format,
        a.topic,
        a.note,
        u.full_name AS student_name,
        c.code AS course_code,
        sc.name AS school_name,
        g.cabinet
      FROM attendance a
      JOIN student_group_course sgc ON sgc.id = a.enrollment_id
      JOIN users u ON u.id = sgc.student_id
      LEFT JOIN courses c ON c.id = sgc.course_id
      LEFT JOIN groups g ON g.id = sgc.group_id
      LEFT JOIN schools sc ON sc.id = g.school_id
      ${roleFilter}
      ORDER BY a.attendance_date DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении истории студентов:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const createAttendanceRecord = async (req, res) => {
  try {
    if (!ensureAdminOrTeacher(req, res)) return;

    const {
      lesson_id,
      enrollment_id,
      attendance_date,
      record_type,
      status,
      duration_value,
      format,
      topic,
      note,
    } = req.body;

    if (!enrollment_id) {
      return res.status(400).json({ message: "Не указан enrollment_id" });
    }

    const hasEnrollmentAccess = await canAccessEnrollment(
      pool,
      req.user,
      enrollment_id
    );

    if (!hasEnrollmentAccess) {
      return res.status(403).json({
        message: "Вы можете добавлять записи только своим ученикам",
      });
    }

    if (lesson_id) {
      const hasLessonAccess = await canAccessLesson(pool, req.user, lesson_id);

      if (!hasLessonAccess) {
        return res.status(403).json({
          message: "Вы можете добавлять посещаемость только к своим занятиям",
        });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO attendance (
        lesson_id,
        enrollment_id,
        attendance_date,
        record_type,
        status,
        duration_value,
        format,
        topic,
        note
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        lesson_id || null,
        enrollment_id,
        attendance_date,
        record_type,
        status,
        duration_value,
        format || "offline",
        topic || null,
        note || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка при добавлении записи посещаемости:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const updateAttendanceRecord = async (req, res) => {
  try {
    if (!ensureAdminOrTeacher(req, res)) return;

    const { attendanceId } = req.params;

    const hasAccess = await canAccessAttendance(pool, req.user, attendanceId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете редактировать только посещаемость своих учеников",
      });
    }

    const {
      attendance_date,
      record_type,
      status,
      duration_value,
      format,
      topic,
      note,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE attendance
      SET
        attendance_date = $1,
        record_type = $2,
        status = $3,
        duration_value = $4,
        format = $5,
        topic = $6,
        note = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        attendance_date,
        record_type,
        status,
        duration_value,
        format || "offline",
        topic || null,
        note || null,
        attendanceId,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка при редактировании записи посещаемости:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const updateLesson = async (req, res) => {
  try {
    if (!ensureAdminOrTeacher(req, res)) return;

    const { lessonId } = req.params;
    const { lesson_date, note } = req.body;

    const hasAccess = await canAccessLesson(pool, req.user, lessonId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете редактировать только свои занятия",
      });
    }

    const result = await pool.query(
      `
      UPDATE lessons
      SET
        lesson_date = $1,
        note = $2
      WHERE id = $3
      RETURNING *
      `,
      [lesson_date, note || null, lessonId]
    );

    await pool.query(
      `
      UPDATE attendance
      SET attendance_date = $1
      WHERE lesson_id = $2
      `,
      [lesson_date, lessonId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка при обновлении занятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const deleteAttendanceRecord = async (req, res) => {
  try {
    if (!ensureAdminOrTeacher(req, res)) return;

    const { attendanceId } = req.params;

    const hasAccess = await canAccessAttendance(pool, req.user, attendanceId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете удалять только посещаемость своих учеников",
      });
    }

    await pool.query(
      `
      DELETE FROM attendance
      WHERE id = $1
      `,
      [attendanceId]
    );

    res.json({ message: "Запись посещаемости удалена" });
  } catch (error) {
    console.error("Ошибка при удалении записи посещаемости:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const deleteLesson = async (req, res) => {
  try {
    if (!ensureAdminOrTeacher(req, res)) return;

    const { lessonId } = req.params;

    const hasAccess = await canAccessLesson(pool, req.user, lessonId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете удалять только свои занятия",
      });
    }

    await pool.query(
      `
      DELETE FROM lessons
      WHERE id = $1
      `,
      [lessonId]
    );

    res.json({ message: "Занятие удалено" });
  } catch (error) {
    console.error("Ошибка при удалении занятия:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const getActiveEnrollments = async (req, res) => {
  try {
    if (!ensureReadHistoryAccess(req, res)) return;

    const params = [];
    let roleFilter = "";

    if (req.user.role === "teacher") {
      params.push(req.user.id);
      roleFilter = "AND g.teacher_id = $1";
    }

    if (req.user.role === "parent") {
      params.push(req.user.id);
      roleFilter = `
        AND EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = sgc.student_id
            AND ps_filter.parent_id = $1
        )
      `;
    }

    if (req.user.role === "student") {
      params.push(req.user.id);
      roleFilter = "AND sgc.student_id = $1";
    }

    const result = await pool.query(
      `
      SELECT
        sgc.id AS enrollment_id,
        sgc.student_id,
        u.full_name AS student_name,
        c.code AS course_code,
        sc.name AS school_name,
        g.cabinet
      FROM student_group_course sgc
      JOIN users u ON u.id = sgc.student_id
      LEFT JOIN courses c ON c.id = sgc.course_id
      LEFT JOIN groups g ON g.id = sgc.group_id
      LEFT JOIN schools sc ON sc.id = g.school_id
      WHERE sgc.status = 'активен'
        ${roleFilter}
      ORDER BY u.full_name
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении активных зачислений:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

module.exports = {
  getLessons,
  createLesson,
  getStudentsForGroup,
  getLessonAttendance,
  getStudentHistory,
  createAttendanceRecord,
  updateAttendanceRecord,
  updateLesson,
  deleteAttendanceRecord,
  deleteLesson,
  getActiveEnrollments,
};