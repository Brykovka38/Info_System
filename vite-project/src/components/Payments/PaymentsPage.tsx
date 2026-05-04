import { useEffect, useMemo, useState } from "react";
import { PaymentsToolbar } from "./PaymentsToolbar";
import { PaymentsTable, type PaymentItem } from "./PaymentsTable";
import { AddPaymentModal } from "./Modal/AddPaymentModal";
import { RecordBookModal } from "./Modal/RecordBookModal";

const API_URL = import.meta.env.VITE_API_URL;

type PaymentMode = "month" | "period" | "recordBook";
type PayoutMode = "month" | "period";

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

const allMonths = [
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

const utcMonthName = allMonths[new Date().getUTCMonth()];
const defaultStudyMonth = studyMonths.includes(utcMonthName)
  ? utcMonthName
  : "Сентябрь";

const monthMap: Record<string, number> = {
  Сентябрь: 9,
  Октябрь: 10,
  Ноябрь: 11,
  Декабрь: 12,
  Январь: 1,
  Февраль: 2,
  Март: 3,
  Апрель: 4,
  Май: 5,
};

type PeriodMonthCell = {
  status: "оплачено" | "частично" | "не оплачено";
  amount: string | number;
} | null;

type PeriodPaymentItem = {
  enrollment_id: number;
  student_id: number;
  full_name: string;
  group_id: number | null;
  group_name: string | null;
  months: {
    9: PeriodMonthCell;
    10: PeriodMonthCell;
    11: PeriodMonthCell;
    12: PeriodMonthCell;
    1: PeriodMonthCell;
    2: PeriodMonthCell;
    3: PeriodMonthCell;
    4: PeriodMonthCell;
    5: PeriodMonthCell;
  };
};

type RecordBookItem = {
  student_id: number;
  full_name: string;
  group_name: string | null;
  record_book_id: number | null;
  has_record_book: boolean;
  payment_date: string | null;
  amount: string | number;
  payment_method: string | null;
  note: string;
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

type PaymentsPageProps = {
  user: AuthUser | null;
  token: string | null;
};

export const PaymentsPage = ({ user, token }: PaymentsPageProps) => {
  const [activePaymentTab, setActivePaymentTab] = useState<string | null>("оплата");
  const [activePaymentSort, setActivePaymentSort] = useState<string | null>(null);
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("month");
  const [payoutMode, setPayoutMode] = useState<PayoutMode>("month");

  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState<string>(defaultStudyMonth);
  const [selectedPayoutMonth, setSelectedPayoutMonth] = useState<string>(defaultStudyMonth);

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);

  const selectedPaymentYear = 2026;

  const [periodPayments, setPeriodPayments] = useState<PeriodPaymentItem[]>([]);

  const [recordBooks, setRecordBooks] = useState<RecordBookItem[]>([]);
  const [selectedRecordBook, setSelectedRecordBook] = useState<RecordBookItem | null>(null);
  const [isRecordBookModalOpen, setIsRecordBookModalOpen] = useState(false);

  const [selectedPeriodPayment, setSelectedPeriodPayment] = useState<PeriodPaymentItem | null>(null);

  const isParent = user?.role === "parent";

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
      throw new Error(data.message || data.error || "Ошибка запроса");
    }

    return data;
  };


  useEffect(() => {
    if (activePaymentTab !== "оплата") {
      return;
    }

    if (paymentMode === "month") {
      fetchPayments();
    }

    if (paymentMode === "period") {
      fetchPaymentsPeriod();
    }

    if (paymentMode === "recordBook") {
      fetchRecordBooks();
    }
  }, [activePaymentTab, paymentMode, selectedPaymentMonth, activePaymentSort]);

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      setPaymentsError("");

      const month = monthMap[selectedPaymentMonth];
      const year = selectedPaymentYear;

      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      });

      if (activePaymentSort) {
        params.append("sort", activePaymentSort);
      }

      const data = await fetchWithAuth(
        `${API_URL}/payments?${params.toString()}`
      );

      setPayments(Array.isArray(data) ? data : []);

      if (selectedPayment) {
        const updatedSelected = data.find(
          (item: PaymentItem) =>
            item.enrollment_id === selectedPayment.enrollment_id
        );
        setSelectedPayment(updatedSelected || null);
      }
    } catch (error) {
      console.error("Ошибка загрузки оплат:", error);
      setPaymentsError("Не удалось загрузить данные об оплатах");
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleOpenPaymentModal = () => {
    if (isParent) {
      return;
    }

    if (paymentMode === "recordBook") {
      if (!selectedRecordBook) {
        alert("Сначала выберите ученика в таблице");
        return;
      }

      setIsRecordBookModalOpen(true);
      return;
    }

    if (paymentMode === "period") {
      if (!selectedPeriodPayment) {
        alert("Сначала выберите ученика в таблице");
        return;
      }

      setSelectedPayment({
        enrollment_id: selectedPeriodPayment.enrollment_id,
        student_id: selectedPeriodPayment.student_id,
        full_name: selectedPeriodPayment.full_name,
        group_id: selectedPeriodPayment.group_id,
        group_name: selectedPeriodPayment.group_name,
        school_name: null,
        teacher_name: null,
        payment_id: null,
        payment_date: null,
        payment_method: null,
        status: "не оплачено",
        amount: 0,
        note: "",
        has_benefit: false,
      });

      setIsAddPaymentModalOpen(true);
      return;
    }

    if (!selectedPayment) {
      alert("Сначала выберите ученика в таблице");
      return;
    }

    setIsAddPaymentModalOpen(true);
  };

  const handleSavePayment = async (paymentData: {
    enrollment_id: number;
    payment_date: string;
    payment_months: number[];
    payment_year: number;
    monthly_amount: number;
    payment_method: "наличные" | "безналичные";
    status: "оплачено" | "частично" | "не оплачено";
    note: string;
  }) => {
    if (isParent) {
      throw new Error("Недостаточно прав");
    }

    const isEdit = Boolean(selectedPayment?.payment_id);

    if (isEdit) {
      await fetchWithAuth(
        `${API_URL}/payments/${selectedPayment?.payment_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enrollment_id: paymentData.enrollment_id,
            payment_date: paymentData.payment_date,
            payment_month: selectedPaymentMonth
              ? monthMap[selectedPaymentMonth]
              : 4,
            payment_year: paymentData.payment_year,
            amount: paymentData.monthly_amount,
            payment_method: paymentData.payment_method,
            status: paymentData.status,
            note: paymentData.note,
          }),
        }
      );
    } else {
      await fetchWithAuth(`${API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });
    }

    if (paymentMode === "period") {
      await fetchPaymentsPeriod();
    } else {
      await fetchPayments();
    }
  };

  const handleSaveRecordBook = async (data: {
    student_id: number;
    has_record_book: boolean;
    payment_date: string;
    amount: number;
    payment_method: "наличные" | "безналичные";
    note: string;
  }) => {
     if (isParent) {
      throw new Error("Недостаточно прав");
    }

  const isEdit = Boolean(selectedPayment?.payment_id);
    await fetchWithAuth(`${API_URL}/record-books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    await fetchRecordBooks();
  };

  const fetchPaymentsPeriod = async () => {
    try {
      setLoadingPayments(true);
      setPaymentsError("");

      const params = new URLSearchParams({
        year: String(selectedPaymentYear),
      });

      const data = await fetchWithAuth(
        `${API_URL}/payments/period?${params.toString()}`
      );

      setPeriodPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки оплат за период:", error);
      setPaymentsError("Не удалось загрузить данные об оплатах за период");
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchRecordBooks = async () => {
    try {
      setLoadingPayments(true);
      setPaymentsError("");

      const data = await fetchWithAuth(`${API_URL}/record-books`);

      setRecordBooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки зачётных книжек:", error);
      setPaymentsError("Не удалось загрузить данные о зачётных книжках");
    } finally {
      setLoadingPayments(false);
    }
  };

  const filterOptions = useMemo(() => {
    if (activePaymentSort === "По студенту") {
      const students =
        paymentMode === "period"
          ? periodPayments.map((item) => item.full_name)
          : paymentMode === "recordBook"
          ? recordBooks.map((item) => item.full_name)
          : payments.map((item) => item.full_name);

      return Array.from(new Set(students)).map((student) => ({
        id: student,
        label: student,
      }));
    }

    if (activePaymentSort === "По группе") {
      const groups =
        paymentMode === "period"
          ? periodPayments.map((item) => item.group_name)
          : paymentMode === "recordBook"
          ? recordBooks.map((item) => item.group_name)
          : payments.map((item) => item.group_name);

      return Array.from(new Set(groups.filter(Boolean))).map((group) => ({
        id: group as string,
        label: group as string,
      }));
    }

    if (activePaymentSort === "По препод.") {
      const teachers = payments
        .map((item) => item.teacher_name)
        .filter((teacher): teacher is string => Boolean(teacher));

      return Array.from(new Set(teachers)).map((teacher) => ({
        id: teacher,
        label: teacher,
      }));
    }

    if (activePaymentSort === "По филиалу") {
      const schools = payments
        .map((item) => item.school_name)
        .filter((school): school is string => Boolean(school));

      return Array.from(new Set(schools)).map((school) => ({
        id: school,
        label: school,
      }));
    }

    if (activePaymentSort === "По времени") {
      return [
        { id: "new_first", label: "Сначала новые" },
        { id: "old_first", label: "Сначала старые" },
      ];
    }

    return [];
  }, [activePaymentSort, paymentMode, payments, periodPayments, recordBooks]);

  const filteredPayments = useMemo(() => {
    let result = [...payments];

    if (activePaymentSort === null || selectedFilterValues.length === 0) {
      return result;
    }

    if (activePaymentSort === "По студенту") {
      result = result.filter((item) =>
        selectedFilterValues.includes(item.full_name)
      );
    }

    if (activePaymentSort === "По группе") {
      result = result.filter(
        (item) =>
          item.group_name &&
          selectedFilterValues.includes(item.group_name)
      );
    }

    if (activePaymentSort === "По препод.") {
      result = result.filter(
        (item) =>
          item.teacher_name && selectedFilterValues.includes(item.teacher_name)
      );
    }

    if (activePaymentSort === "По филиалу") {
      result = result.filter(
        (item) =>
          item.school_name && selectedFilterValues.includes(item.school_name)
      );
    }

    if (activePaymentSort === "По времени") {
      if (selectedFilterValues.includes("new_first")) {
        result.sort(
          (a, b) =>
            new Date(b.payment_date || "").getTime() -
            new Date(a.payment_date || "").getTime()
        );
      }

      if (selectedFilterValues.includes("old_first")) {
        result.sort(
          (a, b) =>
            new Date(a.payment_date || "").getTime() -
            new Date(b.payment_date || "").getTime()
        );
      }
    }

    return result;
  }, [payments, activePaymentSort, selectedFilterValues]);

  const filteredPeriodPayments = useMemo(() => {
    let result = [...periodPayments];

    if (activePaymentSort === null || selectedFilterValues.length === 0) {
      return result;
    }

    if (activePaymentSort === "По студенту") {
      result = result.filter((item) =>
        selectedFilterValues.includes(item.full_name)
      );
    }

    if (activePaymentSort === "По группе") {
      result = result.filter(
        (item) =>
          item.group_name &&
          selectedFilterValues.includes(item.group_name)
      );
    }

    return result;
  }, [periodPayments, activePaymentSort, selectedFilterValues]);

  const filteredRecordBooks = useMemo(() => {
    let result = [...recordBooks];

    if (activePaymentSort === null || selectedFilterValues.length === 0) {
      return result;
    }

    if (activePaymentSort === "По студенту") {
      result = result.filter((item) =>
        selectedFilterValues.includes(item.full_name)
      );
    }

    if (activePaymentSort === "По группе") {
      result = result.filter(
        (item) =>
          item.group_name &&
          selectedFilterValues.includes(item.group_name)
      );
    }

    if (activePaymentSort === "По времени") {
      if (selectedFilterValues.includes("new_first")) {
        result.sort(
          (a, b) =>
            new Date(b.payment_date || "").getTime() -
            new Date(a.payment_date || "").getTime()
        );
      }

      if (selectedFilterValues.includes("old_first")) {
        result.sort(
          (a, b) =>
            new Date(a.payment_date || "").getTime() -
            new Date(b.payment_date || "").getTime()
        );
      }
    }

    return result;
  }, [recordBooks, activePaymentSort, selectedFilterValues]);

  return (
    <section>
      <PaymentsToolbar
        activePaymentTab={activePaymentTab}
        setActivePaymentTab={setActivePaymentTab}
        activePaymentSort={activePaymentSort}
        setActivePaymentSort={setActivePaymentSort}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        payoutMode={payoutMode}
        setPayoutMode={setPayoutMode}
        selectedPaymentMonth={selectedPaymentMonth}
        setSelectedPaymentMonth={setSelectedPaymentMonth}
        selectedPayoutMonth={selectedPayoutMonth}
        setSelectedPayoutMonth={setSelectedPayoutMonth}
        onOpenPaymentModal={handleOpenPaymentModal}
        filterOptions={filterOptions}
        selectedFilterValues={selectedFilterValues}
        setSelectedFilterValues={setSelectedFilterValues}
        user={user}
      />

      {loadingPayments && (
        <p style={{ marginLeft: "10%", marginTop: "12px" }}>Загрузка оплат...</p>
      )}

      {paymentsError && (
        <p style={{ marginLeft: "10%", marginTop: "12px", color: "crimson" }}>
          {paymentsError}
        </p>
      )}

      {!loadingPayments && !paymentsError && (
        <PaymentsTable
          activePaymentTab={activePaymentTab}
          paymentMode={paymentMode}
          payoutMode={payoutMode}
          selectedPaymentMonth={selectedPaymentMonth}
          payments={filteredPayments}
          periodPayments={filteredPeriodPayments}
          recordBooks={filteredRecordBooks}
          onSelectPayment={setSelectedPayment}
          selectedEnrollmentId={selectedPayment?.enrollment_id || null}
          onSelectRecordBook={setSelectedRecordBook}
          selectedRecordBookStudentId={selectedRecordBook?.student_id || null}
          onSelectPeriodPayment={setSelectedPeriodPayment}
          selectedPeriodEnrollmentId={selectedPeriodPayment?.enrollment_id || null}
        />
      )}

      <AddPaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        paymentTarget={selectedPayment}
        selectedPaymentMonth={selectedPaymentMonth}
        selectedPaymentYear={selectedPaymentYear}
        onSubmit={handleSavePayment}
      />

      <RecordBookModal
        isOpen={isRecordBookModalOpen}
        onClose={() => setIsRecordBookModalOpen(false)}
        recordBook={selectedRecordBook}
        onSubmit={handleSaveRecordBook}
      />
    </section>
  );
};