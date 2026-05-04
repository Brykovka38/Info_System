import "../style/ToolbarCommon.css";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

const primaryRoleButtons = ["преподаватели", "студенты", "родители"];
const secondaryRoleButtons = ["группы", "школы"];
const actionButtons = ["добавить", "редактировать", "удалить"];

const sortOptionsByRole: Record<string, string[]> = {
  преподаватели: ["По группе", "По состоянию"],
  студенты: ["По преподавателю", "По группе", "По филиалу", "По состоянию"],
  родители: ["По студенту", "По группе", "По состоянию"],
  группы: ["По преподавателю", "По студенту", "По филиалу"],
  школы: [],
};

type FilterOption = {
  id: string;
  label: string;
};

type UsersToolbarProps = {
  activeRole: string | null;
  setActiveRole: (role: string | null) => void;

  activeSort: string | null;
  setActiveSort: (sort: string | null) => void;

  filterOptions: FilterOption[];
  selectedFilterValues: string[];
  setSelectedFilterValues: Dispatch<SetStateAction<string[]>>;

  selectedId: number | null;
  onDelete: () => void;
  onAdd: () => void;
  onEdit: () => void;

  user: AuthUser | null;
};

const getFilterLabel = (activeSort: string | null) => {
  if (activeSort === "По филиалу") return "филиал";
  if (activeSort === "По группе") return "группу";
  if (activeSort === "По преподавателю") return "преподавателя";
  if (activeSort === "По студенту") return "студента";
  if (activeSort === "По состоянию") return "состояние";

  return "значение";
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

export const UsersToolbar = ({
  activeRole,
  setActiveRole,
  activeSort,
  setActiveSort,
  filterOptions,
  selectedFilterValues,
  setSelectedFilterValues,
  onDelete,
  onAdd,
  onEdit,
  user,
}: UsersToolbarProps) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterValuesOpen, setIsFilterValuesOpen] = useState(false);

  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  const sortRef = useRef<HTMLDivElement | null>(null);
  const filterValuesRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";
  const isStudent = user?.role === "student";

  const sortOptions = activeRole ? sortOptionsByRole[activeRole] ?? [] : [];

  const availableSortOptions = sortOptions.filter((sort) => {
    if (
      isTeacher &&
      (activeRole === "студенты" || activeRole === "группы") &&
      sort === "По преподавателю"
    ) {
      return false;
    }

    return true;
  });

  const availablePrimaryRoleButtons = isTeacher
    ? ["студенты", "родители"]
    : isParent
    ? ["студенты", "преподаватели"]
    : isStudent
    ? ["студенты"]
    : primaryRoleButtons;

  const availableSecondaryRoleButtons = isTeacher || isParent
    ? ["группы", "школы"]
    : isStudent
    ? []
    : secondaryRoleButtons;

  const availableActionButtons =
    isAdmin
      ? actionButtons
      : isTeacher && (activeRole === "студенты" || activeRole === "родители")
      ? ["редактировать"]
      : [];

  

  const selectedCount = selectedFilterValues.length;
  const filterLabel = getFilterLabel(activeSort);

  const visibleFilterOptions = filterOptions.filter((option) =>
    option.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  const handleRoleClick = (role: string) => {
    if (isStudent) {
      setActiveRole("студенты");
      return;
    }

    setActiveRole(activeRole === role ? null : role);
    setIsSortOpen(false);
    setIsFilterValuesOpen(false);
    setFilterSearchQuery("");
  };

  const handleSortSelect = (sort: string | null) => {
    setActiveSort(sort);
    setSelectedFilterValues([]);
    setIsSortOpen(false);
    setFilterSearchQuery("");

    if (sort === null) {
      setIsFilterValuesOpen(false);
    } else {
      setIsFilterValuesOpen(true);
    }
  };

  const toggleFilterValue = (id: string) => {
    setSelectedFilterValues((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const handleActionClick = (action: string) => {
    if (!activeRole) return;

    if (action === "удалить") {
      onDelete();
      return;
    }

    if (action === "добавить") {
      onAdd();
      return;
    }

    if (action === "редактировать") {
      onEdit();
      return;
    }
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (sortRef.current && !sortRef.current.contains(target)) {
        setIsSortOpen(false);
      }

      if (
        filterValuesRef.current &&
        !filterValuesRef.current.contains(target)
      ) {
        setIsFilterValuesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (
      isTeacher &&
      (activeRole === "студенты" || activeRole === "группы") &&
      activeSort === "По преподавателю"
    ) {
      setActiveSort(null);
    }
  }, [isTeacher, activeRole, activeSort, setActiveSort]);

  return (
    <section className="toolbar toolbar--users">
      <div className="toolbar__left">
        <div className="toolbar__rolesBlock">
          <div className="toolbar__buttonsRow">
            {availablePrimaryRoleButtons.map((role) => (
              <button
                key={isParent && role === "студенты"
                      ? "дети"
                      : isStudent && role === "студенты"
                      ? "мои данные"
                      : role}
                type="button"
                className={`toolbar__button ${
                  activeRole === role ? "toolbar__button--active" : ""
                }`}
                onClick={() => handleRoleClick(role)}
              >
                {isParent && role === "студенты"
                ? "дети"
                : isStudent && role === "студенты"
                ? "мои данные"
                : role}
              </button>
            ))}
          </div>

          <div className="toolbar__buttonsRow toolbar__buttonsRow--secondary">
            {availableSecondaryRoleButtons.map((role) => (
              <button
                key={isParent && role === "студенты" ? "дети" : isStudent && role === "студенты" ? "мои данные" : role}
                type="button"
                className={`toolbar__button ${
                  activeRole === role ? "toolbar__button--active" : ""
                }`}
                onClick={() => handleRoleClick(role)}
              >
                {isParent && role === "студенты" ? "дети" : isStudent && role === "студенты" ? "мои данные" : role}
              </button>
            ))}
          </div>
        </div>

        {activeRole && availableActionButtons.length > 0 && (
          <div className="toolbar__actionsInline users-toolbar__actionsInline">
            {availableActionButtons.map((action) => (
              <button
                key={action}
                type="button"
                className="toolbar__actionMini"
                onClick={() => handleActionClick(action)}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {!isParent && !isStudent && (
        <div className="toolbar__right">
          <div className="toolbar__sort" ref={sortRef}>
            <button
              className="toolbar__sortButton"
              type="button"
              disabled={!activeRole}
              onClick={() => {
                if (!activeRole) return;
                setIsSortOpen((prev) => !prev);
              }}
            >
              Сортировать
              <span
                className={`toolbar__sortArrow ${
                  isSortOpen ? "toolbar__sortArrow--open" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {isSortOpen && (
              <div className="toolbar__dropdown">
                <button
                  type="button"
                  className={`toolbar__dropdownItem ${
                    activeSort === null ? "toolbar__dropdownItem--active" : ""
                  }`}
                  onClick={() => handleSortSelect(null)}
                >
                  Без сортировки
                </button>

                {availableSortOptions.map((sort) => (
                  <button
                    key={sort}
                    type="button"
                    className={`toolbar__dropdownItem ${
                      activeSort === sort ? "toolbar__dropdownItem--active" : ""
                    }`}
                    onClick={() => handleSortSelect(sort)}
                  >
                    {sort}
                  </button>
                ))}

                {sortOptions.length === 0 && activeRole === "школы" && (
                  <div className="toolbar__dropdownItem">Нет вариантов</div>
                )}
              </div>
            )}
          </div>

          {activeSort !== null && (
            <div className="toolbar__filterValues" ref={filterValuesRef}>
              <button
                type="button"
                className="toolbar__filterValuesButton"
                onClick={() => setIsFilterValuesOpen((prev) => !prev)}
              >
                {selectedCount > 0
                  ? `Выбрано: ${selectedCount}`
                  : `Выбрать ${filterLabel}`}
              </button>

              {isFilterValuesOpen && (
                <div className="toolbar__filterValuesDropdown">
                  <input
                    type="text"
                    className="toolbar__filterSearchInput"
                    placeholder={`Поиск: ${filterLabel}`}
                    value={filterSearchQuery}
                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                  />

                  {visibleFilterOptions.length === 0 ? (
                    <p className="toolbar__filterEmpty">Нет данных</p>
                  ) : (
                    visibleFilterOptions.map((option) => (
                      <label
                        key={option.id}
                        className="toolbar__filterCheckboxItem"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFilterValues.includes(option.id)}
                          onChange={() => toggleFilterValue(option.id)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))
                  )}

                  {selectedFilterValues.length > 0 && (
                    <button
                      type="button"
                      className="toolbar__filterClear"
                      onClick={() => setSelectedFilterValues([])}
                    >
                      Сбросить выбор
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Поиск пока выключен, как в ControlsPanel.
              Если потом нужен будет рабочий поиск, лучше сделать его отдельно через UsersPage. */}
          {/* <div className="toolbar__search">
            <input
              type="text"
              className="toolbar__searchInput"
              placeholder="Поиск..."
            />
          </div> */}
        </div>
      )}
    </section>
  );
};