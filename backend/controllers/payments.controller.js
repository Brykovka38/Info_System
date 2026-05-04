const pool = require("../db");

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

  return false;
};

const getPayments = async (req, res) => {
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

    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const search = req.query.search?.trim() || "";
    const sort = req.query.sort || null;

    if (!month || month < 1 || month > 12) {
      return res.status(400).json({ message: "Некорректный month" });
    }

    if (!year || year < 2000) {
      return res.status(400).json({ message: "Некорректный year" });
    }

    let orderBy = `u.full_name ASC`;

    if (sort === "По алфавиту") {
      orderBy = `u.full_name ASC`;
    } else if (sort === "По времени") {
      orderBy = `p.payment_date DESC NULLS LAST, u.full_name ASC`;
    } else if (sort === "По филиалу") {
      orderBy = `sc.name ASC NULLS LAST, u.full_name ASC`;
    } else if (sort === "По препод.") {
      orderBy = `teacher_user.full_name ASC NULLS LAST, u.full_name ASC`;
    }

    const params = [month, year, search];
    let roleFilter = "";

    if (currentUser.role === "teacher") {
      params.push(currentUser.id);
      roleFilter = "AND g.teacher_id = $4";
    }

    if (currentUser.role === "parent") {
      params.push(currentUser.id);
      roleFilter = `
        AND EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = s.user_id
            AND ps_filter.parent_id = $4
        )
      `;
    }

    const query = `
      SELECT
        sgc.id AS enrollment_id,
        s.user_id AS student_id,
        u.full_name,

        g.id AS group_id,
        sc.name AS school_name,
        g.cabinet,

        sc.name || '-' || g.cabinet || ' (' ||
        TO_CHAR(MIN(gs.start_time), 'HH24:MI') || '–' ||
        TO_CHAR(MIN(gs.end_time), 'HH24:MI') || ')' AS group_name,

        teacher_user.full_name AS teacher_name,

        p.id AS payment_id,
        p.payment_date,
        p.payment_method,
        COALESCE(p.status, 'не оплачено') AS status,
        COALESCE(p.amount, 0) AS amount,
        COALESCE(p.note, '') AS note,

        EXISTS (
          SELECT 1
          FROM parent_student ps
          WHERE ps.student_id = s.user_id
            AND ps.benefit = TRUE
        ) AS has_benefit

      FROM student_group_course sgc
      JOIN students s
        ON s.user_id = sgc.student_id
      JOIN users u
        ON u.id = s.user_id

      LEFT JOIN groups g
        ON g.id = sgc.group_id
      LEFT JOIN schools sc
        ON sc.id = g.school_id
      LEFT JOIN group_schedule gs
        ON gs.group_id = g.id

      LEFT JOIN teachers t
        ON t.user_id = g.teacher_id
      LEFT JOIN users teacher_user
        ON teacher_user.id = t.user_id

      LEFT JOIN payments p
        ON p.enrollment_id = sgc.id
        AND p.payment_month = $1
        AND p.payment_year = $2

      WHERE
        sgc.status = 'активен'
        ${roleFilter}
        AND (
          $3 = ''
          OR u.full_name ILIKE '%' || $3 || '%'
          OR (sc.name || '-' || g.cabinet) ILIKE '%' || $3 || '%'
        )

      GROUP BY
        sgc.id,
        s.user_id,
        u.full_name,
        g.id,
        sc.name,
        g.cabinet,
        teacher_user.full_name,
        p.id,
        p.payment_date,
        p.payment_method,
        p.status,
        p.amount,
        p.note

      ORDER BY ${orderBy};
    `;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error("Ошибка при получении оплат:", error);
    res.status(500).json({ message: "Ошибка сервера при получении оплат" });
  }
};

const createPayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (currentUser.role !== "admin" && currentUser.role !== "teacher") {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    const {
      enrollment_id,
      payment_date,
      payment_months,
      payment_year,
      monthly_amount,
      payment_method,
      status,
      note,
    } = req.body;

    if (!enrollment_id) {
      return res.status(400).json({ message: "Не указан enrollment_id" });
    }

    if (!payment_date) {
      return res.status(400).json({ message: "Не указана дата платежа" });
    }

    if (!Array.isArray(payment_months) || payment_months.length === 0) {
      return res.status(400).json({ message: "Не выбраны месяцы оплаты" });
    }

    const invalidMonth = payment_months.some(
      (month) => !Number.isInteger(month) || month < 1 || month > 12
    );

    if (invalidMonth) {
      return res.status(400).json({ message: "Некорректные месяцы оплаты" });
    }

    if (!payment_year || payment_year < 2000) {
      return res.status(400).json({ message: "Некорректный payment_year" });
    }

    if (
      monthly_amount === undefined ||
      monthly_amount === null ||
      Number(monthly_amount) < 0
    ) {
      return res.status(400).json({ message: "Некорректная сумма за месяц" });
    }

    if (!payment_method || !["наличные", "безналичные"].includes(payment_method)) {
      return res.status(400).json({ message: "Некорректный способ оплаты" });
    }

    if (!status || !["оплачено", "частично", "не оплачено"].includes(status)) {
      return res.status(400).json({ message: "Некорректный статус оплаты" });
    }

    const enrollmentResult = await client.query(
      `
      SELECT id
      FROM student_group_course
      WHERE id = $1
      `,
      [enrollment_id]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ message: "Зачисление не найдено" });
    }

    const hasAccess = await canAccessEnrollment(client, currentUser, enrollment_id);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Вы можете вносить оплату только за своих учеников",
      });
    }

    await client.query("BEGIN");

    const createdPayments = [];

    for (const month of payment_months) {
      const insertQuery = `
        INSERT INTO payments (
          enrollment_id,
          payment_date,
          payment_month,
          payment_year,
          amount,
          payment_method,
          status,
          note
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const values = [
        enrollment_id,
        payment_date,
        month,
        payment_year,
        monthly_amount,
        payment_method,
        status,
        note || "",
      ];

      const result = await client.query(insertQuery, values);
      createdPayments.push(result.rows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json(createdPayments);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Ошибка при создании оплат:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Один из выбранных месяцев уже имеет запись об оплате",
      });
    }

    res.status(500).json({ message: "Ошибка сервера при создании оплат" });
  } finally {
    client.release();
  }
};

const updatePayment = async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: "Пользователь не авторизован" });
    }

    if (currentUser.role !== "admin" && currentUser.role !== "teacher") {
      return res.status(403).json({ message: "Недостаточно прав" });
    }

    const paymentId = Number(req.params.id);

    const {
      enrollment_id,
      payment_date,
      payment_month,
      payment_year,
      amount,
      payment_method,
      status,
      note,
    } = req.body;

    if (!paymentId) {
      return res.status(400).json({ message: "Некорректный id оплаты" });
    }

    if (!enrollment_id) {
      return res.status(400).json({ message: "Не указан enrollment_id" });
    }

    if (!payment_date) {
      return res.status(400).json({ message: "Не указана дата платежа" });
    }

    if (!payment_month || payment_month < 1 || payment_month > 12) {
      return res.status(400).json({ message: "Некорректный payment_month" });
    }

    if (!payment_year || payment_year < 2000) {
      return res.status(400).json({ message: "Некорректный payment_year" });
    }

    if (amount === undefined || amount === null || Number(amount) < 0) {
      return res.status(400).json({ message: "Некорректная сумма" });
    }

    if (!payment_method || !["наличные", "безналичные"].includes(payment_method)) {
      return res.status(400).json({ message: "Некорректный способ оплаты" });
    }

    if (!status || !["оплачено", "частично", "не оплачено"].includes(status)) {
      return res.status(400).json({ message: "Некорректный статус оплаты" });
    }

    const existingPayment = await pool.query(
      `
      SELECT id, enrollment_id
      FROM payments
      WHERE id = $1
      `,
      [paymentId]
    );

    if (existingPayment.rows.length === 0) {
      return res.status(404).json({ message: "Оплата не найдена" });
    }

    const canAccessOldEnrollment = await canAccessEnrollment(
      pool,
      currentUser,
      existingPayment.rows[0].enrollment_id
    );

    const canAccessNewEnrollment = await canAccessEnrollment(
      pool,
      currentUser,
      enrollment_id
    );

    if (!canAccessOldEnrollment || !canAccessNewEnrollment) {
      return res.status(403).json({
        message: "Вы можете редактировать оплату только своих учеников",
      });
    }

    const updateQuery = `
      UPDATE payments
      SET
        enrollment_id = $1,
        payment_date = $2,
        payment_month = $3,
        payment_year = $4,
        amount = $5,
        payment_method = $6,
        status = $7,
        note = $8
      WHERE id = $9
      RETURNING *;
    `;

    const values = [
      enrollment_id,
      payment_date,
      payment_month,
      payment_year,
      amount,
      payment_method,
      status,
      note || "",
      paymentId,
    ];

    const result = await pool.query(updateQuery, values);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ошибка при обновлении оплаты:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Оплата за этот месяц для данного зачисления уже существует",
      });
    }

    res.status(500).json({ message: "Ошибка сервера при обновлении оплаты" });
  }
};

const getPaymentsPeriod = async (req, res) => {
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

    const year = Number(req.query.year);
    const search = req.query.search?.trim() || "";

    if (!year || year < 2000) {
      return res.status(400).json({ message: "Некорректный year" });
    }

    const params = [year, search];
    let roleFilter = "";

    if (currentUser.role === "teacher") {
      params.push(currentUser.id);
      roleFilter = "AND g.teacher_id = $3";
    }

    if (currentUser.role === "parent") {
      params.push(currentUser.id);
      roleFilter = `
        AND EXISTS (
          SELECT 1
          FROM parent_student ps_filter
          WHERE ps_filter.student_id = s.user_id
            AND ps_filter.parent_id = $3
        )
      `;
    }

    const query = `
      SELECT
        sgc.id AS enrollment_id,
        s.user_id AS student_id,
        u.full_name,
        g.id AS group_id,

        sc.name || '-' || g.cabinet || ' (' ||
        TO_CHAR(MIN(gs.start_time), 'HH24:MI') || '–' ||
        TO_CHAR(MIN(gs.end_time), 'HH24:MI') || ')' AS group_name,

        p.payment_month,
        p.status,
        p.amount

      FROM student_group_course sgc
      JOIN students s
        ON s.user_id = sgc.student_id
      JOIN users u
        ON u.id = s.user_id
      LEFT JOIN groups g
        ON g.id = sgc.group_id
      LEFT JOIN schools sc
        ON sc.id = g.school_id
      LEFT JOIN group_schedule gs
        ON gs.group_id = g.id
      LEFT JOIN payments p
        ON p.enrollment_id = sgc.id
        AND p.payment_year = $1
        AND p.payment_month IN (9, 10, 11, 12, 1, 2, 3, 4, 5)

      WHERE
        sgc.status = 'активен'
        ${roleFilter}
        AND (
          $2 = ''
          OR u.full_name ILIKE '%' || $2 || '%'
          OR (sc.name || '-' || g.cabinet) ILIKE '%' || $2 || '%'
        )

      GROUP BY
        sgc.id,
        s.user_id,
        u.full_name,
        g.id,
        sc.name,
        g.cabinet,
        p.payment_month,
        p.status,
        p.amount

      ORDER BY u.full_name ASC, p.payment_month ASC;
    `;

    const result = await pool.query(query, params);

    const grouped = {};

    for (const row of result.rows) {
      if (!grouped[row.enrollment_id]) {
        grouped[row.enrollment_id] = {
          enrollment_id: row.enrollment_id,
          student_id: row.student_id,
          full_name: row.full_name,
          group_id: row.group_id,
          group_name: row.group_name,
          months: {
            9: null,
            10: null,
            11: null,
            12: null,
            1: null,
            2: null,
            3: null,
            4: null,
            5: null,
          },
        };
      }

      if (row.payment_month) {
        grouped[row.enrollment_id].months[row.payment_month] = {
          status: row.status,
          amount: row.amount,
        };
      }
    }

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("Ошибка при получении оплат за период:", error);
    res.status(500).json({
      message: "Ошибка сервера при получении оплат за период",
    });
  }
};

module.exports = {
  getPayments,
  createPayment,
  updatePayment,
  getPaymentsPeriod,
};