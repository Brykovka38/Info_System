import { useEffect, useState } from "react";
import "../style/Table.css";

const API_URL = import.meta.env.VITE_API_URL;

type UsersTableProps = {
  activeRole: string | null;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  teachers: any[];
  students: any[];
  parents: any[];
  groups: any[];
  schools: any[];
  token: string | null;
  user: AuthUser | null;
  tableVariant?: "default" | "myGroup";
};

type User = {
  id: number;
  full_name: string;
  role: string;
  phone: string | null;
  status: string;
};

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  status: string;
  phone?: string;
};

export const UsersTable = ({ 
  activeRole, 
  selectedId, 
  setSelectedId, 
  teachers, 
  students, 
  parents, 
  groups, 
  schools, 
  token, 
  user,
  tableVariant = "default",
  }: UsersTableProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const formatDate = (date: string | null) => {
    if (!date) return "";

    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
  };

  useEffect(() => {
    if (!token) return;

    if (user?.role !== "admin") {
      setUsers([]);
      return;
    }

    fetch(`${API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data.error || "Ошибка загрузки пользователей");
        }

        return data;
      })
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Ошибка загрузки пользователей:", error);
        setUsers([]);
      });
  }, [token, user]);

  const [openTooltipId, setOpenTooltipId] = useState<number | null>(null);
  const [tooltipDirection, setTooltipDirection] = useState<"top" | "bottom">("bottom");

  const handleMouseEnter = (
    id: number,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedTooltipHeight = 180;

    if (spaceBelow < estimatedTooltipHeight) {
      setTooltipDirection("top");
    } else {
      setTooltipDirection("bottom");
    }

    setOpenTooltipId(id);
  };

  const handleMouseLeave = () => {
    setOpenTooltipId(null);
  };

  if (activeRole === "преподаватели") {
    return (
      <div
      className="users-table__area"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedId(null);
        }
      }}
    >
      <table
        key="teachers-table"
        className="app-table"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("tr")) {
            setSelectedId(null);
          }
        }}
      >
        <thead>
          <tr>
            <th>№</th>
            <th>ФИО преподавателя</th>
            {user?.role !== "parent" && user?.role !== "student" && (
              <><th>Состояние</th> </>
            )}
            <th>Номер телефона</th>
            <th>Группа</th>
            {user?.role !== "parent" && user?.role !== "student" && (<>
              <th>Старшие курсы</th>
              <th>Младшие курсы</th>
              <th>Всего детей</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher, index) => (
            <tr
              key={teacher.id}
              className={selectedId === teacher.id ? "row--selected" : ""}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(selectedId === teacher.id ? null : teacher.id);
              }}
            >
              <td>{index + 1}</td>
              <td>
                <div className="users-table__person">
                  <div className="users-table__personName">{teacher.full_name}</div>
                  {user?.role !== "parent" && user?.role !== "student" && (
                    <> {teacher.work_start_date && (
                        <div className="users-table__personDate">
                          ({formatDate(teacher.work_start_date)})
                        </div>
                       )} 
                    </>
                  )}

                </div>
              </td>
              {user?.role !== "parent" && user?.role !== "student" && (
                <><td>{teacher.status === "active" ? "Активный" : "Неактивный"}</td> </>
              )}
              <td>{teacher.phone || "—"}</td>
              <td className="users-table__groups">{teacher.group_names || "—"}</td>

              {user?.role !== "parent" && user?.role !== "student" && (<>
                <td>
                  <div
                    className="students-tooltip"
                    onMouseEnter={(e) => handleMouseEnter(teacher.id * 100 + 1, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="students-tooltip__count students-tooltip__count--active">
                      {teacher.senior_count}
                    </span>

                    {openTooltipId === teacher.id * 100 + 1 && (
                      <div
                        className={`students-tooltip__popup ${
                          tooltipDirection === "top"
                            ? "students-tooltip__popup--top"
                            : ""
                        }`}
                      >
                        {teacher.students_list.filter(
                          (s) => s.status === "active" && s.level === "С"
                        ).length > 0 ? (
                          teacher.students_list
                            .filter(
                              (s) =>
                                s.status === "active" &&
                                s.level === "С"
                            )
                            .map((student) => (
                              <div
                                key={student.id}
                                className="students-tooltip__item"
                              >
                                {student.full_name}
                              </div>
                            ))
                        ) : (
                          <div className="students-tooltip__empty">
                            Нет учеников
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
    
                <td>
                  <div
                    className="students-tooltip"
                    onMouseEnter={(e) => handleMouseEnter(teacher.id * 100 + 2, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="students-tooltip__count students-tooltip__count--active">
                      {teacher.junior_count}
                    </span>

                    {openTooltipId === teacher.id * 100 + 2 && (
                      <div
                        className={`students-tooltip__popup ${
                          tooltipDirection === "top"
                            ? "students-tooltip__popup--top"
                            : ""
                        }`}
                      >
                        {teacher.students_list.filter(
                          (s) => s.status === "active" && s.level === "М"
                        ).length > 0 ? (
                          teacher.students_list
                            .filter(
                              (s) =>
                                s.status === "active" &&
                                s.level === "М"
                            )
                            .map((student) => (
                              <div
                                key={student.id}
                                className="students-tooltip__item"
                              >
                                {student.full_name}
                              </div>
                            ))
                        ) : (
                          <div className="students-tooltip__empty">
                            Нет учеников
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                <td>
                  <div
                    className="students-tooltip"
                    onMouseEnter={(e) => handleMouseEnter(teacher.id * 100 + 3, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="students-tooltip__count students-tooltip__count--total">
                      {teacher.total_count}
                    </span>

                    {openTooltipId === teacher.id * 100 + 3 && (
                      <div
                        className={`students-tooltip__popup ${
                          tooltipDirection === "top"
                            ? "students-tooltip__popup--top"
                            : ""
                        }`}
                      >
                        {teacher.students_list.length > 0 ? (
                          teacher.students_list.map((student) => (
                            <div
                              key={student.id}
                              className={`students-tooltip__item ${
                                student.status !== "active"
                                  ? "students-tooltip__item--inactive"
                                  : ""
                              }`}
                            >
                              {student.full_name}
                            </div>
                          ))
                        ) : (
                          <div className="students-tooltip__empty">
                            Нет учеников
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                </> 
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    );
  }

  if (activeRole === "студенты") {
    return (
      <section key="students-section">
        <table key="students-table" className="app-table">
          <thead>
            {tableVariant === "myGroup" ? (
              <tr>
                <th>№</th>
                <th>ФИО студента</th>
                <th>Курс</th>
              </tr>
            ) : (
              <tr>
                <th>№</th>
                <th>ФИО студента</th>
                {user?.role !== "student" && <th>Состояние</th>}
                <th>Курс</th>
                <th>Группа</th>
                <th>Номер телефона</th>
                <th>ФИО родителя</th>
                <th>Школа</th>
                <th>Класс</th>
              </tr>
            )}
          </thead>

          <tbody>
            {students.map((student, index) => (
              <tr
                key={student.id}
                onClick={() =>
                  setSelectedId(selectedId === student.id ? null : student.id)
                }
                className={selectedId === student.id ? "row--selected" : ""}
              >
                {tableVariant === "myGroup" ? (
                  <>
                    <td>{index + 1}</td>
                    <td>{student.full_name}</td>
                    <td>{student.course_code ?? "—"}</td>
                  </>
                ) : (
                  <>
                    <td>{index + 1}</td>
                    <td>{student.full_name}</td>

                    {user?.role !== "student" && (
                      <td>
                        {student.status === "active" ? "Активный" : "Неактивный"}
                      </td>
                    )}

                    <td>{student.course_code ?? "—"}</td>

                    <td>
                      {student.group_name ? (
                        <div className="group-name">
                          <div>{student.group_name.split(" (")[0]}</div>
                          <div className="group-name__time">
                            {student.group_name.includes("(")
                              ? student.group_name.split(" (")[1].replace(")", "")
                              : ""}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>{student.phone ?? "—"}</td>
                    <td>{student.parent_name ?? "—"}</td>
                    <td>{student.school_name ?? "—"}</td>
                    <td>{student.class || "—"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  if (activeRole === "родители") {
    return (
      <section key="parents-section">
        <table key="parents-table" className="app-table">
          <thead>
            <tr>
              <th>№</th>
              <th>ФИО родителя</th>
              <th>Состояние</th>
              <th>Номер телефона</th>
              <th>ФИО ученика</th>
              <th>Группа</th>
              <th>Льгота</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((parent, index) => (
              <tr key={parent.id}
                  onClick={() => setSelectedId(selectedId === parent.id ? null : parent.id)}
                  className={selectedId === parent.id ? "row--selected" : ""}>
                <td>{index + 1}</td>
                <td>{parent.full_name}</td>
                <td>{parent.status === "active" ? "Активный" : "Неактивный"}</td>
                <td>{parent.phone ?? "—"}</td>
                <td className="users-table__multiline">
                  {parent.children_groups_list?.length > 0
                    ? parent.children_groups_list.map((item: any) => (
                        <div key={`${item.student_name}-${item.group_name}`}>
                          {item.student_name}
                        </div>
                      ))
                    : "—"}
                </td>

                <td className="users-table__multiline">
                  {parent.children_groups_list?.length > 0
                    ? parent.children_groups_list.map((item: any) => (
                        <div key={`${item.student_name}-${item.group_name}`}>
                          {item.group_name}
                        </div>
                      ))
                    : "—"}
                </td>
                
                <td>
                  {parent.benefit === null || parent.benefit === undefined
                    ? "—" : parent.benefit
                    ? "Есть": "Нет"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  if (activeRole === "группы") {
    return (
      <table key="groups-table" className="app-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Название группы</th>
            <th>Филиал</th>
            <th>Кабинет</th>
            <th>Преподаватель</th>
            <th>День недели</th>
            <th>Время</th>
            {user?.role !== "parent" && (
              <>
                <th>Всего учеников</th>
                <th>Активных</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, index) => (
            <tr
              key={group.id}
              className={selectedId === group.id ? "row--selected" : ""}
              onClick={() => setSelectedId(selectedId === group.id ? null : group.id)}
            >
              <td>{index + 1}</td>
              <td>
                <div className="group-name">
                  <div className="group-name__main">
                    {group.group_name.split(" (")[0]}
                  </div>
                  <div className="group-name__time">
                    {group.group_name.includes("(")
                      ? group.group_name.split(" (")[1].replace(")", "")
                      : ""}
                  </div>
                </div>
              </td>
              <td>{group.school_name}</td>
              <td>{group.cabinet}</td>
              <td>{group.teacher_name || "—"}</td>
              <td>{group.days}</td>
              <td>
                {group.start_time?.slice(0, 5)} — {group.end_time?.slice(0, 5)}
              </td>
              
              {user?.role !== "parent" && (
                <>
                <td>
                  <div
                    className="students-tooltip"
                    onMouseEnter={(e) => handleMouseEnter(group.id * 100 + 1, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="students-tooltip__count students-tooltip__count--total">
                      {group.total_students}
                    </span>

                    {openTooltipId === group.id * 100 + 1 && (
                      <div
                        className={`students-tooltip__popup ${
                          tooltipDirection === "top"
                            ? "students-tooltip__popup--top"
                            : ""
                        }`}
                      >
                        {group.students_list.length > 0 ? (
                          group.students_list.map((student: any) => (
                            <div
                              key={student.id}
                              className={`students-tooltip__item ${
                                student.status !== "active"
                                  ? "students-tooltip__item--inactive"
                                  : ""
                              }`}
                            >
                              {student.full_name}
                            </div>
                          ))
                        ) : (
                          <div className="students-tooltip__empty">
                            Нет учеников
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                <td>
                  <div
                    className="students-tooltip"
                    onMouseEnter={(e) => handleMouseEnter(group.id * 100 + 2, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="students-tooltip__count students-tooltip__count--active">
                      {group.active_students}
                    </span>

                    {openTooltipId === group.id * 100 + 2 && (
                      <div
                        className={`students-tooltip__popup ${
                          tooltipDirection === "top"
                            ? "students-tooltip__popup--top"
                            : ""
                        }`}
                      >
                        {group.students_list.filter(
                          (student: any) => student.status === "active"
                        ).length > 0 ? (
                          group.students_list
                            .filter((student: any) => student.status === "active")
                            .map((student: any) => (
                              <div
                                key={student.id}
                                className="students-tooltip__item"
                              >
                                {student.full_name}
                              </div>
                            ))
                        ) : (
                          <div className="students-tooltip__empty">
                            Нет активных учеников
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (activeRole === "школы") {
    return (
      <section key="schools-section">
        <table key="schools-table" className="app-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Сокращённое имя</th>
              <th>Полное название</th>
              <th>Адрес</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school, index) => (
              <tr
                key={school.id}
                onClick={() => setSelectedId(selectedId === school.id ? null : school.id)}
                className={selectedId === school.id ? "row--selected" : ""}
              >
                <td>{index + 1}</td>
                <td>{school.name || "—"}</td>
                <td>{school.full_name || "—"}</td>
                <td>{school.address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  if (user?.role === "teacher") {
    return (
      <section>
        <table className="app-table">
          <tbody>
            <tr>
              <td>Выберите раздел: студенты, родители, группы или школы</td>
            </tr>
          </tbody>
        </table>
      </section>
    );
  }

  return (
    <section>
      <table className="app-table">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Роль</th>
            <th>Номер телефона</th>
            <th>Состояние</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.full_name}</td>
              <td>{user.role === "admin"
                  ? "Администратор"
                  : user.role === "teacher"
                  ? "Преподаватель"
                  : user.role === "student"
                  ? "Студент"
                  : "Родитель"}</td>
              <td>{user.phone ?? "—"}</td>
              <td>{user.status === "active" ? "Активный" : "Неактивный"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};