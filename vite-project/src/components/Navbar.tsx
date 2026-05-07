import "./Navbar.css";

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  status: string;
  phone?: string;
};

type NavbarProps = {
  user: AuthUser | null;

  activeSection: string;
  setActiveSection: (section: string) => void;

  resetDataFilters: () => void;
  activeRole: string | null;
  setActiveRole: (role: string | null) => void;

  resetPaymentFilters: () => void;
  activePaymentTab?: string | null;
  setActivePaymentTab?: (tab: string | null) => void;

  resetHistoryFilters: () => void;
};

export const Navbar = ({
  user,
  activeSection,
  setActiveSection,
  resetDataFilters,
  resetPaymentFilters,
  resetHistoryFilters,
}: NavbarProps) => {
  const isStudent = user?.role === "student";

  return (
    <nav className="navbar">
      <button
        className={`navbar__item ${
          activeSection === "schedule" ? "navbar__item--active" : ""
        }`}
        type="button"
        onClick={() => {
          setActiveSection("schedule");
        }}
      >
        Расписание
      </button>

      <button
        className={`navbar__item ${
          activeSection === "history" ? "navbar__item--active" : ""
        }`}
        type="button"
        onClick={() => {
          setActiveSection("history");
          resetHistoryFilters();
        }}
      >
        История занятий
      </button>

      {!isStudent && (
        <div className="navbar__dropdown">
          <div className="navbar__splitButton">
            <button
              className={`navbar__item ${
                activeSection === "payments" ? "navbar__item--active" : ""
              }`}
              type="button"
              onClick={() => {
                setActiveSection("payments");
                resetPaymentFilters();
              }}
            >
              Платежи
            </button>
          </div>
        </div>
      )}

      <div className="navbar__dropdown">
        <div className="navbar__splitButton">
          <button
            className={`navbar__item ${
              activeSection === "data" ? "navbar__item--active" : ""
            }`}
            type="button"
            onClick={() => {
              setActiveSection("data");
              resetDataFilters();
            }}
          >
            Данные
          </button>
        </div>
      </div>
    </nav>
  );
};