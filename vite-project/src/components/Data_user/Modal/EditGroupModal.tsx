import { useEffect, useState } from "react";
import "../../style/Modal.css";

type ScheduleItem = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

type EditGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (groupData: {
    school_id: number;
    cabinet: string;
    teacher_id: number | null;
    schedule: ScheduleItem[];
  }) => Promise<void>;
  group: any | null;
  schools: { id: number; name: string }[];
  teachers: { id: number; full_name: string }[];
  students: any[];
  onAddStudent: (studentId: number, courseId: number) => Promise<void>;
  onRemoveStudent: (studentId: number) => Promise<void>;
};

export const EditGroupModal = ({
  isOpen,
  onClose,
  onSubmit,
  group,
  schools,
  teachers,
  students,  
  onAddStudent,
  onRemoveStudent,
}: EditGroupModalProps) => {
  const [schoolId, setSchoolId] = useState("");
  const [cabinet, setCabinet] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  useEffect(() => {
  if (group && isOpen) {
    const matchedSchool = schools.find(
      (school) => school.name === group.school_name
    );

    const matchedTeacher = teachers.find(
      (teacher) => teacher.full_name === group.teacher_name
    );

    setSchoolId(
      group.school_id
        ? String(group.school_id)
        : matchedSchool
        ? String(matchedSchool.id)
        : ""
    );

    setCabinet(group.cabinet || "");

    setTeacherId(
      group.teacher_id
        ? String(group.teacher_id)
        : matchedTeacher
        ? String(matchedTeacher.id)
        : ""
    );

    if (group.schedule_list && Array.isArray(group.schedule_list) && group.schedule_list.length > 0) {
      setSchedule(
        group.schedule_list.map((item: any) => ({
      day_of_week: item.day_of_week,
      start_time: item.start_time?.slice(0, 5) || "",
      end_time: item.end_time?.slice(0, 5) || "",
    }))
      );
    } else if (group.days && group.start_time && group.end_time) {
      setSchedule([
        {
          day_of_week: group.days,
          start_time: group.start_time.slice(0, 5),
          end_time: group.end_time.slice(0, 5),
        },
      ]);
    } else {
      setSchedule([
        { day_of_week: "Пн", start_time: "", end_time: "" },
      ]);
    }
  }
}, [group, isOpen, schools, teachers]);

  if (!isOpen || !group) return null;

  const updateScheduleItem = (
    index: number,
    field: keyof ScheduleItem,
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addScheduleRow = () => {
    setSchedule((prev) => [
      ...prev,
      { day_of_week: "Пн", start_time: "", end_time: "" },
    ]);
  };

  const removeScheduleRow = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolId) {
      alert("Выберите филиал");
      return;
    }

    if (schedule.length === 0) {
      alert("Добавьте хотя бы одно занятие в расписание");
      return;
    }

    const hasInvalidSchedule = schedule.some(
      (item) => !item.day_of_week || !item.start_time || !item.end_time
    );

    if (hasInvalidSchedule) {
      alert("Заполните все поля расписания");
      return;
    }

    try {
      setIsSaving(true);

      await onSubmit({
        school_id: Number(schoolId),
        cabinet: cabinet.trim() || "-",
        teacher_id: teacherId ? Number(teacherId) : null,
        schedule,
      });
    } catch (error: any) {
      alert(error.message || "Не удалось сохранить изменения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Редактирование группы</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body modal__body--scroll">
            <div className="modal__field">
              <label className="modal__label">Филиал *</label>
              <select
                className="modal__select"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
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
              <label className="modal__label">Кабинет</label>
              <input
                type="text"
                className="modal__input"
                placeholder="Введите кабинет"
                value={cabinet}
                onChange={(e) => setCabinet(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label className="modal__label">Преподаватель</label>
              <select
                className="modal__select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
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
              <label className="modal__label">Расписание</label>

              <div className="modal__groupsList">
                {schedule.map((item, index) => (
                  <div key={index} className="modal__scheduleRow">
                    <select
                      className="modal__select"
                      value={item.day_of_week}
                      onChange={(e) =>
                        updateScheduleItem(index, "day_of_week", e.target.value)
                      }
                    >
                      <option value="Пн">Пн</option>
                      <option value="Вт">Вт</option>
                      <option value="Ср">Ср</option>
                      <option value="Чт">Чт</option>
                      <option value="Пт">Пт</option>
                      <option value="Сб">Сб</option>
                      <option value="Вс">Вс</option>
                    </select>

                    <input
                      type="time"
                      className="modal__input"
                      value={item.start_time}
                      onChange={(e) =>
                        updateScheduleItem(index, "start_time", e.target.value)
                      }
                    />

                    <input
                      type="time"
                      className="modal__input"
                      value={item.end_time}
                      onChange={(e) =>
                        updateScheduleItem(index, "end_time", e.target.value)
                      }
                    />

                    <button
                      type="button"
                      className="modal__groupRemove"
                      onClick={() => removeScheduleRow(index)}
                      title="Удалить строку"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="modal__button modal__button--secondary"
                onClick={addScheduleRow}
                style={{ marginTop: "10px" }}
              >
                Добавить день
              </button>
            </div>

            <div className="modal__field">
                <label className="modal__label">Ученики группы</label>

                {group.students_list && group.students_list.length > 0 ? (
                    <div className="modal__groupsList">
                    {group.students_list.map((student: any) => (
                        <div key={student.id} className="modal__groupItem">
                        <span>{student.full_name}</span>
                        <button
                            type="button"
                            className="modal__groupRemove"
                            onClick={() => onRemoveStudent(student.id)}
                            title="Убрать ученика"
                        >
                            ✕
                        </button>
                        </div>
                    ))}
                    </div>
                ) : (
                    <p className="modal__hint">В группе пока нет учеников</p>
                )}
            </div>
            <div className="modal__field">
                <label className="modal__label">Добавить ученика</label>

                <div className="modal__schoolRow">
                    <select
                    className="modal__select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                    <option value="">Не выбрано</option>
                    {students.map((student) => (
                        <option key={student.id} value={student.id}>
                        {student.full_name} {student.course_code ? `(${student.course_code})` : ""}
                        </option>
                    ))}
                    </select>

                    <button
                    type="button"
                    className="modal__button modal__button--secondary"
                    onClick={async () => {
                        if (!selectedStudentId) return;

                        const selectedStudent = students.find(
                        (student) => String(student.id) === selectedStudentId
                        );

                        if (!selectedStudent?.course_id) {
                        alert("У ученика не найден курс");
                        return;
                        }

                        await onAddStudent(Number(selectedStudentId), Number(selectedStudent.course_id));
                        setSelectedStudentId("");
                    }}
                    >
                    Добавить ученика
                    </button>
                </div>
            </div>
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="modal__button modal__button--secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Отмена
            </button>

            <button
              type="submit"
              className="modal__button modal__button--primary"
              disabled={isSaving}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};