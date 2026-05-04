import { useEffect, useState } from "react";
import "../../style/Modal.css";

const API_URL = import.meta.env.VITE_API_URL;

type AttendanceStatus = "present" | "absent_excused" | "absent_unexcused";
type DurationValue = 0 | 0.5 | 1;
type LessonFormat = "offline" | "online";
type RecordType = "lesson" | "makeup" | "additional";

type StudentOption = {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  course_code: string | null;
  school_name: string | null;
  cabinet: string | null;
};

type AddStudentEventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

export const AddStudentEventModal = ({
  isOpen,
  onClose,
  onSuccess,
  token,
}: AddStudentEventModalProps) => {
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [enrollmentId, setEnrollmentId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(getTodayDate());
  const [recordType, setRecordType] = useState<RecordType>("additional");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [durationValue, setDurationValue] = useState<DurationValue>(1);
  const [format, setFormat] = useState<LessonFormat>("offline");
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");

  const fetchStudents = async () => {
    try {
      const data = await fetchWithAuth(`${API_URL}/history/enrollments`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при загрузке учеников:", error);
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
    if (isOpen) {
      fetchStudents();
    }
  }, [isOpen]);

  const handleStatusChange = (value: AttendanceStatus) => {
    setStatus(value);

    if (value === "present") {
      if (durationValue === 0) {
        setDurationValue(1);
      }
    } else {
      setDurationValue(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enrollmentId) {
      alert("Выберите ученика");
      return;
    }

    try {
      await fetchWithAuth(`${API_URL}/history/attendance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lesson_id: null,
          enrollment_id: Number(enrollmentId),
          attendance_date: attendanceDate,
          record_type: recordType,
          status,
          duration_value: durationValue,
          format,
          topic: topic.trim() || null,
          note: note.trim() || null,
        }),
      });

      onSuccess();
      onClose();

      setEnrollmentId("");
      setAttendanceDate(getTodayDate());
      setRecordType("additional");
      setStatus("present");
      setDurationValue(1);
      setFormat("offline");
      setTopic("");
      setNote("");
    } catch (error) {
      console.error("Ошибка при сохранении записи:", error);
      alert("Не удалось добавить запись");
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setEnrollmentId("");
      setAttendanceDate(getTodayDate());
      setRecordType("additional");
      setStatus("present");
      setDurationValue(1);
      setFormat("offline");
      setTopic("");
      setNote("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal modal--scrollable">
        <form onSubmit={handleSubmit}>
          <div className="modal__header">
            <h2 className="modal__title">Добавить запись ученика</h2>
            <button type="button" className="modal__close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="modal__body modal__body--scroll">
            <div className="modal__field">
              <label className="modal__label">Ученик</label>
              <select
                className="modal__select"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                required
              >
                <option value="">Выберите ученика</option>
                {students.map((student) => (
                  <option
                    key={student.enrollment_id}
                    value={student.enrollment_id}
                  >
                    {student.student_name}
                    {student.course_code ? ` — ${student.course_code}` : ""}
                    {student.school_name
                      ? ` — ${student.school_name}-${student.cabinet}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Дата</label>
              <input
                className="modal__input"
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
              />
            </div>

            {/* Тип */}
            <div className="modal__field">
              <label className="modal__label">Тип записи</label>
              <select
                className="modal__select"
                value={recordType}
                onChange={(e) =>
                  setRecordType(e.target.value as RecordType)
                }
              >
                <option value="lesson">обычное занятие</option>
                <option value="makeup">отработка</option>
                <option value="additional">дополнительное занятие</option>
              </select>
            </div>

            {/* Статус */}
            <div className="modal__field">
              <label className="modal__label">Статус</label>
              <select
                className="modal__select"
                value={status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as AttendanceStatus)
                }
              >
                <option value="present">присутствовал</option>
                <option value="absent_excused">уважительная</option>
                <option value="absent_unexcused">неуважительная</option>
              </select>
            </div>

            {/* Объём */}
            <div className="modal__field">
              <label className="modal__label">Объём</label>
              <select
                className="modal__select"
                value={durationValue}
                onChange={(e) =>
                  setDurationValue(Number(e.target.value) as DurationValue)
                }
              >
                <option value={1}>1 — полное</option>
                <option value={0.5}>0.5 — половина</option>
                <option value={0}>0 — отсутствовал</option>
              </select>
            </div>

            {/* Формат */}
            <div className="modal__field">
              <label className="modal__label">Формат</label>
              <select
                className="modal__select"
                value={format}
                onChange={(e) => setFormat(e.target.value as LessonFormat)}
              >
                <option value="offline">очно</option>
                <option value="online">онлайн</option>
              </select>
            </div>

            {/* Тема */}
            <div className="modal__field">
              <label className="modal__label">Тема</label>
              <input
                className="modal__input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Тема ученика"
              />
            </div>

            {/* Примечание */}
            <div className="modal__field">
              <label className="modal__label">Примечание</label>
              <input
                className="modal__input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Комментарий"
              />
            </div>
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="modal__button modal__button--secondary"
              onClick={onClose}
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