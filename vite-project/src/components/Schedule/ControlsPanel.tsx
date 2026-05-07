import "./ControlsPanel.css";
import "../style/ToolbarCommon.css";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

const periods = ["день", "неделя", "месяц"];
const filters = ["Без сортировки", "Филиал", "Группа", "Препод."];

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

type FilterOption = {
  id: string;
  label: string;
};

type ControlsPanelProps = {
  user: AuthUser | null;

  viewMode: string;
  setViewMode: Dispatch<SetStateAction<string>>;
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;

  selectedFilter: string;
  setSelectedFilter: Dispatch<SetStateAction<string>>;
  filterOptions: FilterOption[];
  selectedFilterValues: string[];
  setSelectedFilterValues: Dispatch<SetStateAction<string[]>>;
};

const formatDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatShortDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
};

const getWeekRange = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    formattedShort: `${formatShortDate(monday)} - ${formatShortDate(sunday)}`,
  };
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

export const ControlsPanel = ({
  user,

  viewMode,
  setViewMode,
  selectedDate,
  setSelectedDate,

  selectedFilter,
  setSelectedFilter,
  filterOptions,
  selectedFilterValues,
  setSelectedFilterValues,
}: ControlsPanelProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFilterValuesOpen, setIsFilterValuesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const filterValuesRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";

  const availableFilters = filters.filter((filter) => {
    if (isTeacher && filter === "Препод.") {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (isParent && selectedFilter !== "Без сортировки") {
      setSelectedFilter("Без сортировки");
      setSelectedFilterValues([]);
      setIsFilterValuesOpen(false);
      setIsDropdownOpen(false);
      return;
    }

    if (isTeacher && selectedFilter === "Препод.") {
      setSelectedFilter("Без сортировки");
      setSelectedFilterValues([]);
      setIsFilterValuesOpen(false);
      setIsDropdownOpen(false);
    }
  }, [
    isParent,
    isTeacher,
    selectedFilter,
    setSelectedFilter,
    setSelectedFilterValues,
  ]);

  const handleSelectFilter = (filterName: string) => {
    setSelectedFilter(filterName);
    setSelectedFilterValues([]);
    setIsDropdownOpen(false);

    if (filterName === "Без сортировки") {
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

  const handleOpenDatePicker = () => {
    const input = dateInputRef.current;

    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  const weekRange = getWeekRange(selectedDate);
  const selectedDateFormatted = formatDate(new Date(selectedDate));
  const selectedDateObj = new Date(selectedDate);
  const currentMonthLabel = monthNames[selectedDateObj.getMonth()];
  const selectedCount = selectedFilterValues.length;

  const visibleFilterOptions = filterOptions.filter((option) =>
    option.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  return (
    <section className="toolbar">
      <div className="toolbar__left">
        <div className="toolbar__row">
          {periods.map((period) => (
            <button
              key={period}
              type="button"
              className={`toolbar__button ${
                viewMode === period ? "toolbar__button--active" : ""
              }`}
              onClick={() => setViewMode(period)}
            >
              {period}
            </button>
          ))}
        </div>

        <div className="controls__dateBlock">
          <label className="controls__dateLabel" htmlFor="schedule-date">
            {viewMode === "неделя"
              ? "Неделя"
              : viewMode === "месяц"
              ? "Месяц"
              : "Дата"}
          </label>

          <div className="controls__dateFieldWrapper">
            <button
              type="button"
              className="controls__dateDisplay"
              onClick={handleOpenDatePicker}
            >
              {viewMode === "неделя"
                ? weekRange.formattedShort
                : viewMode === "месяц"
                ? currentMonthLabel
                : selectedDateFormatted}
            </button>

            <input
              ref={dateInputRef}
              id="schedule-date"
              className="controls__dateInputHidden"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {!isParent && (
        <div className="toolbar__right controls__rightBlock">
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
                {availableFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`toolbar__dropdownItem ${
                      selectedFilter === filter
                        ? "toolbar__dropdownItem--active"
                        : ""
                    }`}
                    onClick={() => handleSelectFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedFilter !== "Без сортировки" && (
            <div className="toolbar__filterValues" ref={filterValuesRef}>
              <button
                type="button"
                className="toolbar__filterValuesButton"
                onClick={() => setIsFilterValuesOpen((prev) => !prev)}
              >
                {selectedCount > 0
                  ? `Выбрано: ${selectedCount}`
                  : `Выбрать ${selectedFilter.toLowerCase()}`}
              </button>

              {isFilterValuesOpen && (
                <div className="toolbar__filterValuesDropdown">
                  <input
                    type="text"
                    className="toolbar__filterSearchInput"
                    placeholder={`Поиск: ${selectedFilter.toLowerCase()}`}
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

          {/* <div className="toolbar__search">
            <input
              type="text"
              className="toolbar__searchInput"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div> */}
        </div>
      )}
    </section>
  );
};