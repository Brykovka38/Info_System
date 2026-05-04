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

type StudentItem = {
  id: number;
  full_name: string;
};

type ParentLink = {
  student_id: number;
  relation_type: string;
};

type AddParentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (parentData: {
    full_name: string;
    phone: string;
    links: ParentLink[];
  }) => Promise<void>;
  students: StudentItem[];
};

export const AddParentModal = ({
  isOpen,
  onClose,
  onSubmit,
  students,
}: AddParentModalProps) => {
  const [fullName, setFullName] = useState("");
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [phoneDigits, setPhoneDigits] = useState("7");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [relations, setRelations] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setHasPhone(null);
      setPhoneDigits("7");
      setSelectedStudents([]);
      setRelations({});
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

  const toggleStudent = (studentId: number) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        const updated = prev.filter((id) => id !== studentId);

        setRelations((old) => {
          const copy = { ...old };
          delete copy[studentId];
          return copy;
        });

        return updated;
      }

      return [...prev, studentId];
    });
  };

  const handleRelationChange = (studentId: number, value: string) => {
    setRelations((prev) => ({
      ...prev,
      [studentId]: value,
    }));
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

    for (const studentId of selectedStudents) {
      if (!relations[studentId]) {
        alert("Укажите родство для каждого выбранного ученика");
        return;
      }
    }

    const links = selectedStudents.map((studentId) => ({
      student_id: studentId,
      relation_type: relations[studentId],
    }));

    try {
      setIsSaving(true);

      await onSubmit({
        full_name: normalizedFullName,
        phone: hasPhone ? toApiRussianPhone(phoneDigits) : "-",
        links,
      });
    } catch (error: any) {
      alert(error.message || "Не удалось добавить родителя");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Добавить родителя</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__field">
            <label className="modal__label">ФИО *</label>
            <input
              type="text"
              className="modal__input"
              placeholder="Введите ФИО"
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
            <label className="modal__label">Ученики</label>

            <div className="modal__studentsList">
              {students.map((student) => (
                <label key={student.id} className="modal__studentItem">
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span>{student.full_name}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedStudents.length > 0 && (
            <div className="modal__field">
              <label className="modal__label">Родство</label>

              <div className="modal__relationsList">
                {selectedStudents.map((studentId) => {
                  const student = students.find((s) => s.id === studentId);

                  return (
                    <div key={studentId} className="modal__relationRow">
                      <div className="modal__relationName">
                        {student?.full_name}
                      </div>

                      <select
                        className="modal__select"
                        value={relations[studentId] || ""}
                        onChange={(e) =>
                          handleRelationChange(studentId, e.target.value)
                        }
                      >
                        <option value="">Не выбрано</option>
                        <option value="мать">Мать</option>
                        <option value="отец">Отец</option>
                        <option value="опекун">Опекун</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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