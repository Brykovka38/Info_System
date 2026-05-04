import "../style/Table.css";

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

export type PaymentItem = {
  enrollment_id: number;
  student_id: number;
  full_name: string;
  group_id: number | null;
  group_name: string | null;
  school_name: string | null;
  teacher_name: string | null;
  payment_id: number | null;
  payment_date: string | null;
  payment_method: string | null;
  status: "оплачено" | "частично" | "не оплачено";
  amount: string | number;
  note: string;
  has_benefit: boolean;
  record_book_id: number | null;
};

type PaymentsTableProps = {
  activePaymentTab: string | null;
  paymentMode: PaymentMode;
  payoutMode: PayoutMode;
  selectedPaymentMonth: string;
  payments: PaymentItem[];
  onSelectPayment?: (payment: PaymentItem) => void;
  selectedEnrollmentId?: number | null;
  periodPayments: PeriodPaymentItem[];
  recordBooks: RecordBookItem[];
  selectedRecordBookStudentId?: number | null;
  onSelectRecordBook?: (item: RecordBookItem) => void;
  onSelectPeriodPayment?: (payment: PeriodPaymentItem) => void;
  selectedPeriodEnrollmentId?: number | null;
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

export const PaymentsTable = ({
  activePaymentTab,
  paymentMode,
  payoutMode,
  selectedPaymentMonth,
  payments,
  onSelectPayment,
  selectedEnrollmentId,
  periodPayments,
  recordBooks,
  selectedRecordBookStudentId,
  onSelectRecordBook,
  onSelectPeriodPayment,
  selectedPeriodEnrollmentId,
}: PaymentsTableProps) => {
  if (activePaymentTab === "оплата" && paymentMode === "month") {
    return (
      <div className="app-table-wrapper">
        <table className="app-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Льгота</th>
              <th>Дата платежа</th>
              <th>Способ оплаты</th>
              <th>{selectedPaymentMonth}</th>
              <th>Сумма</th>
              <th>Примечание</th>
            </tr>
          </thead>

          <tbody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <tr
                  key={payment.enrollment_id}
                  className={
                    selectedEnrollmentId === payment.enrollment_id
                      ? "row--selected"
                      : ""
                  }
                  onClick={() => onSelectPayment?.(payment)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="users-table__person">
                      <span className="users-table__personName">
                        {payment.full_name}
                      </span>
                      {payment.group_name && (
                        <span className="users-table__personDate">
                          {payment.group_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{payment.has_benefit ? "Да" : "Нет"}</td>

                  <td>{formatDate(payment.payment_date)}</td>

                  <td>{payment.payment_method || "—"}</td>
                  
                  <td>
                    <span
                      className={`payment-status ${getPaymentStatusClass(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </td>

                  <td>{formatAmount(payment.amount)}</td>

                  <td>{payment.note || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activePaymentTab === "оплата" && paymentMode === "period") {
    return (
      <div className="app-table-wrapper">
        <table className="app-table">
          <thead>
            <tr>
              <th>ФИО</th>
              {studyMonths.map((month) => (
                <th key={month}>{month}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodPayments.length > 0 ? (
              periodPayments.map((payment) => (
                <tr 
                  key={payment.enrollment_id}
                  className={
                    selectedPeriodEnrollmentId === payment.enrollment_id ? "row--selected" : ""
                  }
                  onClick={() => onSelectPeriodPayment?.(payment)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="users-table__person">
                      <div className="users-table__personName">
                        {payment.full_name}
                      </div>

                      {payment.group_name && (
                        <div className="users-table__personDate">
                          {payment.group_name}
                        </div>
                      )}
                    </div>
                  </td>

                  <td>{renderPeriodCell(payment.months[9])}</td>
                  <td>{renderPeriodCell(payment.months[10])}</td>
                  <td>{renderPeriodCell(payment.months[11])}</td>
                  <td>{renderPeriodCell(payment.months[12])}</td>
                  <td>{renderPeriodCell(payment.months[1])}</td>
                  <td>{renderPeriodCell(payment.months[2])}</td>
                  <td>{renderPeriodCell(payment.months[3])}</td>
                  <td>{renderPeriodCell(payment.months[4])}</td>
                  <td>{renderPeriodCell(payment.months[5])}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activePaymentTab === "оплата" && paymentMode === "recordBook") {
    return (
      <div className="app-table-wrapper">
        <table className="app-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Наличие</th>
              <th>Сумма</th>
              <th>Способ оплаты</th>
              <th>Дата платежа</th>
              <th>Примечание</th>
            </tr>
          </thead>

          <tbody>
            {recordBooks.length > 0 ? (
              recordBooks.map((item) => (
                <tr 
                  key={item.student_id}
                  className={
                    selectedRecordBookStudentId === item.student_id ? "row--selected" : ""
                  }
                  onClick={() => onSelectRecordBook?.(item)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div className="users-table__person">
                      <div className="users-table__personName">
                        {item.full_name}
                      </div>

                      {item.group_name && (
                        <div className="users-table__personDate">
                          {item.group_name}
                        </div>
                      )}
                    </div>
                  </td>

                  <td>{item.has_record_book ? "Да" : "Нет"}</td>
                  <td>{formatAmount(item.amount)}</td>
                  <td>{item.payment_method || "—"}</td>
                  <td>{formatDate(item.payment_date)}</td>
                  <td>{item.note || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  if (activePaymentTab === "выплаты" && payoutMode === "month") {
    return (
      <div className="app-table-wrapper">
        <table className="app-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Прогнозируемая з/п</th>
              <th>Реальная з/п</th>
              <th>Выплата</th>
              <th>Доп. расходы</th>
              <th>Примечание</th>
            </tr>
          </thead>
          <tbody />
        </table>
      </div>
    );
  }

  if (activePaymentTab === "выплаты" && payoutMode === "period") {
    return (
      <div className="app-table-wrapper">
        <table className="app-table">
          <thead>
            <tr>
              <th>ФИО</th>
              {studyMonths.map((month) => (
                <th key={month}>{month}</th>
              ))}
            </tr>
          </thead>
          <tbody />
        </table>
      </div>
    );
  }

  return null;
};

const renderPeriodCell = (
    cell:
      | {
          status: "оплачено" | "частично" | "не оплачено";
          amount: string | number;
        }
      | null
  ) => {
    if (!cell) return "—";

    return (
      <div className="payments-period-cell">
        <span className={`payment-status ${getPaymentStatusClass(cell.status)}`}>
          {cell.status}
        </span>
        <div className="payments-period-cell__amount">
          {formatAmount(cell.amount)}
        </div>
      </div>
    );
};

const formatDate = (date: string | null) => {
  if (!date) return "—";

  const d = new Date(date);

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
};

const getPaymentStatusClass = (status: PaymentItem["status"]) => {
  if (status === "оплачено") return "payment-status--paid";
  if (status === "частично") return "payment-status--partial";
  return "payment-status--unpaid";
};

const formatAmount = (amount: string | number) => {
  const numericAmount = Number(amount);

  if (!numericAmount) return "—";

  return `${numericAmount.toLocaleString("ru-RU")} ₽`;
};