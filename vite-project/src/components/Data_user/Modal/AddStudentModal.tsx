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

type SchoolItem = {
  id: number;
  name: string;
  full_name: string;
  address: string;
};

type CourseItem = {
  id: number;
  code: string;
};

type GroupItem = {
  id: number;
  group_name: string;
};

type ParentItem = {
  id: number;
  full_name: string;
};

type AddStudentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (studentData: {
    full_name: string;
    phone: string;
    class_name: string;
    school_id: number | null;
    course_id: number | null;
    group_id: number | null;
    parent_id: number | null;
    relation_type: string | null;
  }) => Promise<void>;
  schools: SchoolItem[];
  courses: CourseItem[];
  groups: GroupItem[];
  parents: ParentItem[];
  onOpenAddSchool: () => void;
  onOpenAddParent: () => void;
};

export const AddStudentModal = ({
  isOpen,
  onClose,
  onSubmit,
  schools,
  courses,
  groups,
  parents,
  onOpenAddSchool,
  onOpenAddParent,
}: AddStudentModalProps) => {
  const [fullName, setFullName] = useState("");
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [phoneDigits, setPhoneDigits] = useState("7");
  const [className, setClassName] = useState("");
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [relationType, setRelationType] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setHasPhone(null);
      setPhoneDigits("7");
      setClassName("");
      setSchoolId(null);
      setCourseId(null);
      setGroupId(null);
      setParentId(null);
      setRelationType(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleSubmit = async () => {
    const normalizedFullName = normalizeFullName(fullName);

    if (!normalizedFullName) {
      alert("Введите ФИО");
      return;
    }

    if (!isValidFullName(normalizedFullName)) {
      alert("Введите корректное ФИО");
      return;
    }

    if (hasPhone === null) {
      alert("Укажите, есть ли номер телефона");
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
        class_name: className.trim(),
        school_id: schoolId,
        course_id: courseId,
        group_id: groupId,
        parent_id: parentId,
        relation_type: relationType,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Добавление студента</h2>
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
            <label className="modal__label">Есть номер телефона? *</label>

            <div className="modal__radioRow">
              <button
                type="button"
                className={`modal__choice ${
                  hasPhone === true ? "modal__choice--active" : ""
                }`}
                onClick={() => {
                  setHasPhone(true);
                  setPhoneDigits("7");
                }}
              >
                Да
              </button>

              <button
                type="button"
                className={`modal__choice ${
                  hasPhone === false ? "modal__choice--active" : ""
                }`}
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
            <label className="modal__label">Класс</label>
            <input
              type="text"
              className="modal__input"
              placeholder="Например, 7А"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Школа</label>

            <div className="modal__schoolRow">
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
            <label className="modal__label">Курс</label>
            <select
              className="modal__select"
              value={courseId ?? ""}
              onChange={(e) =>
                setCourseId(e.target.value ? Number(e.target.value) : null)
              }
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
            <label className="modal__label">Группа</label>
            <select
              className="modal__select"
              value={groupId ?? ""}
              onChange={(e) =>
                setGroupId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Не выбрано</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.group_name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal__field">
            <label className="modal__label">Родитель</label>

            <div className="modal__schoolRow">
              <select
                className="modal__select"
                value={parentId ?? ""}
                onChange={(e) =>
                  setParentId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Не выбрано</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.full_name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="modal__addSchoolButton"
                onClick={onOpenAddParent}
              >
                + Добавить родителя
              </button>
            </div>
          </div>

          {parentId && (
            <div className="modal__field">
              <label className="modal__label">Родство</label>
              <select
                className="modal__select"
                value={relationType ?? ""}
                onChange={(e) => setRelationType(e.target.value || null)}
              >
                <option value="">Не выбрано</option>
                <option value="мать">Мать</option>
                <option value="отец">Отец</option>
                <option value="опекун">Опекун</option>
              </select>
            </div>
          )}

          <div className="modal__hint">
            Если класс не указан, в системе будет сохранено значение "-".
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
            type="button"
            className="modal__button modal__button--primary"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};