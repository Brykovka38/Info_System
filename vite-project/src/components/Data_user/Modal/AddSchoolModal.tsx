import { useEffect, useState } from "react";
import "../../style/Modal.css";

type AddSchoolModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (schoolData: {
    name: string;
    full_name: string;
    address: string;
  }) => Promise<void>;
};

export const AddSchoolModal = ({
  isOpen,
  onClose,
  onSubmit,
}: AddSchoolModalProps) => {
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setFullName("");
      setAddress("");
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      alert(error.message || "Не удалось добавить школу");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay modal-overlay--top" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Добавить школу</h2>
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
              placeholder="Например, 217"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Полное название</label>
            <input
              type="text"
              className="modal__input"
              placeholder="Например, МОУ СОШ №217"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">Адрес</label>
            <input
              type="text"
              className="modal__input"
              placeholder="Введите адрес школы"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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