import { useEffect, useState } from "react";
import "../../style/Modal.css";
import type { LessonItem } from "../HistoryPage";

const API_URL = import.meta.env.VITE_API_URL;

type AttendanceStatus = "present" | "absent_excused" | "absent_unexcused";
type DurationValue = 0 | 0.5 | 1;
type LessonFormat = "offline" | "online";

type StudentItem = {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  course_code: string | null;
};

type EnrollmentOption = {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  course_code: string | null;
  school_name: string | null;
  cabinet: string | null;
};

type AttendanceItem = {
  id: number;
  lesson_id: number;
  enrollment_id: number;
  attendance_date: string;
  record_type: "lesson" | "makeup" | "additional";
  status: AttendanceStatus;
  duration_value: DurationValue;
  format: LessonFormat;
  topic: string | null;
  note: string | null;
  student_name: string;
  course_code: string | null;
};

type LessonDetailsModalProps = {
  lesson: LessonItem | null;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
  userRole?: string;
};

const toInputDate = (date: string | null | undefined) => {
  if (!date) return "";
  return date.slice(0, 10);
};

export const LessonDetailsModal = ({
  lesson,
  onClose,
  onSuccess,
  token,
  userRole,
}: LessonDetailsModalProps) => {
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [lessonDate, setLessonDate] = useState("");
  const [lessonNote, setLessonNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [groupStudents, setGroupStudents] = useState<StudentItem[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<EnrollmentOption[]>([]);
  const [temporaryEnrollmentId, setTemporaryEnrollmentId] = useState("");

  const lessonId = lesson?.id ?? null;
  const canEdit = userRole === "admin" || userRole === "teacher";

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error("Нет токена авторизации");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "Ошибка запроса");
    }

    return data;
  };

  const fetchAttendance = async () => {
    if (!lessonId) return;

    try {
      const data = await fetchWithAuth(
        `${API_URL}/history/lessons/${lessonId}/attendance`
      );

      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при получении посещаемости:", error);
    }
  };

  const fetchGroupStudents = async () => {
    if (!lesson) return;

    try {
      const data = await fetchWithAuth(
        `${API_URL}/history/groups/${lesson.group_id}/students`
      );

      setGroupStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при загрузке учеников группы:", error);
    }
  };

  const fetchAllEnrollments = async () => {
    if (!canEdit) return;

    try {
      const data = await fetchWithAuth(`${API_URL}/history/enrollments`);
      setAllEnrollments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при загрузке всех учеников:", error);
    }
  };

  useEffect(() => {
    if (!lesson) return;

    setLessonDate(toInputDate(lesson.lesson_date));
    setLessonNote(lesson.note || "");
    setIsEditing(false);
    setTemporaryEnrollmentId("");

    fetchAttendance();
    fetchGroupStudents();

    if (canEdit) {
      fetchAllEnrollments();
    } else {
      setAllEnrollments([]);
    }
  }, [lesson, canEdit]);

  const updateAttendanceItem = (
    attendanceId: number,
    field: "status" | "duration_value" | "format" | "topic" | "note",
    value: AttendanceStatus | DurationValue | LessonFormat | string
  ) => {
    if (!canEdit) return;

    setAttendance((prev) =>
      prev.map((item) => {
        if (item.id !== attendanceId) return item;

        const updated = {
          ...item,
          [field]: value,
        };

        if (field === "status" && value === "present") {
          if (Number(updated.duration_value) === 0) {
            updated.duration_value = 1;
          }
        }

        if (
          field === "status" &&
          (value === "absent_excused" || value === "absent_unexcused")
        ) {
          updated.duration_value = 0;
        }

        return updated;
      })
    );
  };

  const handleSave = async () => {
    if (!lessonId || !canEdit) return;

    try {
      await fetchWithAuth(`${API_URL}/history/lessons/${lessonId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_date: lessonDate,
          note: lessonNote.trim() || null,
        }),
      });

      for (const item of attendance) {
        await fetchWithAuth(`${API_URL}/history/attendance/${item.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attendance_date: lessonDate,
            record_type: "lesson",
            status: item.status,
            duration_value: Number(item.duration_value),
            format: item.format,
            topic: item.topic?.trim() || null,
            note: item.note?.trim() || null,
          }),
        });
      }

      await fetchAttendance();
      await onSuccess();
      setIsEditing(false);
    } catch (error) {
      console.error("Ошибка при сохранении занятия:", error);
      alert("Не удалось сохранить изменения");
    }
  };

  const handleCancel = async () => {
    if (!lesson) return;

    setLessonDate(toInputDate(lesson.lesson_date));
    setLessonNote(lesson.note || "");
    setTemporaryEnrollmentId("");
    await fetchAttendance();
    setIsEditing(false);
  };

  const handleDeleteLesson = async () => {
    if (!lessonId || !canEdit) return;

    const isConfirmed = confirm(
      "Удалить занятие? Все записи посещаемости этого занятия тоже удалятся."
    );

    if (!isConfirmed) return;

    try {
      await fetchWithAuth(`${API_URL}/history/lessons/${lessonId}`, {
        method: "DELETE",
      });

      await onSuccess();
      onClose();
    } catch (error) {
      console.error("Ошибка при удалении занятия:", error);
      alert("Не удалось удалить занятие");
    }
  };

  const handleAddTemporaryStudent = async () => {
    if (!lessonId || !temporaryEnrollmentId || !canEdit) return;

    const enrollmentId = Number(temporaryEnrollmentId);

    const alreadyExists = attendance.some(
      (item) => Number(item.enrollment_id) === enrollmentId
    );

    if (alreadyExists) {
      alert("Этот ученик уже есть в занятии");
      return;
    }

    try {
      await fetchWithAuth(`${API_URL}/history/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_id: lessonId,
          enrollment_id: enrollmentId,
          attendance_date: lessonDate,
          record_type: "lesson",
          status: "present",
          duration_value: 1,
          format: "offline",
          topic: null,
          note: "Временный ученик",
        }),
      });

      setTemporaryEnrollmentId("");
      await fetchAttendance();
    } catch (error) {
      console.error("Ошибка при добавлении временного ученика:", error);
      alert("Не удалось добавить временного ученика");
    }
  };

  const handleDeleteTemporaryStudent = async (attendanceId: number) => {
    if (!canEdit) return;

    const isConfirmed = confirm("Удалить временного ученика из этого занятия?");
    if (!isConfirmed) return;

    try {
      await fetchWithAuth(
        `${API_URL}/history/attendance/${attendanceId}`,
        {
          method: "DELETE",
        }
      );

      await fetchAttendance();
    } catch (error) {
      console.error("Ошибка при удалении временного ученика:", error);
      alert("Не удалось удалить временного ученика");
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    if (status === "present") return "присутствовал";
    if (status === "absent_excused") return "уважительная";
    return "неуважительная";
  };

  const getDurationLabel = (value: DurationValue) => {
    if (Number(value) === 1) return "1 — полное";
    if (Number(value) === 0.5) return "0.5 — половина";
    return "0 — отсутствовал";
  };

  const getFormatLabel = (format: LessonFormat) => {
    return format === "online" ? "онлайн" : "очно";
  };

  if (!lesson) return null;

  const groupEnrollmentIds = groupStudents.map((student) =>
    Number(student.enrollment_id)
  );

  const temporaryAttendance = attendance.filter(
    (item) => !groupEnrollmentIds.includes(Number(item.enrollment_id))
  );

  return (
    <div className="modal-overlay">
      <div className="modal modal--scrollable">
        <div className="modal__header">
          <h2 className="modal__title">Занятие</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal__body modal__body--scroll">
          <div className="modal__field">
            <label className="modal__label">Группа</label>
            <div className="modal__staticValue">
              {lesson.school_name}-{lesson.cabinet}
            </div>
          </div>

          <div className="modal__field">
            <label className="modal__label">Преподаватель</label>
            <div className="modal__staticValue">{lesson.teacher_name}</div>
          </div>

          <div className="modal__field">
            <label className="modal__label">Дата занятия</label>

            {isEditing && canEdit ? (
              <input
                className="modal__input"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
              />
            ) : (
              <div className="modal__staticValue">{lessonDate || "—"}</div>
            )}
          </div>

          {isEditing && canEdit && (
            <div className="modal__section">
              <div className="modal__sectionTitle">Временные ученики</div>

              <div className="modal__schoolRow">
                <select
                  className="modal__select"
                  value={temporaryEnrollmentId}
                  onChange={(e) => setTemporaryEnrollmentId(e.target.value)}
                >
                  <option value="">Выберите ученика</option>

                  {allEnrollments
                    .filter(
                      (enrollment) =>
                        !attendance.some(
                          (item) =>
                            Number(item.enrollment_id) ===
                            Number(enrollment.enrollment_id)
                        )
                    )
                    .map((enrollment) => (
                      <option
                        key={enrollment.enrollment_id}
                        value={enrollment.enrollment_id}
                      >
                        {enrollment.student_name}
                        {enrollment.course_code
                          ? ` — ${enrollment.course_code}`
                          : ""}
                        {enrollment.school_name
                          ? ` — ${enrollment.school_name}-${enrollment.cabinet}`
                          : ""}
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  className="modal__addSchoolButton"
                  onClick={handleAddTemporaryStudent}
                >
                  Добавить
                </button>
              </div>

              {temporaryAttendance.length > 0 && (
                <div className="modal__groupsList">
                  {temporaryAttendance.map((item) => (
                    <div key={item.id} className="modal__childCard">
                      <div className="modal__childTop">
                        <div className="modal__childInfo">
                          <div className="modal__childName">
                            {item.student_name}
                          </div>

                          <div className="modal__childGroup">
                            Временный ученик, курс: {item.course_code || "—"}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="modal__groupRemove"
                          onClick={() => handleDeleteTemporaryStudent(item.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal__field">
            <label className="modal__label">Примечание к занятию</label>

            {isEditing && canEdit ? (
              <input
                className="modal__input"
                value={lessonNote}
                onChange={(e) => setLessonNote(e.target.value)}
                placeholder="Примечание к занятию"
              />
            ) : (
              <div className="modal__staticValue">{lessonNote || "—"}</div>
            )}
          </div>

          <div className="modal__section">
            <div className="modal__sectionTitle">Посещаемость</div>

            {attendance.length === 0 ? (
              <div className="modal__hint">Нет записей посещаемости</div>
            ) : (
              <div className="modal__groupsList">
                {attendance.map((item) => (
                  <div key={item.id} className="modal__childCard">
                    <div className="modal__childInfo">
                      <div className="modal__childName">{item.student_name}</div>

                      <div className="modal__childGroup">
                        Курс: {item.course_code || "—"}
                      </div>
                    </div>

                    {isEditing && canEdit ? (
                      <div className="modal__childControls">
                        <select
                          className="modal__select"
                          value={item.status}
                          onChange={(e) =>
                            updateAttendanceItem(
                              item.id,
                              "status",
                              e.target.value as AttendanceStatus
                            )
                          }
                        >
                          <option value="present">присутствовал</option>
                          <option value="absent_excused">уважительная</option>
                          <option value="absent_unexcused">неуважительная</option>
                        </select>

                        <select
                          className="modal__select"
                          value={item.duration_value}
                          onChange={(e) =>
                            updateAttendanceItem(
                              item.id,
                              "duration_value",
                              Number(e.target.value) as DurationValue
                            )
                          }
                        >
                          <option value={1}>1 — полное</option>
                          <option value={0.5}>0.5 — половина</option>
                          <option value={0}>0 — отсутствовал</option>
                        </select>

                        <select
                          className="modal__select"
                          value={item.format}
                          onChange={(e) =>
                            updateAttendanceItem(
                              item.id,
                              "format",
                              e.target.value as LessonFormat
                            )
                          }
                        >
                          <option value="offline">очно</option>
                          <option value="online">онлайн</option>
                        </select>

                        <input
                          className="modal__input"
                          value={item.topic || ""}
                          onChange={(e) =>
                            updateAttendanceItem(item.id, "topic", e.target.value)
                          }
                          placeholder="Тема ученика"
                        />

                        <input
                          className="modal__input"
                          value={item.note || ""}
                          onChange={(e) =>
                            updateAttendanceItem(item.id, "note", e.target.value)
                          }
                          placeholder="Примечание"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="modal__childGroup">
                          Статус: {getStatusLabel(item.status)}
                        </div>

                        <div className="modal__childGroup">
                          Объём: {getDurationLabel(item.duration_value)}
                        </div>

                        <div className="modal__childGroup">
                          Формат: {getFormatLabel(item.format)}
                        </div>

                        <div className="modal__childGroup">
                          Тема: {item.topic || "—"}
                        </div>

                        <div className="modal__childGroup">
                          Примечание: {item.note || "—"}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal__footer">
          {isEditing && canEdit ? (
            <>
              <button
                type="button"
                className="modal__button modal__button--secondary"
                onClick={handleCancel}
              >
                Отмена
              </button>

              <button
                type="button"
                className="modal__button modal__button--primary"
                onClick={handleSave}
              >
                Сохранить
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  className="modal__button modal__button--secondary"
                  onClick={handleDeleteLesson}
                >
                  Удалить
                </button>
              )}

              <button
                type="button"
                className="modal__button modal__button--secondary"
                onClick={onClose}
              >
                Закрыть
              </button>

              {canEdit && (
                <button
                  type="button"
                  className="modal__button modal__button--primary"
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};