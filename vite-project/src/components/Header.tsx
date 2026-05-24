import "./Header.css";
import naitLogo from "../assets/logo.jpg";
import { CircleUserRound } from "lucide-react";

type HeaderProps = {
  setActiveSection: (section: string) => void;
  onLogout: () => void;
  isLoginPage?: boolean;
};

export const Header = ({
  setActiveSection,
  onLogout,
  isLoginPage = false,
}: HeaderProps) => {
  return (
    <header className="header">
      <div className="header__left">
        <img className="header__logo" src={naitLogo} alt="Логотип НАИТ" />
      </div>

      {!isLoginPage && (
        <div className="header__profile">
          <button
            className="header__profileButton"
            type="button"
            aria-label="Профиль"
          >
            <CircleUserRound size={44} />
          </button>

          <div className="header__dropdown">
            <button
              className="header__dropdownItem"
              type="button"
              onClick={() => setActiveSection("profile")}
            >
              Информация о себе
            </button>

            <button
              className="header__dropdownItem"
              type="button"
              onClick={onLogout}
            >
              Выход
            </button>
          </div>
        </div>
      )}
    </header>
  );
};