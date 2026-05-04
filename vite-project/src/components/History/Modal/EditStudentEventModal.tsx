import { useEffect, useState } from "react";
import "../../style/Modal.css";
import type { StudentHistoryItem } from "../HistoryPage";

const API_URL = import.meta.env.VITE_API_URL;

type AttendanceStatus = "present" | "absent_excused" | "absent_unexcused";
type DurationValue = 0 | 0.5 | 1;
type LessonFormat = "offline" | "online";
type RecordType = "lesson" | "makeup" | "additional";

type EditStudentEventModalProps = {
  event: StudentHistoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
  token: string | null;
};

const toInputDate = (date: string | null | undefined) => {
  if (!date) return "";
  return date.slice(0, 10);
};

export const EditStudentEventModal = ({
  event,
  onClose,
  onSuccess,
  token,
}: EditStudentEventModalProps) => {
  const [attendanceDate, setAttendanceDate] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("lesson");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [durationValue, setDurationValue] = useState<DurationValue>(1);
  const [format, setFormat] = useState<LessonFormat>("offline");
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!event) return;

    setAttendanceDate(toInputDate(event.attendance_date));
    setRecordType(event.record_type);
    setStatus(event.status);
    setDurationValue(Number(event.duration_value) as DurationValue);
    setFormat(event.format);
    setTopic(event.topic || "");
    setNote(event.note || "");
  }, [event]);

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

  const handleSave = async () => {
    if (!event) return;

    try {
      await fetchWithAuth(
        `${API_URL}/history/attendance/${event.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attendance_date: attendanceDate,
            record_type: recordType,
            status,
            duration_value: durationValue,
            format,
            topic: topic.trim() || null,
            note: note.trim() || null,
          }),
        }
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Ошибка при редактировании записи:", error);
      alert("Не удалось сохранить изменения");
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    const isConfirmed = confirm("Удалить эту запись?");
    if (!isConfirmed) return;

    try {
      await fetchWithAuth(
        `${API_URL}/history/attendance/${event.id}`,
        {
          method: "DELETE",
        }
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Ошибка при удалении записи:", error);
      alert("Не удалось удалить запись");
    }
  };

  
  if (!event) return null;

  return (
    <div className="modal-overlay">
      <div className="modal modal--scrollable">
        <div className="modal__header">
          <h2 className="modal__title">Редактировать запись</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal__body modal__body--scroll">
          <div className="modal__field">
            <label className="modal__label">Ученик</label>
            <div className="modal__staticValue">{event.student_name}</div>
          </div>

          <div className="modal__field">
            <label className="modal__label">Дата</label>
            <input
              className="modal__input"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Тип записи</label>
            <select
              className="modal__select"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value as RecordType)}
            >
              <option value="lesson">обычное занятие</option>
              <option value="makeup">отработка</option>
              <option value="additional">дополнительное занятие</option>
            </select>
          </div>

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

          <div className="modal__field">
            <label className="modal__label">Тема</label>
            <input
              className="modal__input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Тема ученика"
            />
          </div>

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
            onClick={handleDelete}
          >
            Удалить
          </button>

          <button
            type="button"
            className="modal__button modal__button--secondary"
            onClick={onClose}
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
        </div>
      </div>
    </div>
  );
};