import "./ProfilePage.css";
import { CircleUserRound } from "lucide-react";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  normalizeRussianPhoneDigits,
  formatRussianPhone,
  isValidRussianPhone,
  toApiRussianPhone,
} from "../utils/phone";

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

type ProfilePageProps = {
  user: AuthUser | null;
  onUserUpdate?: (user: AuthUser) => void;
  token: string | null;
};

type ProfileForm = {
  lastName: string;
  firstName: string;
  middleName: string;
  phoneDigits: string;
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    lastName: parts[0] || "",
    firstName: parts[1] || "",
    middleName: parts.slice(2).join(" ") || "",
  };
};

const buildFullName = (form: ProfileForm) => {
  return [form.lastName, form.firstName, form.middleName]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
};

const getInitialPhoneDigits = (phone?: string) => {
  if (!phone) return "7";

  return normalizeRussianPhoneDigits(phone);
};

const formatProfilePhone = (phone?: string) => {
  if (!phone) return "—";

  const digits = normalizeRussianPhoneDigits(phone);

  if (!isValidRussianPhone(digits)) {
    return phone;
  }

  return formatRussianPhone(digits);
};

const getRoleLabel = (role: string) => {
  if (role === "admin") return "Администратор";
  if (role === "teacher") return "Преподаватель";
  if (role === "student") return "Студент";
  if (role === "parent") return "Родитель";

  return role;
};

export const ProfilePage = ({ user, onUserUpdate, token }: ProfilePageProps) => {
  const [profileUser, setProfileUser] = useState<AuthUser | null>(user);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    repeatPassword: "",
  });

  const [form, setForm] = useState<ProfileForm>(() => {
    const nameParts = splitFullName(user?.full_name || "");

    return {
      ...nameParts,
      phoneDigits: getInitialPhoneDigits(user?.phone),
    };
  });

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    if (!token) {
      throw new Error("Нет токена авторизации");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || "Ошибка запроса");
    }

    return data;
  };

  useEffect(() => {
    setProfileUser(user);

    const nameParts = splitFullName(user?.full_name || "");

    setForm({
      ...nameParts,
      phoneDigits: getInitialPhoneDigits(user?.phone),
    });

    setIsEditing(false);
    setErrorMessage("");
  }, [user]);

  const handleInputChange = (field: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
  };

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      phoneDigits: normalizeRussianPhoneDigits(event.target.value),
    }));
  };

  const handleStartEdit = () => {
    if (!profileUser) return;

    const nameParts = splitFullName(profileUser.full_name);

    setForm({
      ...nameParts,
      phoneDigits: getInitialPhoneDigits(profileUser.phone),
    });

    setErrorMessage("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!profileUser) return;

    const nameParts = splitFullName(profileUser.full_name);

    setForm({
      ...nameParts,
      phoneDigits: getInitialPhoneDigits(profileUser.phone),
    });

    setErrorMessage("");
    setIsEditing(false);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profileUser) return;

    if (!form.lastName.trim() || !form.firstName.trim()) {
      setErrorMessage("Заполните фамилию и имя");
      return;
    }

    const fullName = buildFullName(form);

    const hasPhone = form.phoneDigits.length > 1;

    if (hasPhone && !isValidRussianPhone(form.phoneDigits)) {
      setErrorMessage("Введите корректный номер телефона");
      return;
    }

    const phoneForApi = hasPhone ? toApiRussianPhone(form.phoneDigits) : null;

    try {
      setIsSaving(true);
      setErrorMessage("");

      const data = await fetchWithAuth(`${API_URL}/users/${profileUser.id}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          phone: phoneForApi,
        }),
      });

      const responseUser = data.user || data;

      const updatedUser: AuthUser = {
        ...profileUser,
        ...responseUser,
        full_name: responseUser.full_name || fullName,
        phone: responseUser.phone ?? phoneForApi ?? "",
      };

      setProfileUser(updatedUser);
      onUserUpdate?.(updatedUser);

      setProfileUser(updatedUser);
      onUserUpdate?.(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setIsEditing(false);
    } catch (error: any) {
      setErrorMessage(error.message || "Не удалось обновить профиль");
    } finally {
      setIsSaving(false);
    }
  };

  if (!profileUser) {
    return (
      <section className="profile-page">
        <div className="profile-page__card">
          <div className="profile-page__info">
            <div className="profile-page__row">
              <span className="profile-page__value">
                Пользователь не найден
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { lastName, firstName, middleName } = splitFullName(
    profileUser.full_name
  );

  const handlePasswordInputChange =
    (field: keyof typeof passwordForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleCancelPasswordEdit = () => {
    setIsPasswordEditing(false);
    setPasswordError("");
    setPasswordMessage("");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      repeatPassword: "",
    });
  };

  const handleSavePassword = async () => {
    if (!profileUser) return;

    setPasswordError("");
    setPasswordMessage("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.repeatPassword
    ) {
      setPasswordError("Заполните все поля");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Новый пароль должен быть не короче 6 символов");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.repeatPassword) {
      setPasswordError("Новый пароль и повтор пароля не совпадают");
      return;
    }

    try {
      setIsPasswordSaving(true);

      await fetchWithAuth(`${API_URL}/users/${profileUser.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });

      setPasswordMessage("Пароль успешно изменён");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        repeatPassword: "",
      });
      setIsPasswordEditing(false);
    } catch (error: any) {
      setPasswordError(error.message || "Не удалось изменить пароль");
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <section className="profile-page">
      <div className="profile-page__card">
        <div className="profile-page__avatarBlock">
          <div className="profile-page__avatar">
            <CircleUserRound size={120} strokeWidth={1.5} />
          </div>
        </div>

        <form className="profile-page__info" onSubmit={handleSave}>
          <div className="profile-page__row">
            <span className="profile-page__label">Логин</span>
            <span className="profile-page__value">{profileUser.login}</span>
          </div>
          <div className="profile-page__row">
            <span className="profile-page__label">Фамилия</span>

            {isEditing ? (
              <input
                className="profile-page__input"
                type="text"
                value={form.lastName}
                onChange={handleInputChange("lastName")}
                disabled={isSaving}
              />
            ) : (
              <span className="profile-page__value">{lastName || "—"}</span>
            )}
          </div>

          <div className="profile-page__row">
            <span className="profile-page__label">Имя</span>

            {isEditing ? (
              <input
                className="profile-page__input"
                type="text"
                value={form.firstName}
                onChange={handleInputChange("firstName")}
                disabled={isSaving}
              />
            ) : (
              <span className="profile-page__value">{firstName || "—"}</span>
            )}
          </div>

          <div className="profile-page__row">
            <span className="profile-page__label">Отчество</span>

            {isEditing ? (
              <input
                className="profile-page__input"
                type="text"
                value={form.middleName}
                onChange={handleInputChange("middleName")}
                disabled={isSaving}
              />
            ) : (
              <span className="profile-page__value">{middleName || "—"}</span>
            )}
          </div>

          <div className="profile-page__row">
            <span className="profile-page__label">Номер телефона</span>

            {isEditing ? (
              <input
                className="profile-page__input"
                type="tel"
                value={formatRussianPhone(form.phoneDigits)}
                onChange={handlePhoneChange}
                disabled={isSaving}
                placeholder="+7 (___) ___-__-__"
              />
            ) : (
              <span className="profile-page__value">
                {formatProfilePhone(profileUser.phone)}
              </span>
            )}
          </div>

          <div className="profile-page__row">
            <span className="profile-page__label">Роль</span>
            <span className="profile-page__value">
              {getRoleLabel(profileUser.role)}
            </span>
          </div>

          <div className="profile-page__passwordBlock">
          <div className="profile-page__passwordHeader">
            <span className="profile-page__label">Пароль</span>

            {!isPasswordEditing && (
              <button
                className="profile-page__passwordButton"
                type="button"
                onClick={() => {
                  setIsPasswordEditing(true);
                  setPasswordError("");
                  setPasswordMessage("");
                }}
              >
                Изменить пароль
              </button>
            )}
          </div>

          {isPasswordEditing && (
            <div className="profile-page__passwordFields">
              <input
                className="profile-page__input"
                type="password"
                placeholder="Текущий пароль"
                value={passwordForm.currentPassword}
                onChange={handlePasswordInputChange("currentPassword")}
                disabled={isPasswordSaving}
              />

              <input
                className="profile-page__input"
                type="password"
                placeholder="Новый пароль"
                value={passwordForm.newPassword}
                onChange={handlePasswordInputChange("newPassword")}
                disabled={isPasswordSaving}
              />

              <input
                className="profile-page__input"
                type="password"
                placeholder="Повторите новый пароль"
                value={passwordForm.repeatPassword}
                onChange={handlePasswordInputChange("repeatPassword")}
                disabled={isPasswordSaving}
              />

              <div className="profile-page__passwordActions">
                <button
                  className="profile-page__editButton"
                  type="button"
                  onClick={handleSavePassword}
                  disabled={isPasswordSaving}
                >
                  {isPasswordSaving ? "Сохранение..." : "Сохранить пароль"}
                </button>

                <button
                  className="profile-page__cancelButton"
                  type="button"
                  onClick={handleCancelPasswordEdit}
                  disabled={isPasswordSaving}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {passwordError && (
            <div className="profile-page__error">{passwordError}</div>
          )}

          {passwordMessage && (
            <div className="profile-page__success">{passwordMessage}</div>
          )}
        </div>

          {errorMessage && (
            <div className="profile-page__error">{errorMessage}</div>
          )}

          {isEditing ? (
            <div className="profile-page__actions">
              <button
                className="profile-page__editButton"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>

              <button
                className="profile-page__cancelButton"
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              className="profile-page__editButton"
              type="button"
              onClick={handleStartEdit}
            >
              Редактировать
            </button>
          )}
        </form>
      </div>
    </section>
  );
};