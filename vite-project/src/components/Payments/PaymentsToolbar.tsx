import "./PaymentsToolbar.css";
import "../style/ToolbarCommon.css";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

const paymentTabs = ["оплата"];

const sortOptions = [
  "По студенту",
  "По группе",
  "По препод.",
  "По филиалу",
  "По времени",
];

const paymentFilters = ["За весь период", "Зачетная книжка"];
const payoutFilters = ["За весь период"];

const actionButtons = ["внести оплату"];

const studyMonths = [
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
];

type PaymentMode = "month" | "period" | "recordBook";
type PayoutMode = "month" | "period";

type FilterOption = {
  id: string;
  label: string;
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

type PaymentsToolbarProps = {
  activePaymentTab: string | null;
  setActivePaymentTab: (tab: string | null) => void;

  activePaymentSort: string | null;
  setActivePaymentSort: (sort: string | null) => void;

  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;

  payoutMode: PayoutMode;
  setPayoutMode: (mode: PayoutMode) => void;

  selectedPaymentMonth: string;
  setSelectedPaymentMonth: (month: string) => void;

  selectedPayoutMonth: string;
  setSelectedPayoutMonth: (month: string) => void;

  onOpenPaymentModal: () => void;

  filterOptions: FilterOption[];
  selectedFilterValues: string[];
  setSelectedFilterValues: Dispatch<SetStateAction<string[]>>;

  user: AuthUser | null;
};

export const PaymentsToolbar = ({
  activePaymentTab,
  setActivePaymentTab,
  activePaymentSort,
  setActivePaymentSort,
  paymentMode,
  setPaymentMode,
  payoutMode,
  setPayoutMode,
  selectedPaymentMonth,
  setSelectedPaymentMonth,
  selectedPayoutMonth,
  setSelectedPayoutMonth,
  onOpenPaymentModal,
  filterOptions,
  selectedFilterValues,
  setSelectedFilterValues,
  user,
}: PaymentsToolbarProps) => {
  const [openMonthMenu, setOpenMonthMenu] = useState<string | null>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterValuesOpen, setIsFilterValuesOpen] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  const filterValuesRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  const isParent = user?.role === "parent";
  const isTeacher = user?.role === "teacher";

  const availablePaymentTabs = isParent ? ["оплата"] : paymentTabs;

  const availablePaymentFilters = isParent
    ? ["За весь период", "Зачетная книжка"]
    : paymentFilters;

  const availableActionButtons = isParent ? [] : actionButtons;

  const availableSortOptions = sortOptions.filter((sort) => {
    if (isTeacher && sort === "По препод.") {
      return false;
    }

    return true;
  });

  const visibleFilterOptions = filterOptions.filter((option) =>
    option.label.toLowerCase().includes(filterSearchQuery.toLowerCase())
  );

  const selectedCount = selectedFilterValues.length;

  const handleTabClick = (tab: string) => {
    if (activePaymentTab === tab) {
      setActivePaymentTab(null);
      setOpenMonthMenu(null);
      return;
    }

    setActivePaymentTab(tab);

    if (tab === "оплата") {
      setPaymentMode("month");
    }

    if (tab === "выплаты") {
      setPayoutMode("month");
    }
  };

  const handleSortSelect = (sort: string | null) => {
    setActivePaymentSort(sort);
    setSelectedFilterValues([]);
    setFilterSearchQuery("");
    setIsSortOpen(false);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }

      if (
        filterValuesRef.current &&
        !filterValuesRef.current.contains(event.target as Node)
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
    if (isTeacher && activePaymentSort === "По препод.") {
      setActivePaymentSort(null);
      setSelectedFilterValues([]);
    }
  }, [
    isTeacher,
    activePaymentSort,
    setActivePaymentSort,
    setSelectedFilterValues,
  ]);

  useEffect(() => {
    if (isParent) {
      setActivePaymentSort(null);
      setSelectedFilterValues([]);
      setIsSortOpen(false);
      setIsFilterValuesOpen(false);

      if (activePaymentTab === "выплаты") {
        setActivePaymentTab("оплата");
      }
    }
  }, [
    isParent,
    activePaymentTab,
    setActivePaymentTab,
    setActivePaymentSort,
    setSelectedFilterValues,
  ]);

  return (
    <section className="toolbar">
      <div className="toolbar__left">
        <div className="toolbar__buttonsRow">
          {availablePaymentTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`toolbar__button ${
                activePaymentTab === tab ? "toolbar__button--active" : ""
              }`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activePaymentTab === "оплата" && (
          <div className="toolbar__chipRow">
            <div className="payments-toolbar__monthDropdown">
              <button
                type="button"
                className={`toolbar__chip ${
                  paymentMode === "month" ? "toolbar__chip--active" : ""
                }`}
                onClick={() =>
                  setOpenMonthMenu((prev) =>
                    prev === "paymentMonth" ? null : "paymentMonth"
                  )
                }
              >
                {selectedPaymentMonth} <ChevronDown size={16} />
              </button>

              {openMonthMenu === "paymentMonth" && (
                <div className="payments-toolbar__monthMenu">
                  {studyMonths.map((month) => (
                    <button
                      key={month}
                      type="button"
                      className="payments-toolbar__monthItem"
                      onClick={() => {
                        setSelectedPaymentMonth(month);
                        setPaymentMode("month");
                        setOpenMonthMenu(null);
                      }}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {availablePaymentFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`toolbar__chip ${
                  (filter === "За весь период" && paymentMode === "period") ||
                  (filter === "Зачетная книжка" &&
                    paymentMode === "recordBook")
                    ? "toolbar__chip--active"
                    : ""
                }`}
                onClick={() => {
                  if (filter === "За весь период") {
                    setPaymentMode("period");
                  }

                  if (filter === "Зачетная книжка") {
                    setPaymentMode("recordBook");
                  }
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {activePaymentTab === "выплаты" && !isParent && (
          <div className="toolbar__chipRow">
            <div className="payments-toolbar__monthDropdown">
              <button
                type="button"
                className={`toolbar__chip ${
                  payoutMode === "month" ? "toolbar__chip--active" : ""
                }`}
                onClick={() =>
                  setOpenMonthMenu((prev) =>
                    prev === "payoutMonth" ? null : "payoutMonth"
                  )
                }
              >
                {selectedPayoutMonth} <ChevronDown size={16} />
              </button>

              {openMonthMenu === "payoutMonth" && (
                <div className="payments-toolbar__monthMenu">
                  {studyMonths.map((month) => (
                    <button
                      key={month}
                      type="button"
                      className="payments-toolbar__monthItem"
                      onClick={() => {
                        setSelectedPayoutMonth(month);
                        setPayoutMode("month");
                        setOpenMonthMenu(null);
                      }}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {payoutFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`toolbar__chip ${
                  payoutMode === "period" ? "toolbar__chip--active" : ""
                }`}
                onClick={() => setPayoutMode("period")}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {availableActionButtons.length > 0 && (
          <div className="toolbar__actionsInline">
            {availableActionButtons.map((action) => (
              <button
                key={action}
                type="button"
                className="toolbar__actionMini"
                onClick={() => {
                  if (
                    action === "внести оплату" &&
                    activePaymentTab === "оплата"
                  ) {
                    onOpenPaymentModal();
                    return;
                  }

                  console.log(`${action}: ${activePaymentTab}`);
                }}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isParent && (
        <div className="toolbar__right">
          <div className="toolbar__sort" ref={sortRef}>
            <button
              className="toolbar__sortButton"
              type="button"
              onClick={() => setIsSortOpen((prev) => !prev)}
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
                    activePaymentSort === null
                      ? "toolbar__dropdownItem--active"
                      : ""
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
                      activePaymentSort === sort
                        ? "toolbar__dropdownItem--active"
                        : ""
                    }`}
                    onClick={() => handleSortSelect(sort)}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activePaymentSort !== null && (
            <div className="toolbar__filterValues" ref={filterValuesRef}>
              <button
                type="button"
                className="toolbar__filterValuesButton"
                onClick={() => setIsFilterValuesOpen((prev) => !prev)}
              >
                {selectedCount > 0 ? `Выбрано: ${selectedCount}` : "Выбрать"}
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