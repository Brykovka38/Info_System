import { useEffect, useState } from "react";
import "../../style/Modal.css";

const API_URL = import.meta.env.VITE_API_URL;

type GroupItem = {
  id: number | string;
  group_name?: string;
  school_name?: string;
  cabinet?: string;
  teacher_id?: number | string | null;
  teacher_name?: string | null;
};

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

type AttendanceStatus = "present" | "absent_excused" | "absent_unexcused";
type DurationValue = 0 | 0.5 | 1;
type LessonFormat = "offline" | "online";

type AttendanceValue = {
  status: AttendanceStatus;
  duration_value: DurationValue;
  format: LessonFormat;
  topic: string;
  note: string;
};

type AddLessonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialGroupId?: number | null;
  initialDate?: string;
  token: string | null;
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

export const AddLessonModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialGroupId,
  initialDate,
  token,
}: AddLessonModalProps) => {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<EnrollmentOption[]>([]);

  const [groupId, setGroupId] = useState("");
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [lessonDate, setLessonDate] = useState(getTodayDate());
  const [note, setNote] = useState("");
  const [temporaryEnrollmentId, setTemporaryEnrollmentId] = useState("");
  const [temporaryEnrollmentIds, setTemporaryEnrollmentIds] = useState<number[]>([]);

  const [attendance, setAttendance] = useState<Record<number, AttendanceValue>>({});

  const fetchGroups = async () => {
    try {
      const data = await fetchWithAuth(`${API_URL}/groups`);
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при загрузке групп:", error);
    }
  };

  const fetchAllEnrollments = async () => {
    try {
      const data = await fetchWithAuth(`${API_URL}/history/enrollments`);
      setAllEnrollments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при загрузке всех учеников:", error);
    }
  };

  const fetchStudents = async (selectedGroupId: string) => {
    try {
      const data: StudentItem[] = await fetchWithAuth(
        `${API_URL}/history/groups/${selectedGroupId}/students`
      );

      setStudents(Array.isArray(data) ? data : []);

      const initialAttendance: Record<number, AttendanceValue> = {};

      data.forEach((student) => {
        initialAttendance[student.enrollment_id] = {
          status: "present",
          duration_value: 1,
          format: "offline",
          topic: "",
          note: "",
        };
      });

      setAttendance((prev) => ({
        ...initialAttendance,
        ...Object.fromEntries(
          Object.entries(prev).filter(([key]) =>
            temporaryEnrollmentIds.includes(Number(key))
          )
        ),
      }));
    } catch (error) {
      console.error("Ошибка при загрузке учеников группы:", error);
    }
  };

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

  useEffect(() => {
    if (!isOpen) return;

    fetchGroups();
    fetchAllEnrollments();
    setLessonDate(initialDate || getTodayDate());
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (!isOpen || !initialGroupId || groups.length === 0) return;

    const value = String(initialGroupId);

    const selectedGroup = groups.find((group) => String(group.id) === value);

    setGroupId(value);

    setTeacherId(
      selectedGroup?.teacher_id !== null && selectedGroup?.teacher_id !== undefined
        ? Number(selectedGroup.teacher_id)
        : null
    );

    fetchStudents(value);
  }, [isOpen, initialGroupId, groups]);

  const handleGroupChange = (value: string) => {
    setGroupId(value);

    const selectedGroup = groups.find((group) => String(group.id) === value);

    setTeacherId(
      selectedGroup?.teacher_id !== null && selectedGroup?.teacher_id !== undefined
        ? Number(selectedGroup.teacher_id)
        : null
    );

    setTemporaryEnrollmentId("");
    setTemporaryEnrollmentIds([]);

    if (value) {
      fetchStudents(value);
    } else {
      setStudents([]);
      setAttendance({});
    }
  };

  const updateAttendance = (
    enrollmentId: number,
    field: keyof AttendanceValue,
    value: AttendanceValue[keyof AttendanceValue]
  ) => {
    setAttendance((prev) => {
      const current = prev[enrollmentId] || {
        status: "present",
        duration_value: 1,
        format: "offline",
        topic: "",
        note: "",
      };

      const next: AttendanceValue = {
        ...current,
        [field]: value,
      };

      if (field === "status" && value === "present") {
        if (next.duration_value === 0) {
          next.duration_value = 1;
        }
      }

      if (
        field === "status" &&
        (value === "absent_excused" || value === "absent_unexcused")
      ) {
        next.duration_value = 0;
      }

      return {
        ...prev,
        [enrollmentId]: next,
      };
    });
  };

  const handleAddTemporaryStudent = () => {
    if (!temporaryEnrollmentId) return;

    const id = Number(temporaryEnrollmentId);

    const enrollment = allEnrollments.find(
      (item) => Number(item.enrollment_id) === id
    );

    if (!enrollment) {
      alert("Ученик не найден");
      return;
    }

    const isAlreadyMainStudent = students.some(
      (student) => Number(student.enrollment_id) === id
    );

    const isAlreadyTemporary = temporaryEnrollmentIds.includes(id);

    if (isAlreadyMainStudent || isAlreadyTemporary) {
      alert("Этот ученик уже добавлен в занятие");
      return;
    }

    setTemporaryEnrollmentIds((prev) => [...prev, id]);

    setAttendance((prev) => ({
      ...prev,
      [id]: {
        status: "present",
        duration_value: 1,
        format: "offline",
        topic: "",
        note: "Временный ученик",
      },
    }));

    setTemporaryEnrollmentId("");
  };

  const handleRemoveTemporaryStudent = (enrollmentId: number) => {
    setTemporaryEnrollmentIds((prev) => prev.filter((id) => id !== enrollmentId));

    setAttendance((prev) => {
      const copy = { ...prev };
      delete copy[enrollmentId];
      return copy;
    });
  };

  const resetForm = () => {
    setGroupId("");
    setTeacherId(null);
    setLessonDate(getTodayDate());
    setNote("");
    setStudents([]);
    setAllEnrollments([]);
    setTemporaryEnrollmentId("");
    setTemporaryEnrollmentIds([]);
    setAttendance({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupId || teacherId === null || teacherId === undefined) {
      alert("Выберите группу с назначенным преподавателем");
      return;
    }

    if (lessonDate > getTodayDate()) {
      alert("Нельзя провести занятие будущей датой");
      return;
    }

    if (students.length === 0 && temporaryEnrollmentIds.length === 0) {
      alert("Добавьте хотя бы одного ученика");
      return;
    }

    // const temporaryStudents = temporaryEnrollmentIds
    //   .map((id) => allEnrollments.find((item) => item.enrollment_id === id))
    //   .filter(Boolean) as EnrollmentOption[];

    const allAttendanceStudents = [
      ...students.map((student) => ({
        enrollment_id: Number(student.enrollment_id),
      })),
      ...temporaryEnrollmentIds.map((id) => ({
        enrollment_id: Number(id),
      })),
    ];

    const payload = {
      group_id: Number(groupId),
      teacher_id: teacherId,
      lesson_date: lessonDate,
      note: note.trim() || null,
      attendance: allAttendanceStudents.map((student) => {
        const item = attendance[student.enrollment_id];

        return {
          enrollment_id: student.enrollment_id,
          status: item.status,
          duration_value: item.duration_value,
          format: item.format,
          topic: item.topic.trim() || null,
          note: item.note.trim() || null,
        };
      }),
    };

    try {
      await fetchWithAuth(`${API_URL}/history/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      await onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      console.error("Ошибка при сохранении занятия:", error);
      alert("Не удалось сохранить занятие");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal modal--scrollable">
        <form onSubmit={handleSubmit}>
          <div className="modal__header">
            <h2 className="modal__title">Добавить занятие</h2>
            <button type="button" className="modal__close" onClick={handleClose}>
              ×
            </button>
          </div>

          <div className="modal__body modal__body--scroll">
            <div className="modal__field">
              <label className="modal__label">Группа</label>
              <select
                className="modal__select"
                value={groupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                required
              >
                <option value="">Выберите группу</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name ||
                      `${group.school_name || "Филиал"}-${group.cabinet || ""}`}
                    {group.teacher_name ? ` — ${group.teacher_name}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Дата занятия</label>
              <input
                className="modal__input"
                type="date"
                value={lessonDate}
                max={getTodayDate()}
                onChange={(e) => setLessonDate(e.target.value)}
                required
              />
            </div>

            <div className="modal__field">
              <label className="modal__label">Примечание к занятию</label>
              <input
                className="modal__input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Например: занятие прошло онлайн"
              />
            </div>

            <div className="modal__section">
              <div className="modal__sectionTitle">Посещаемость</div>

              {students.length === 0 ? (
                <div className="modal__hint">
                  В группе нет учеников. Можно добавить временного ученика ниже.
                </div>
              ) : (
                <div className="modal__groupsList">
                  {students.map((student) => {
                    const item = attendance[student.enrollment_id];

                    return (
                      <div
                        key={student.enrollment_id}
                        className="modal__childCard"
                      >
                        <div className="modal__childTop">
                          <div className="modal__childInfo">
                            <div className="modal__childName">
                              {student.student_name}
                            </div>
                            <div className="modal__childGroup">
                              Курс: {student.course_code || "—"}
                            </div>
                          </div>
                        </div>

                        <div className="modal__childControls">
                          <select
                            className="modal__select"
                            value={item?.status || "present"}
                            onChange={(e) =>
                              updateAttendance(
                                student.enrollment_id,
                                "status",
                                e.target.value as AttendanceStatus
                              )
                            }
                          >
                            <option value="present">присутствовал</option>
                            <option value="absent_excused">
                              отсутствовал по уважительной
                            </option>
                            <option value="absent_unexcused">
                              отсутствовал без уважительной
                            </option>
                          </select>

                          <select
                            className="modal__select"
                            value={item?.duration_value ?? 1}
                            onChange={(e) =>
                              updateAttendance(
                                student.enrollment_id,
                                "duration_value",
                                Number(e.target.value) as DurationValue
                              )
                            }
                          >
                            <option value={1}>1 — полное занятие</option>
                            <option value={0.5}>0.5 — половина занятия</option>
                            <option value={0}>0 — не был</option>
                          </select>

                          <select
                            className="modal__select"
                            value={item?.format || "offline"}
                            onChange={(e) =>
                              updateAttendance(
                                student.enrollment_id,
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
                            value={item?.topic || ""}
                            onChange={(e) =>
                              updateAttendance(
                                student.enrollment_id,
                                "topic",
                                e.target.value
                              )
                            }
                            placeholder="Тема ученика"
                          />

                          <input
                            className="modal__input"
                            value={item?.note || ""}
                            onChange={(e) =>
                              updateAttendance(
                                student.enrollment_id,
                                "note",
                                e.target.value
                              )
                            }
                            placeholder="Примечание"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
                    .filter((enrollment) => !attendance[enrollment.enrollment_id])
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

              {temporaryEnrollmentIds.length > 0 && (
                <div className="modal__groupsList">
                  {temporaryEnrollmentIds.map((enrollmentId) => {
                    const enrollment = allEnrollments.find(
                      (item) => Number(item.enrollment_id) === enrollmentId
                    );

                    if (!enrollment) return null;

                    const item = attendance[enrollmentId];

                    return (
                      <div key={enrollmentId} className="modal__childCard">
                        <div className="modal__childTop">
                          <div className="modal__childInfo">
                            <div className="modal__childName">
                              {enrollment.student_name}
                            </div>
                            <div className="modal__childGroup">
                              Временный ученик
                              {enrollment.course_code
                                ? `, курс: ${enrollment.course_code}`
                                : ""}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="modal__groupRemove"
                            onClick={() =>
                              handleRemoveTemporaryStudent(enrollmentId)
                            }
                          >
                            ×
                          </button>
                        </div>

                        <div className="modal__childControls">
                          <select
                            className="modal__select"
                            value={item?.status || "present"}
                            onChange={(e) =>
                              updateAttendance(
                                enrollmentId,
                                "status",
                                e.target.value as AttendanceStatus
                              )
                            }
                          >
                            <option value="present">присутствовал</option>
                            <option value="absent_excused">
                              отсутствовал по уважительной
                            </option>
                            <option value="absent_unexcused">
                              отсутствовал без уважительной
                            </option>
                          </select>

                          <select
                            className="modal__select"
                            value={item?.duration_value ?? 1}
                            onChange={(e) =>
                              updateAttendance(
                                enrollmentId,
                                "duration_value",
                                Number(e.target.value) as DurationValue
                              )
                            }
                          >
                            <option value={1}>1 — полное занятие</option>
                            <option value={0.5}>0.5 — половина занятия</option>
                            <option value={0}>0 — не был</option>
                          </select>

                          <select
                            className="modal__select"
                            value={item?.format || "offline"}
                            onChange={(e) =>
                              updateAttendance(
                                enrollmentId,
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
                            value={item?.topic || ""}
                            onChange={(e) =>
                              updateAttendance(
                                enrollmentId,
                                "topic",
                                e.target.value
                              )
                            }
                            placeholder="Тема ученика"
                          />

                          <input
                            className="modal__input"
                            value={item?.note || ""}
                            onChange={(e) =>
                              updateAttendance(
                                enrollmentId,
                                "note",
                                e.target.value
                              )
                            }
                            placeholder="Например: пришёл в чужую группу"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="modal__button modal__button--secondary"
              onClick={handleClose}
            >
              Отмена
            </button>

            <button type="submit" className="modal__button modal__button--primary">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};