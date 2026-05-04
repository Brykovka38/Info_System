import { useEffect, useState } from "react";
import "../../style/Modal.css";

type PaymentStatus = "оплачено" | "частично" | "не оплачено";
type PaymentMethod = "наличные" | "безналичные";

type PaymentTarget = {
  enrollment_id: number;
  student_id: number;
  full_name: string;
  group_name: string | null;
  payment_id: number | null;
  payment_date: string | null;
  payment_method: string | null;
  status: PaymentStatus;
  amount: string | number;
  note: string;
};

type AddPaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  paymentTarget: PaymentTarget | null;
  selectedPaymentMonth: string;
  selectedPaymentYear: number;
  onSubmit: (paymentData: {
    enrollment_id: number;
    payment_date: string;
    payment_months: number[];
    payment_year: number;
    monthly_amount: number;
    payment_method: PaymentMethod;
    status: PaymentStatus;
    note: string;
  }) => Promise<void>;
};

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

const monthOptions = [
  { label: "Сентябрь", value: 9 },
  { label: "Октябрь", value: 10 },
  { label: "Ноябрь", value: 11 },
  { label: "Декабрь", value: 12 },
  { label: "Январь", value: 1 },
  { label: "Февраль", value: 2 },
  { label: "Март", value: 3 },
  { label: "Апрель", value: 4 },
  { label: "Май", value: 5 },
];

const getTodayDate = () => new Date().toISOString().split("T")[0];

const toInputDate = (value: string | null | undefined) => {
  if (!value) return getTodayDate();
  return value.slice(0, 10);
};

export const AddPaymentModal = ({
  isOpen,
  onClose,
  paymentTarget,
  selectedPaymentMonth,
  selectedPaymentYear,
  onSubmit,
}: AddPaymentModalProps) => {
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("наличные");
  const [status, setStatus] = useState<PaymentStatus>("оплачено");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [monthlyAmount, setMonthlyAmount] = useState("");

  const toggleMonth = (monthNumber: number) => {
    setSelectedMonths((prev) =>
      prev.includes(monthNumber)
        ? prev.filter((m) => m !== monthNumber)
        : [...prev, monthNumber].sort((a, b) => a - b)
    );
  };

  useEffect(() => {
    if (!isOpen || !paymentTarget) return;

    setPaymentDate(toInputDate(paymentTarget.payment_date));

    setMonthlyAmount(
      paymentTarget.amount && Number(paymentTarget.amount) > 0
        ? String(Number(paymentTarget.amount))
        : ""
    );

    setPaymentMethod(
      paymentTarget.payment_method === "безналичные"
        ? "безналичные"
        : "наличные"
    );

    setStatus(paymentTarget.status || "не оплачено");
    setNote(paymentTarget.note || "");

    setSelectedMonths([monthMap[selectedPaymentMonth]]);
  }, [isOpen, paymentTarget, selectedPaymentMonth]);

  if (!isOpen || !paymentTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericMonthlyAmount = Number(monthlyAmount);

    if (!paymentDate) {
      alert("Укажите дату платежа");
      return;
    }

    if (selectedMonths.length === 0) {
      alert("Выберите хотя бы один месяц");
      return;
    }

    if (Number.isNaN(numericMonthlyAmount) || numericMonthlyAmount < 0) {
      alert("Введите корректную сумму за месяц");
      return;
    }

    try {
      setIsSubmitting(true);

      await onSubmit({
        enrollment_id: paymentTarget.enrollment_id,
        payment_date: paymentDate,
        payment_months: selectedMonths,
        payment_year: selectedPaymentYear,
        monthly_amount: numericMonthlyAmount,
        payment_method: paymentMethod,
        status,
        note: note.trim(),
      });

      onClose();
    } catch (error) {
      console.error("Ошибка при сохранении оплаты:", error);
      alert("Не удалось сохранить оплату");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--sm modal--scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">
            {paymentTarget?.payment_id ? "Изменение оплаты" : "Внесение оплаты"}
          </h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body modal__body--scroll">
            <div className="modal__field">
              <label className="modal__label">Ученик</label>
              <div className="modal__staticValue">{paymentTarget.full_name}</div>
            </div>

            <div className="modal__field">
              <label className="modal__label">Группа</label>
              <div className="modal__staticValue">
                {paymentTarget.group_name || "—"}
              </div>
            </div>

            <div className="modal__field">
              <label className="modal__label">Учебный год</label>
              <div className="modal__staticValue">{selectedPaymentYear}</div>
            </div>

            <div className="modal__field">
              <label className="modal__label">Месяцы оплаты</label>
              <div className="modal__radioRow" style={{ flexWrap: "wrap" }}>
                {monthOptions.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    className={`modal__choice ${
                      selectedMonths.includes(month.value)
                        ? "modal__choice--active"
                        : ""
                    }`}
                    onClick={() => toggleMonth(month.value)}
                  >
                    {month.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal__field">
              <label className="modal__label">Дата платежа</label>
              <input
                type="date"
                className="modal__input"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label className="modal__label">Способ оплаты</label>
              <select
                className="modal__select"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
              >
                <option value="наличные">наличные</option>
                <option value="безналичные">безналичные</option>
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Статус</label>
              <select
                className="modal__select"
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus)}
              >
                <option value="оплачено">оплачено</option>
                <option value="частично">частично</option>
                <option value="не оплачено">не оплачено</option>
              </select>
            </div>

            <div className="modal__field">
              <label className="modal__label">Сумма за месяц</label>
              <input
                type="number"
                min="0"
                step="1"
                className="modal__input"
                placeholder="Например, 5500"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
              />
            </div>

            <div className="modal__field">
              <label className="modal__label">Примечание</label>
              <input
                type="text"
                className="modal__input"
                placeholder="Комментарий к оплате"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="modal__button modal__button--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>

            <button
              type="submit"
              className="modal__button modal__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};