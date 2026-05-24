import { useState, type ChangeEvent, type FormEvent } from "react";

const API_URL = import.meta.env.VITE_API_URL;

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  status: string;
  phone?: string;
};

type ChangeTemporaryPasswordModalProps = {
  isOpen: boolean;
  user: AuthUser | null;
  onSuccess: (user: AuthUser) => void;
};

export const ChangeTemporaryPasswordModal = ({
  isOpen,
  user,
  onSuccess,
}: ChangeTemporaryPasswordModalProps) => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    repeatPassword: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleChange =
    (field: keyof typeof form) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");

    if (!form.currentPassword || !form.newPassword || !form.repeatPassword) {
      setErrorMessage("Заполните все поля");
      return;
    }

    if (form.newPassword.length < 6) {
      setErrorMessage("Новый пароль должен быть не короче 6 символов");
      return;
    }

    if (form.newPassword !== form.repeatPassword) {
      setErrorMessage("Новый пароль и повтор пароля не совпадают");
      return;
    }

    try {
      setIsSaving(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/users/${user.id}/change-temporary-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: form.currentPassword,
            new_password: form.newPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Не удалось изменить пароль");
      }

      onSuccess(data.user);
    } catch (error: any) {
      setErrorMessage(error.message || "Не удалось изменить пароль");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={handleSubmit}>
        <h2>Смена временного пароля</h2>

        <p>
          Для продолжения работы необходимо заменить временный пароль.
        </p>

        <input
          type="password"
          placeholder="Временный пароль"
          value={form.currentPassword}
          onChange={handleChange("currentPassword")}
          disabled={isSaving}
        />

        <input
          type="password"
          placeholder="Новый пароль"
          value={form.newPassword}
          onChange={handleChange("newPassword")}
          disabled={isSaving}
        />

        <input
          type="password"
          placeholder="Повторите новый пароль"
          value={form.repeatPassword}
          onChange={handleChange("repeatPassword")}
          disabled={isSaving}
        />

        {errorMessage && <div className="modal-error">{errorMessage}</div>}

        <button type="submit" disabled={isSaving}>
          {isSaving ? "Сохранение..." : "Сохранить пароль"}
        </button>
      </form>
    </div>
  );
};