import "../style/ToolbarCommon.css";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

const historyTabs = ["группа", "студент"];
const groupSortOptions = ["По препод.", "По филиалу", "По времени"];
const studentSortOptions = [
  "По препод.",
  "По студенту",
  "По филиалу",
  "По времени",
];

type FilterOption = {
  id: string;
  label: string;
};

type HistoryToolbarProps = {
  user: AuthUser | null;

  activeHistoryTab: "группа" | "студент";
  setActiveHistoryTab: (tab: "группа" | "студент") => void;

  activeHistorySort: string | null;
  setActiveHistorySort: (sort: string | null) => void;

  filterOptions: FilterOption[];
  selectedFilterValues: string[];
  setSelectedFilterValues: Dispatch<SetStateAction<string[]>>;

  onAddLesson: () => void;
  onAddStudentAttendance: () => void;
};

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  phone?: string;
  must_change_password: boolean;
  status: string;
};

export const HistoryToolbar = ({
  user,
  activeHistoryTab,
  setActiveHistoryTab,
  activeHistorySort,
  setActiveHistorySort,
  filterOptions,
  selectedFilterValues,
  setSelectedFilterValues,
  onAddLesson,
  onAddStudentAttendance,
}: HistoryToolbarProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFilterValuesOpen, setIsFilterValuesOpen] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const filterValuesRef = useRef<HTMLDivElement | null>(null);

  const handleSelectSort = (sort: string | null) => {
    setActiveHistorySort(sort);
    setSelectedFilterValues([]);
    setFilterSearchQuery("");
    setIsDropdownOpen(false);

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

  const visibleFilterOptions = filterOptions.filter((option) =>
    option.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  const selectedCount = selectedFilterValues.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
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

  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";
  const isStudent = user?.role === "student";
  const canEditHistory = user?.role === "admin" || user?.role === "teacher";

  const availableHistoryTabs = isStudent ? ["студент"] : historyTabs;

  const currentSortOptions =
    activeHistoryTab === "группа" ? groupSortOptions : studentSortOptions;

  const availableSortOptions = currentSortOptions.filter((sort) => {
    if (isTeacher && sort === "По препод.") {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (isTeacher && activeHistorySort === "По препод.") {
      setActiveHistorySort(null);
      setSelectedFilterValues([]);
      setIsFilterValuesOpen(false);
    }
  }, [
    isTeacher,
    activeHistorySort,
    setActiveHistorySort,
    setSelectedFilterValues,
  ]);

  return (
    <section className="toolbar">
      <div className="toolbar__left">
        <div className="toolbar__buttonsRow">
          {availableHistoryTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`toolbar__button ${
                activeHistoryTab === tab ? "toolbar__button--active" : ""
              }`}
              onClick={() => {
                setActiveHistoryTab(tab as "группа" | "студент");
                setActiveHistorySort(null);
                setSelectedFilterValues([]);
                setFilterSearchQuery("");
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {canEditHistory && (
          <div className="toolbar__actionsInline">
            <button
              type="button"
              className="toolbar__actionMini"
              onClick={
                activeHistoryTab === "группа"
                  ? onAddLesson
                  : onAddStudentAttendance
              }
            >
              {activeHistoryTab === "группа"
                ? "Добавить занятие"
                : "Добавить ученика"}
            </button>
          </div>
        )}
      </div>

      {!isStudent && !isParent && (
        <div className="toolbar__right">
          <div className="toolbar__sort" ref={dropdownRef}>
            <button
              className="toolbar__sortButton"
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
            >
              Сортировать
              <span
                className={`toolbar__sortArrow ${
                  isDropdownOpen ? "toolbar__sortArrow--open" : ""
                }`}
              >
                ▼
              </span>
            </button>

            {isDropdownOpen && (
              <div className="toolbar__dropdown">
                <button
                  type="button"
                  className={`toolbar__dropdownItem ${
                    activeHistorySort === null
                      ? "toolbar__dropdownItem--active"
                      : ""
                  }`}
                  onClick={() => handleSelectSort(null)}
                >
                  Без сортировки
                </button>

                {availableSortOptions.map((sort) => (
                  <button
                    key={sort}
                    type="button"
                    className={`toolbar__dropdownItem ${
                      activeHistorySort === sort
                        ? "toolbar__dropdownItem--active"
                        : ""
                    }`}
                    onClick={() => handleSelectSort(sort)}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeHistorySort !== null && (
            <div className="toolbar__filterValues" ref={filterValuesRef}>
              <button
                type="button"
                className="toolbar__filterValuesButton"
                onClick={() => setIsFilterValuesOpen((prev) => !prev)}
              >
                {selectedCount > 0
                  ? `Выбрано: ${selectedCount}`
                  : "Выбрать"}
              </button>

              {isFilterValuesOpen && (
                <div className="toolbar__filterValuesDropdown">
                  <input
                    type="text"
                    className="toolbar__filterSearchInput"
                    placeholder="Поиск..."
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

        
        </div>
      )}
    </section>
  );
};