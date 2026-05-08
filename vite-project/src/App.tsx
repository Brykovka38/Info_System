import { useState } from "react";
import { Header } from "./components/Header";
import { Navbar } from "./components/Navbar";
import { SchedulePage } from "./components/Schedule/SchedulePage";
import { UsersPage } from "./components/Data_user/UsersPage";
import { PaymentsPage } from "./components/Payments/PaymentsPage";
import { HistoryPage } from "./components/History/HistoryPage";
import { ProfilePage } from "./components/Profile/ProfilePage";
import { LoginPage } from "./components/Login/LoginPage";

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  status: string;
  phone?: string;
};

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("token");
  });

  const [activeSection, setActiveSection] = useState("schedule");

  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [, setActiveSort] = useState<string | null>(null);

  const isAuthenticated = Boolean(currentUser && token);

  const resetDataFilters = () => {
    setActiveRole(null);
    setActiveSort(null);
  };

  const resetPaymentFilters = () => {};

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setActiveSection("login");

    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const handleLogin = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    setToken(token);
    setActiveSection("schedule");

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
  };

  return (
    <>
      <Header setActiveSection={setActiveSection} onLogout={handleLogout} />

      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <>
          <Navbar
            user={currentUser}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            resetDataFilters={resetDataFilters}
            activeRole={activeRole}
            setActiveRole={setActiveRole}
            resetPaymentFilters={resetPaymentFilters}
            resetHistoryFilters={() => {}}
          />

          {activeSection === "schedule" && (
            <SchedulePage user={currentUser} token={token} />
          )}

          {activeSection === "data" && (
            <UsersPage user={currentUser} token={token} />
          )}

          {activeSection === "payments" && (
            <PaymentsPage user={currentUser} token={token} />
          )}

          {activeSection === "history" && (
            <HistoryPage user={currentUser} token={token} />
          )}

          {activeSection === "profile" && (
            <ProfilePage
              user={currentUser}
              token={token}
              onUserUpdate={(updatedUser) => {
                setCurrentUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
              }}
            />
          )}
        </>
      )}
    </>
  );
}

export default App;