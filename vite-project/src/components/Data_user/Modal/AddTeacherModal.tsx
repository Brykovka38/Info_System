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

type GroupItem = {
  id: number;
  group_name: string;
  schedule_list: GroupScheduleItem[];
};

type AddTeacherModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (teacherData: {
    full_name: string;
    phone: string;
    groupIds: number[];
    work_start_date: string;
  }) => Promise<void>;
  groups: GroupItem[];
};

const getTodayDate = () => new Date().toISOString().split("T")[0];


export const AddTeacherModal = ({
  isOpen,
  onClose,
  onSubmit,
  groups,
}: AddTeacherModalProps) => {
  const [fullName, setFullName] = useState("");
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);
  const [phoneDigits, setPhoneDigits] = useState("7");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<GroupItem[]>([]);
  const [workStartDate, setWorkStartDate] = useState(getTodayDate());
  const [isSaving, setIsSaving] = useState(false);

  const availableGroups = groups.filter(
    (group) => !teacherGroups.some((teacherGroup) => teacherGroup.id === group.id)
  );


  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setHasPhone(null);
      setPhoneDigits("7");
      setSelectedGroupId(null);
      setTeacherGroups([]);
      setWorkStartDate(getTodayDate());
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

    // разрешаем только буквы, пробел и дефис
    if (!/^[A-Za-zА-Яа-яЁё\s-]$/.test(e.key)) {
      e.preventDefault();
    }
  };
  const normalizedFullName = normalizeFullName(fullName);

  const handleSubmit = async () => {
    if (!normalizedFullName) {
      alert("Введите ФИО");
      return;
    }

    if (!normalizedFullName) {
      alert("Введите ФИО преподавателя");
      return;
    }

    if (!isValidFullName(normalizedFullName)) {
      alert("Введите корректное ФИО преподавателя");
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

    if (workStartDate < "2001-01-01") {
      alert("Дата начала работы не может быть раньше 2001 года");
      return;
    }

    try {
      setIsSaving(true);

      await onSubmit({
        // full_name: fullName.trim(),
        full_name: normalizedFullName,
        phone: hasPhone ? toApiRussianPhone(phoneDigits) : "-",
        groupIds: teacherGroups.map((group) => group.id),
        work_start_date: workStartDate,
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
          <h2 className="modal__title">Добавление преподавателя</h2>
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
            <label className="modal__label">С какого числа работает *</label>
            <input
              type="date"
              className="modal__input"
              value={workStartDate}
              onChange={(e) => setWorkStartDate(e.target.value)}
              min="2001-01-01"
              max={getTodayDate()}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Текущие группы</label>

            {teacherGroups.length > 0 ? (
              <div className="modal__groupsList">
                {teacherGroups.map((group) => (
                  <div key={group.id} className="modal__groupItem">
                    <span>{group.group_name || `Группа #${group.id}`}</span>
                    <button
                      type="button"
                      className="modal__groupRemove"
                      onClick={() => {
                        setTeacherGroups((prev) =>
                          prev.filter((g) => g.id !== group.id)
                        );
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
                onChange={(e) =>
                  setSelectedGroupId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Не выбрано</option>
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                     {group.group_name || `Группа #${group.id}`}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="modal__button modal__button--secondary"
                onClick={() => {
                  if (selectedGroupId === null) return;

                  const groupToAdd = availableGroups.find(
                    (group) => group.id === selectedGroupId
                  );

                  if (!groupToAdd) return;

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