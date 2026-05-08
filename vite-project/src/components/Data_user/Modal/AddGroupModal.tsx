import { useEffect, useState } from "react";
import "../../style/Modal.css";

type SchoolItem = {
  id: number;
  name: string;
  full_name: string;
  address: string;
};

type TeacherItem = {
  id: number;
  full_name: string;
  course_code?: string | null;
};

type StudentItem = {
  id: number;
  full_name: string;
  course_code?: string | null;
};

type AddGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  schools: SchoolItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  onSubmit: (groupData: {
    school_id: number;
    cabinet: string;
    teacher_id: number | null;
    schedule: {
      day_of_week: string;
      start_time: string;
      end_time: string;
    }[];
    student_ids: number[];
  }) => Promise<void>;
};

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт"];
const weekendDays = ["Сб", "Вс"];

export const AddGroupModal = ({
  isOpen,
  onClose,
  schools,
  teachers,
  students,
  onSubmit,
}: AddGroupModalProps) => {
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [cabinet, setCabinet] = useState("");
  const [scheduleType, setScheduleType] = useState<"будни" | "выходной" | null>(null);

  const [day1, setDay1] = useState("");
  const [day2, setDay2] = useState("");
  const [weekendDay, setWeekendDay] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSchoolId(null);
      setCabinet("");
      setScheduleType(null);
      setDay1("");
      setDay2("");
      setWeekendDay("");
      setStartTime("");
      setEndTime("");
      setTeacherId(null);
      setSelectedStudents([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScheduleTypeChange = (type: "будни" | "выходной") => {
    setScheduleType(type);
    setDay1("");
    setDay2("");
    setWeekendDay("");
    setStartTime("");
    setEndTime("");
  };

  const toggleStudent = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async () => {
    if (!schoolId) {
      alert("Выберите филиал");
      return;
    }

    if (!cabinet.trim()) {
      alert("Введите кабинет");
      return;
    }

    if (!scheduleType) {
      alert("Выберите формат расписания");
      return;
    }

    if (!startTime || !endTime) {
      alert("Укажите время начала и окончания");
      return;
    }

    if (startTime >= endTime) {
      alert("Время окончания должно быть позже времени начала");
      return;
    }

    let schedule: {
      day_of_week: string;
      start_time: string;
      end_time: string;
    }[] = [];

    if (scheduleType === "будни") {
      if (!day1 || !day2) {
        alert("Выберите два дня недели");
        return;
      }

      if (day1 === day2) {
        alert("Дни недели не должны совпадать");
        return;
      }

      schedule = [
        {
          day_of_week: day1,
          start_time: startTime,
          end_time: endTime,
        },
        {
          day_of_week: day2,
          start_time: startTime,
          end_time: endTime,
        },
      ];
    }

    if (scheduleType === "выходной") {
      if (!weekendDay) {
        alert("Выберите день выходного");
        return;
      }

      schedule = [
        {
          day_of_week: weekendDay,
          start_time: startTime,
          end_time: endTime,
        },
      ];
    }

    await onSubmit({
      school_id: schoolId,
      cabinet: cabinet.trim(),
      teacher_id: teacherId,
      schedule,
      student_ids: selectedStudents,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Добавление группы</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal__body modal__body--scroll">
          <div className="modal__field">
            <label className="modal__label">Филиал *</label>
            <select
              className="modal__select"
              value={schoolId ?? ""}
              onChange={(e) =>
                setSchoolId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Не выбрано</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal__field">
            <label className="modal__label">Кабинет *</label>
            <input
              type="text"
              className="modal__input"
              placeholder="Например, 309"
              value={cabinet}
              onChange={(e) => setCabinet(e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Формат расписания *</label>
            <div className="modal__radioRow">
              <button
                type="button"
                className={`modal__choice ${
                  scheduleType === "будни" ? "modal__choice--active" : ""
                }`}
                onClick={() => handleScheduleTypeChange("будни")}
              >
                Будни
              </button>

              <button
                type="button"
                className={`modal__choice ${
                  scheduleType === "выходной"
                    ? "modal__choice--active"
                    : ""
                }`}
                onClick={() => handleScheduleTypeChange("выходной")}
              >
                Выходной
              </button>
            </div>
          </div>

          {scheduleType && (
            <div className="modal__section">
              <div className="modal__sectionTitle">Расписание</div>

              {scheduleType === "будни" && (
                <>
                  <div className="modal__field">
                    <label className="modal__label">День 1 *</label>
                    <select
                      className="modal__select"
                      value={day1}
                      onChange={(e) => setDay1(e.target.value)}
                    >
                      <option value="">Не выбрано</option>
                      {weekdays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="modal__field">
                    <label className="modal__label">День 2 *</label>
                    <select
                      className="modal__select"
                      value={day2}
                      onChange={(e) => setDay2(e.target.value)}
                    >
                      <option value="">Не выбрано</option>
                      {weekdays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {scheduleType === "выходной" && (
                <div className="modal__field">
                  <label className="modal__label">День *</label>
                  <select
                    className="modal__select"
                    value={weekendDay}
                    onChange={(e) => setWeekendDay(e.target.value)}
                  >
                    <option value="">Не выбрано</option>
                    {weekendDays.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal__timeRow">
                <div className="modal__field">
                  <label className="modal__label">Время начала *</label>
                  <input
                    type="time"
                    className="modal__input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>

                <div className="modal__field">
                  <label className="modal__label">Время окончания *</label>
                  <input
                    type="time"
                    className="modal__input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="modal__section">
            <div className="modal__sectionTitle">Дополнительно</div>

            <div className="modal__field">
              <label className="modal__label">Учитель</label>
              <select
                className="modal__select"
                value={teacherId ?? ""}
                onChange={(e) =>
                  setTeacherId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Не выбрано</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Ученики</label>

              <div className="modal__studentsList">
                {students.map((student) => (
                  <label key={student.id} className="modal__studentItem">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                    />
                    <div className="modal__studentMeta">
                      <span className="modal__relationName">{student.full_name}</span>
                      <span className="modal__studentCourse">
                        {student.course_code || "—"}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="modal__hint">
                Курс учеников можно поменять при редактировании
              </div>
            </div>
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
          <button
            type="button"
            className="modal__button modal__button--primary"
            onClick={handleSubmit}
          >
            Далее
          </button>
        </div>
      </div>
    </div>
  );
};