import "../style/Modal.css";

type Credentials = {
  full_name?: string;
  role?: string;
  login: string;
  temporary_password: string;
};

type CredentialsModalProps = {
  isOpen: boolean;
  credentials: Credentials | null;
  onClose: () => void;
};

const getRoleLabel = (role?: string) => {
  if (role === "teacher") return "Преподаватель";
  if (role === "student") return "Студент";
  if (role === "parent") return "Родитель";
  if (role === "admin") return "Администратор";
  return role || "—";
};

const buildCredentialsText = (credentials: Credentials) => {
  return [
    credentials.full_name ? `ФИО: ${credentials.full_name}` : null,
    credentials.role ? `Роль: ${getRoleLabel(credentials.role)}` : null,
    `Логин: ${credentials.login}`,
    `Пароль: ${credentials.temporary_password}`,
  ]
    .filter(Boolean)
    .join("\n");
};

const fallbackCopyText = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
};

export const CredentialsModal = ({
  isOpen,
  credentials,
  onClose,
}: CredentialsModalProps) => {
  if (!isOpen || !credentials) return null;

  const handleCopy = async () => {
    const text = buildCredentialsText(credentials);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }
    } catch {
      try {
        fallbackCopyText(text);
      } catch {
        alert(text);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal--sm">
        <div className="modal__body">
          <h2 className="modal__title">Данные для входа</h2>

          {credentials.full_name && (
            <div className="modal__field">
              <div className="modal__label">ФИО</div>
              <div className="modal__staticValue">{credentials.full_name}</div>
            </div>
          )}

          {credentials.role && (
            <div className="modal__field">
              <div className="modal__label">Роль</div>
              <div className="modal__staticValue">
                {getRoleLabel(credentials.role)}
              </div>
            </div>
          )}

          <div className="modal__field">
            <div className="modal__label">Логин</div>
            <div className="modal__staticValue">{credentials.login}</div>
          </div>

          <div className="modal__field">
            <div className="modal__label">Временный пароль</div>
            <div className="modal__staticValue">
              {credentials.temporary_password}
            </div>
          </div>

          <div className="modal__hint">
            Сохраните эти данные сейчас. Позже пароль посмотреть будет нельзя.
          </div>
        </div>

        <div className="modal__footer">
          <button
            type="button"
            className="modal__button modal__button--primary"
            onClick={handleCopy}
          >
            Скопировать
          </button>

          <button
            type="button"
            className="modal__button modal__button--secondary"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};