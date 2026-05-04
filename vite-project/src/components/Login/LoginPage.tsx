import { useState } from "react";
import "./LoginPage.css";

const API_URL = import.meta.env.VITE_API_URL;

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  phone?: string;
  must_change_password: boolean;
  status: string;
};

type LoginPageProps = {
  onLogin: (user: AuthUser, token: string) => void;
};

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Неверный логин или пароль");
        return;
      }

      if (data.user.must_change_password) {
        setPendingUser(data.user);
        setIsPasswordModalOpen(true);
        setNewPassword("");
        setRepeatPassword("");
        setPasswordError("");

        localStorage.setItem("token", data.token);

        return;
      }

      localStorage.setItem("token", data.token);
      onLogin(data.user, data.token);
    } catch (error) {
      setError("Ошибка соединения с сервером");
    }
  };

  const handleChangeTemporaryPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pendingUser) return;

    setPasswordError("");

    if (!newPassword || !repeatPassword) {
      setPasswordError("Заполните новый пароль и повтор пароля");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Пароль должен быть не короче 6 символов");
      return;
    }

    if (newPassword !== repeatPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }

    try {
      setIsSavingPassword(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/users/${pendingUser.id}/change-temporary-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: password,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPasswordError(data.error || "Не удалось изменить пароль");
        return;
      }

      const updatedUser = data.user || {
        ...pendingUser,
        must_change_password: false,
      };

      setIsPasswordModalOpen(false);
      setPendingUser(null);
      setNewPassword("");
      setRepeatPassword("");
      setPassword("");
      setPasswordError("");

      localStorage.setItem("user", JSON.stringify(updatedUser));

      onLogin(updatedUser, token || "");
    } catch (error) {
      setPasswordError("Ошибка соединения с сервером");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <>
      <section className="login-page">
        <form className="login-page__card" onSubmit={handleSubmit}>
          <h2 className="login-page__title">Вход</h2>

          <div className="login-page__field">
            <label className="login-page__label">Логин</label>
            <input
              className="login-page__input"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>

          <div className="login-page__field">
            <label className="login-page__label">Пароль</label>
            <input
              className="login-page__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ color: "white", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button className="login-page__button" type="submit">
            Вход
          </button>
        </form>
      </section>

      {isPasswordModalOpen && pendingUser && (
        <div className="login-page__modalOverlay">
          <form
            className="login-page__passwordModal"
            onSubmit={handleChangeTemporaryPassword}
          >
            <h2 className="login-page__modalTitle">
              Смена временного пароля
            </h2>

            <p className="login-page__modalText">
              Для продолжения работы необходимо изменить временный пароль.
            </p>

            <div className="login-page__field">
              <label className="login-page__label">Новый пароль</label>
              <input
                className="login-page__input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSavingPassword}
              />
            </div>

            <div className="login-page__field">
              <label className="login-page__label">Повторите пароль</label>
              <input
                className="login-page__input"
                type="password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                disabled={isSavingPassword}
              />
            </div>

            {passwordError && (
              <div className="login-page__modalError">
                {passwordError}
              </div>
            )}

            <button
              className="login-page__button"
              type="submit"
              disabled={isSavingPassword}
            >
              {isSavingPassword ? "Сохранение..." : "Сохранить пароль"}
            </button>
          </form>
        </div>
      )}
    </>
  );
};