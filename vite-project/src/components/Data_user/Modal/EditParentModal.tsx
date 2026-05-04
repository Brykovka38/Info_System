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

type EditParentModalProps = {
  isOpen: boolean;
  userRole?: string;
  onClose: () => void;
  onSubmit: (parentData: {
    full_name: string;
    phone: string;
    status: string;
  }) => Promise<void>;
  parent: {
    id: number;
    full_name: string;
    phone: string;
    status: string;
    //children_list?: {
    children_groups_list?: {
      student_id: number;
      student_name: string;
      relation_type: string;
      benefit: boolean;
      group_name: string;
    }[];
  } | null;
  freeStudents: { id: number; full_name: string }[];
  onAddStudent: (studentId: number, relationType: string) => Promise<void>;
  onRemoveStudent: (studentId: number) => Promise<void>;
  onUpdateChildLink: (
    studentId: number,
    relationType: string,
    benefit: boolean
  ) => Promise<void>;
};

export const EditParentModal = ({
  isOpen,
  userRole,
  onClose,
  onSubmit,
  parent,
  onUpdateChildLink,
  onAddStudent,
  onRemoveStudent,
  freeStudents,
}: EditParentModalProps) => {
  const [fullName, setFullName] = useState("");
  const [hasPhone, setHasPhone] = useState(true);
  const [phoneDigits, setPhoneDigits] = useState("7");
  const [status, setStatus] = useState("active");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [newRelationType, setNewRelationType] = useState("мать");

  const parentId = parent?.id;

  const isAdmin = userRole === "admin";
  const isTeacher = userRole === "teacher";

  useEffect(() => {
    if (parent && isOpen) {
      const parentPhone = parent.phone?.trim() || "";
      const phoneExists = parentPhone !== "" && parentPhone !== "-";

      setFullName(parent.full_name || "");
      setHasPhone(phoneExists);
      setPhoneDigits(
        phoneExists ? normalizeRussianPhoneDigits(parentPhone) : "7"
      );
      setStatus(parent.status || "active");
      setSelectedStudentId("");
      setNewRelationType("мать");
      setIsSaving(false);
    }
  }, [parentId, isOpen, parent]);

  if (!isOpen || !parent) return null;

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
      alert("Введите ФИО родителя");
      return;
    }

    if (!isValidFullName(normalizedFullName)) {
      alert("Введите корректное ФИО родителя");
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
          <h2 className="modal__title">Редактирование родителя</h2>
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
                placeholder="Введите ФИО родителя"
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
              <label className="modal__label">Дети</label>

              {parent.children_groups_list  && parent.children_groups_list .length > 0 ? (
                <div className="modal__groupsList">
                  {parent.children_groups_list .map((child) => (
                    <div key={child.student_id} className="modal__childCard">
                      <div className="modal__childInfo">
                        <div className="modal__childName">
                          <strong>{child.student_name}</strong>
                          {isAdmin && (
                            <button
                              type="button"
                              className="modal__groupRemove"
                              onClick={() => onRemoveStudent(child.student_id)}
                              title="Убрать ребёнка"
                            >
                              ✕
                            </button> )}
                        </div>

                        <div className="modal__childGroup">
                          {child.group_name}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="modal__childControls">
                          <select
                            className="modal__select"
                            defaultValue={child.relation_type}
                            onChange={(e) => {
                              child.relation_type = e.target.value;
                            }}
                          >
                            <option value="мать">мать</option>
                            <option value="отец">отец</option>
                            <option value="опекун">опекун</option>
                          </select>

                          <select
                            className="modal__select"
                            defaultValue={child.benefit ? "true" : "false"}
                            onChange={(e) => {
                              child.benefit = e.target.value === "true";
                            }}
                          >
                            <option value="false">Нет льготы</option>
                            <option value="true">Есть льгота</option>
                          </select>

                          <button
                            type="button"
                            className="modal__button modal__button--secondary"
                            onClick={() =>
                              onUpdateChildLink(
                                child.student_id,
                                child.relation_type,
                                child.benefit
                              )
                            }
                          >
                            Сохранить связь
                          </button>
                        </div> )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="modal__hint">У родителя пока нет привязанных детей</p>
              )}
            </div>

            {isAdmin && (
              <div className="modal__field">
                <label className="modal__label">Добавить ребёнка</label>

                <div className="modal__schoolRow">
                  <select
                    className="modal__select"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                  >
                    <option value="">Не выбрано</option>
                    {freeStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="modal__select"
                    value={newRelationType}
                    onChange={(e) => setNewRelationType(e.target.value)}
                  >
                    <option value="мать">мать</option>
                    <option value="отец">отец</option>
                    <option value="опекун">опекун</option>
                  </select>

                  <button
                    type="button"
                    className="modal__button modal__button--secondary"
                    onClick={async () => {
                      if (!selectedStudentId) return;
                      await onAddStudent(Number(selectedStudentId), newRelationType);
                      setSelectedStudentId("");
                      setNewRelationType("мать");
                    }}
                  >
                    Добавить ребёнка
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