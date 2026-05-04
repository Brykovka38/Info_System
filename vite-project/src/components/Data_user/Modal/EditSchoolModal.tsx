import { useEffect, useState } from "react";
import "../../style/Modal.css";

type EditSchoolModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (schoolData: {
    name: string;
    full_name: string;
    address: string;
  }) => Promise<void>;
  school: {
    id: number;
    name: string;
    full_name: string;
    address: string;
  } | null;
};

export const EditSchoolModal = ({
  isOpen,
  onClose,
  onSubmit,
  school,
}: EditSchoolModalProps) => {
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (school && isOpen) {
      setName(school.name || "");
      setFullName(school.full_name || "");
      setAddress(school.address || "");
      setIsSaving(false);
    }
  }, [school, isOpen]);

  if (!isOpen || !school) return null;

  const handleSubmit = async () => {
    const shortName = name.trim();
    const schoolFullName = fullName.trim();
    const schoolAddress = address.trim();

    if (!shortName) {
      alert("Введите сокращённое название школы");
      return;
    }

    try {
      setIsSaving(true);
      await onSubmit({
        name: shortName,
        full_name: schoolFullName,
        address: schoolAddress,
      });
    } catch (error: any) {
      alert(error.message || "Не удалось сохранить изменения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--top" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Редактировать школу</h2>
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
            <label className="modal__label">Сокращённое название *</label>
            <input
              type="text"
              className="modal__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, 217"
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Полное название</label>
            <input
              type="text"
              className="modal__input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Например, МОУ СОШ №217"
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Адрес</label>
            <input
              type="text"
              className="modal__input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Введите адрес школы"
            />
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