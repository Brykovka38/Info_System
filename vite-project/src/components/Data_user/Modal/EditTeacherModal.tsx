import { useEffect, useState } from "react";
import "../../style/Modal.css";
import {
  normalizeRussianPhoneDigits,
  formatRussianPhone,
  isValidRussianPhone,
  toApiRussianPhone,
} from "../../utils/phone";
import {
  hasScheduleConflict,
} from "../../utils/schedule";
import {
  normalizeFullName,
  isValidFullName,
  filterFullNameInput,
} from "../../utils/name";

type GroupScheduleItem = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

type TeacherGroupItem = {
  id: number;
  name: string;
  schedule_list: GroupScheduleItem[];
};

type EditTeacherModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (teacherData: {
    full_name: string;
    phone: string;
    status: string;
    groupIds: number[];
  }) => Promise<void>;
  teacher: {
    id: number;
    full_name: string;
    phone: string;
    status: string;
    groups_list?: TeacherGroupItem[];
  } | null;
  freeGroups: TeacherGroupItem[];
};

export const EditTeacherModal = ({
  isOpen,
  onClose,
  onSubmit,
  teacher,
  freeGroups,
}: EditTeacherModalProps) => {
  const [fullName, setFullName] = useState("");
  const [hasPhone, setHasPhone] = useState(true);
  const [phoneDigits, setPhoneDigits] = useState("7");
  const [status, setStatus] = useState("active");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroupItem[]>([]);

  const normalizedFreeGroups = freeGroups.map((group) => ({
    id: Number(group.id),
    name: group.name,
    schedule_list: Array.isArray(group.schedule_list) ? group.schedule_list : [],
  }));

  const availableGroups = normalizedFreeGroups.filter(
    (group) => !teacherGroups.some((teacherGroup) => Number(teacherGroup.id) === group.id)
  );

  useEffect(() => {
    if (teacher && isOpen) {
      const teacherPhone = teacher.phone?.trim() || "";
      const phoneExists = teacherPhone !== "" && teacherPhone !== "-";

      setFullName(teacher.full_name || "");
      setHasPhone(phoneExists);
      setPhoneDigits(
        phoneExists ? normalizeRussianPhoneDigits(teacherPhone) : "7"
      );
      setStatus(teacher.status || "active");
      setSelectedGroupId(null);

      setTeacherGroups(
        (teacher.groups_list || []).map((group) => ({
          id: Number(group.id),
          name: group.name,
          schedule_list: Array.isArray(group.schedule_list) ? group.schedule_list : [],
        }))
      );
    }
  }, [teacher, isOpen]);

  if (!isOpen || !teacher) return null;

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

  const normalizedFullName = normalizeFullName(fullName);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!normalizedFullName) {
      alert("Введите ФИО преподавателя");
      return;
    }

    if (!isValidFullName(normalizedFullName)) {
      alert("Введите корректное ФИО преподавателя");
      return;
    }

    if (hasPhone && !isValidRussianPhone(phoneDigits)) {
      alert("Введите корректный номер телефона");
      return;
    }

    if (status === "inactive" && teacherGroups.length > 0) {
      alert("Нельзя сделать преподавателя неактивным, пока за ним закреплены группы");
      return;
    }

    try {
      setIsSaving(true);

      await onSubmit({
        // full_name: fullName.trim(),
        full_name: normalizedFullName,
        phone: hasPhone ? toApiRussianPhone(phoneDigits) : "-",
        status,
        groupIds: teacherGroups.map((group) => group.id),
      });
    } catch (error: any) {
      alert(error.message || "Не удалось сохранить изменения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Редактирование преподавателя</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
          >
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
                placeholder="Введите ФИО преподавателя"
                value={fullName}
                onChange={(e) => {
                  const filtered = filterFullNameInput(e.target.value);
                  setFullName(filtered);
                }}
                onKeyDown={handleNameKeyDown}
              />
            </div>

            <div className="modal__field">
              <span className="modal__label">Есть номер телефона? *</span>
              <div className="modal__radioRow">
                <button
                  type="button"
                  className={`modal__choice ${
                    hasPhone ? "modal__choice--active" : ""
                  }`}
                  onClick={() => {
                    setHasPhone(true);
                    if (phoneDigits === "7") {
                      setPhoneDigits("7");
                    }
                  }}
                >
                  Да
                </button>

                <button
                  type="button"
                  className={`modal__choice ${
                    !hasPhone ? "modal__choice--active" : ""
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
              <label className="modal__label">Текущие группы</label>

              {teacherGroups.length > 0 ? (
                <div className="modal__groupsList">
                  {teacherGroups.map((group) => (
                    <div key={group.id} className="modal__groupItem">
                      <span>{group.name}</span>
                      <button
                        type="button"
                        className="modal__groupRemove"
                        onClick={() => {
                          setTeacherGroups((prev) => prev.filter((g) => g.id !== group.id));
                        }}
                        title="Убрать группу"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="modal__hint">У преподавателя пока нет групп</p>
              )}
            </div>

            <div className="modal__field">
              <label className="modal__label">Добавить группу</label>

              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  className="modal__select"
                  value={selectedGroupId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedGroupId(value ? Number(value) : null);
                  }}
                >
                  <option value="">Не выбрано</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="modal__button modal__button--secondary"
                  onClick={() => {
                    if (selectedGroupId === null || Number.isNaN(selectedGroupId)) {
                      return;
                    }

                    const groupToAdd = availableGroups.find(
                      (group) => Number(group.id) === Number(selectedGroupId)
                    );

                    if (!groupToAdd) {
                      alert("Группа не найдена");
                      return;
                    }

                    const conflictCheck = hasScheduleConflict(groupToAdd, teacherGroups);

                    if (conflictCheck.hasConflict) {
                      alert(
                        `Нельзя добавить группу.\n` +
                        `Конфликт с группой: ${conflictCheck.conflictGroup}\n` +
                        `День: ${conflictCheck.day}`
                      );
                      return;
                    }

                    setTeacherGroups((prev) => [...prev, groupToAdd]);
                    setSelectedGroupId(null);
                  }}
                >
                  Добавить
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