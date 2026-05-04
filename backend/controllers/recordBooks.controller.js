const pool = require("../db");

const canAccessStudent = async (clientOrPool, user, studentId) => {
  if (user?.role === "admin") {
    return true;
  }

  if (user?.role === "teacher") {
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
      [studentId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user?.role === "parent") {
    const result = await clientOrPool.query(
      `
      SELECT 1
      FROM parent_student ps
      WHERE ps.student_id = $1
        AND ps.parent_id = $2
      LIMIT 1
      `,
      [studentId, user.id]
    );

    return result.rows.length > 0;
  }

  return false;
};

const getRecordBooks = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (
      currentUser.role !== "admin" &&
      currentUser.role !== "teacher" &&
      currentUser.role !== "parent"
    ) {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    const params = [];
    let roleFilter = "";

    if (currentUser.role === "teacher") {
      params.push(currentUser.id);
      roleFilter = "AND g.teacher_id = $1";
    }

    if (currentUser.role === "parent") {
      params.push(currentUser.id);
      roleFilter = `
        AND EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = s.user_id
            AND ps_filter.parent_id = $1
        )
      `;
    }

    const result = await pool.query(
      `
      SELECT
        s.user_id AS student_id,
        u.full_name,

        COALESCE(
          sc.name || '-' || g.cabinet || ' (' ||
          TO_CHAR(MIN(gs.start_time), 'HH24:MI') || '–' ||
          TO_CHAR(MIN(gs.end_time), 'HH24:MI') || ')',
          '—'
        ) AS group_name,

        rb.id AS record_book_id,
        COALESCE(rb.has_record_book, FALSE) AS has_record_book,
        rb.payment_date,
        COALESCE(rb.amount, 0) AS amount,
        rb.payment_method,
        COALESCE(rb.note, '') AS note

      FROM students s
      JOIN users u
        ON u.id = s.user_id

      LEFT JOIN student_group_course sgc
        ON sgc.student_id = s.user_id
        AND sgc.status = 'активен'

      LEFT JOIN groups g
        ON g.id = sgc.group_id

      LEFT JOIN schools sc
        ON sc.id = g.school_id

      LEFT JOIN group_schedule gs
        ON gs.group_id = g.id

      LEFT JOIN record_books rb
        ON rb.student_id = s.user_id

      WHERE u.role = 'student'
        ${roleFilter}

      GROUP BY
        s.user_id,
        u.full_name,
        g.id,
        sc.name,
        g.cabinet,
        rb.id,
        rb.has_record_book,
        rb.payment_date,
        rb.amount,
        rb.payment_method,
        rb.note

      ORDER BY u.full_name ASC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении зачётных книжек:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

const saveRecordBook = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    // Родитель только смотрит, редактировать зачётную книжку нельзя
    if (currentUser.role !== "admin" && currentUser.role !== "teacher") {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    const {
      student_id,
      has_record_book,
      payment_date,
      amount,
      payment_method,
      note,
    } = req.body;

    if (!student_id) {
      return res.status(400).json({ message: "Не указан student_id" });
    }

    if (typeof has_record_book !== "boolean") {
      return res.status(400).json({ message: "Некорректное значение наличия" });
    }

    if (
      payment_method &&
      !["наличные", "безналичные"].includes(payment_method)
    ) {
      return res.status(400).json({ message: "Некорректный способ оплаты" });
    }

    const hasAccess = await canAccessStudent(pool, currentUser, student_id);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете редактировать зачётную книжку только своего ученика",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO record_books (
        student_id,
        has_record_book,
        payment_date,
        amount,
        payment_method,
        note
      )
      VALUES ($1, $2, $3, $4, $5, $6)

      ON CONFLICT (student_id)
      DO UPDATE SET
        has_record_book = EXCLUDED.has_record_book,
        payment_date = EXCLUDED.payment_date,
        amount = EXCLUDED.amount,
        payment_method = EXCLUDED.payment_method,
        note = EXCLUDED.note

      RETURNING *
      `,
      [
        student_id,
        has_record_book,
        payment_date || null,
        amount || 0,
        payment_method || null,
        note || "",
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка при сохранении зачётной книжки:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
};

module.exports = {
  getRecordBooks,
  saveRecordBook,
};