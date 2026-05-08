import { useEffect, useState } from "react";
import "../../style/Modal.css";

import {
  normalizeRussianPhoneDigits,
  formatRussianPhone,
  isValidRussianPhone,
  toApiRussianPhone,
} from "../../utils/phone";

import {
  normalizeFullName,
  isValidFullName,
  filterFullNameInput,
} from "../../utils/name";

type EditStudentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (studentData: {
    full_name: string;
    phone: string;
    status: string;
    class_name: string;
    school_id: number | null;
    group_id?: number | null;
    course_id?: number | null;
  }) => Promise<void>;

  userRole?: string;

  student: {
    id: number;
    full_name: string;
    phone: string;
    status: string;
    class?: string;
    class_name?: string;
    school_id?: number | null;
    group_id?: number | null;
    course_id?: number | null;
    parents_list?: { id: number; full_name: string; relation_type: string }[];
  } | null;

  schools: { id: number; name: string }[];
  groups: any[];
  courses: any[];
  onOpenAddSchool: () => void;
  parents: any[];
  onAddParent: (parentId: number, relationType: string) => Promise<void>;
  onRemoveParent: (parentId: number) => Promise<void>;
  onOpenAddParent: () => void;
};

export const EditStudentModal = ({
  isOpen,
  onClose,
  onSubmit,
  student,
  schools,
  groups,
  courses,
  onOpenAddSchool,
  parents,
  onAddParent,
  onRemoveParent,
  onOpenAddParent,
  userRole, 
}: EditStudentModalProps) => {
  const [fullName, setFullName] = useState("");
  const [hasPhone, setHasPhone] = useState(true);
  const [phoneDigits, setPhoneDigits] = useState("7");
  const [status, setStatus] = useState("active");
  const [studentClass, setStudentClass] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const studentId = student?.id;
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [relationType, setRelationType] = useState("мать");

  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (student && isOpen) {
      const studentPhone = student.phone?.trim() || "";
      const phoneExists = studentPhone !== "" && studentPhone !== "-";

      setFullName(student.full_name || "");
      setHasPhone(phoneExists);
      setPhoneDigits(
        phoneExists ? normalizeRussianPhoneDigits(studentPhone) : "7"
      );
      setStatus(student.status || "active");
      setStudentClass(student.class_name || student.class || "");
      setSchoolId(student.school_id ? String(student.school_id) : "");
      setGroupId(student.group_id ? String(student.group_id) : "");
      setCourseId(student.course_id ? String(student.course_id) : "");
      setSelectedParentId("");
      setRelationType("мать");
      setIsSaving(false);
    }
  }, [studentId, isOpen, student]);

  if (!isOpen || !student) return null;

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];

    if (allowedKeys.includes(e.key)) return;

    if (!/^[A-Za-zА-Яа-яЁё\s-]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneDigits(normalizeRussianPhoneDigits(e.target.value));
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];

    if (allowedKeys.includes(e.key)) return;

    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedFullName = normalizeFullName(fullName);

    if (!normalizedFullName) {
      alert("Введите ФИО студента");
      return;
    }

    if (!isValidFullName(normalizedFullName)) {
      alert("Введите корректное ФИО студента");
      return;
    }

    if (hasPhone && !isValidRussianPhone(phoneDigits)) {
      alert("Введите корректный номер телефона");
      return;
    }

    try {
      setIsSaving(true);

      await onSubmit({
        full_name: normalizedFullName,
        phone: hasPhone ? toApiRussianPhone(phoneDigits) : "-",
        status,
        class_name: studentClass.trim() || "-",
        school_id: schoolId ? Number(schoolId) : null,
        group_id: groupId ? Number(groupId) : null,
        course_id: courseId ? Number(courseId) : null,
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
          <h2 className="modal__title">Редактирование студента</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body modal__body--scroll">
            <div className="modal__field">
              <label className="modal__label">ФИО *</label>
              <input
                type="text"
                className="modal__input"
                placeholder="Введите ФИО студента"
                value={fullName}
                onChange={(e) => setFullName(filterFullNameInput(e.target.value))}
                onKeyDown={handleNameKeyDown}
                title="Только буквы, пробел и дефис"
              />
            </div>

            <div className="modal__field">
              <span className="modal__label">Есть номер телефона? *</span>
              <div className="modal__radioRow">
                <button
                  type="button"
                  className={`modal__choice ${hasPhone ? "modal__choice--active" : ""}`}
                  onClick={() => {
                    setHasPhone(true);
                    setPhoneDigits("7");
                  }}
                >
                  Да
                </button>

                <button
                  type="button"
                  className={`modal__choice ${!hasPhone ? "modal__choice--active" : ""}`}
                  onClick={() => {
                    setHasPhone(false);
                    setPhoneDigits("7");
                  }}
                >
                  Нет
                </button>
              </div>
            </div>

            {hasPhone && (
              <div className="modal__field">
                <label className="modal__label">Номер телефона *</label>
                <input
                  type="tel"
                  className="modal__input"
                  placeholder="+7 (___) ___-__-__"
                  value={formatRussianPhone(phoneDigits)}
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  inputMode="numeric"
                />
              </div>
            )}

            <div className="modal__field">
              <label className="modal__label">Состояние *</label>
              <select
                className="modal__select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Активный</option>
                <option value="inactive">Неактивный</option>
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Класс</label>
              <input
                type="text"
                className="modal__input"
                placeholder="Введите класс"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label className="modal__label">Школа</label>
              <div className="modal__schoolRow">
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

                <button
                  type="button"
                  className="modal__addSchoolButton"
                  onClick={onOpenAddSchool}
                >
                  + Добавить школу
                </button>
              </div>
            </div>

            <div className="modal__field">
              <label className="modal__label">Группа</label>
              <select
                className="modal__select"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                <option value="">Не выбрано</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name || `${group.school_name}-${group.cabinet}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Курс</label>
              <select
                className="modal__select"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">Не выбрано</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Текущие родители</label>

              {student.parents_list && student.parents_list.length > 0 ? (
                <div className="modal__groupsList">
                  {student.parents_list.map((parent) => (
                    <div key={parent.id} className="modal__groupItem">
                      <span>
                        {parent.full_name} — {parent.relation_type}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          className="modal__groupRemove"
                          onClick={() => onRemoveParent(parent.id)}
                          title="Убрать родителя"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="modal__hint">У студента пока нет привязанных родителей</p>
              )}
            </div>
            {isAdmin && (
            <div className="modal__field">
              <label className="modal__label">Добавить родителя</label>

              <div className="modal__schoolRow">
                <select
                  className="modal__select"
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                >
                  <option value="">Не выбрано</option>
                  {parents.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.full_name}
                    </option>
                  ))}
                </select>

                <select
                  className="modal__select"
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value)}
                >
                  <option value="мать">мать</option>
                  <option value="отец">отец</option>
                  <option value="опекун">опекун</option>
                </select>
              </div>

              <div className="modal__rowButtons">
                <button
                  type="button"
                  className="modal__button modal__button--secondary"
                  onClick={async () => {
                    if (!selectedParentId) return;
                    await onAddParent(Number(selectedParentId), relationType);
                    setSelectedParentId("");
                    setRelationType("мать");
                  }}
                >
                  Добавить
                </button>

                <button
                  type="button"
                  className="modal__addSchoolButton"
                  onClick={onOpenAddParent}
                >
                  + Добавить родителя
                </button>
              </div>
            </div> )}
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