import { useEffect, useState } from "react";
import "../../style/Modal.css";

type PaymentMethod = "наличные" | "безналичные";

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

type RecordBookModalProps = {
  isOpen: boolean;
  onClose: () => void;
  recordBook: RecordBookItem | null;
  onSubmit: (data: {
    student_id: number;
    has_record_book: boolean;
    payment_date: string;
    amount: number;
    payment_method: PaymentMethod;
    note: string;
  }) => Promise<void>;
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

const toInputDate = (value: string | null | undefined) => {
  if (!value) return getTodayDate();
  return value.slice(0, 10);
};

export const RecordBookModal = ({
  isOpen,
  onClose,
  recordBook,
  onSubmit,
}: RecordBookModalProps) => {
  const [hasRecordBook, setHasRecordBook] = useState(false);
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("наличные");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !recordBook) return;

    setHasRecordBook(recordBook.has_record_book);
    setPaymentDate(toInputDate(recordBook.payment_date));
    setAmount(
      recordBook.amount && Number(recordBook.amount) > 0
        ? String(Number(recordBook.amount))
        : ""
    );
    setPaymentMethod(
      recordBook.payment_method === "безналичные"
        ? "безналичные"
        : "наличные"
    );
    setNote(recordBook.note || "");
  }, [isOpen, recordBook]);

  if (!isOpen || !recordBook) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      alert("Введите корректную сумму");
      return;
    }

    try {
      setIsSubmitting(true);

      await onSubmit({
        student_id: recordBook.student_id,
        has_record_book: hasRecordBook,
        payment_date: paymentDate,
        amount: numericAmount,
        payment_method: paymentMethod,
        note: note.trim(),
      });

      onClose();
    } catch (error) {
      console.error("Ошибка при сохранении зачётной книжки:", error);
      alert("Не удалось сохранить данные");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm modal--scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Зачётная книжка</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body modal__body--scroll">
            <div className="modal__field">
              <label className="modal__label">Ученик</label>
              <div className="modal__staticValue">{recordBook.full_name}</div>
            </div>

            <div className="modal__field">
              <label className="modal__label">Группа</label>
              <div className="modal__staticValue">
                {recordBook.group_name || "—"}
              </div>
            </div>

            <div className="modal__field">
              <label className="modal__label">Наличие</label>
              <div className="modal__radioRow">
                <button
                  type="button"
                  className={`modal__choice ${
                    hasRecordBook ? "modal__choice--active" : ""
                  }`}
                  onClick={() => setHasRecordBook(true)}
                >
                  Да
                </button>
                <button
                  type="button"
                  className={`modal__choice ${
                    !hasRecordBook ? "modal__choice--active" : ""
                  }`}
                  onClick={() => setHasRecordBook(false)}
                >
                  Нет
                </button>
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
              <label className="modal__label">Сумма</label>
              <input
                type="number"
                min="0"
                step="1"
                className="modal__input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Например, 500"
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
              <label className="modal__label">Примечание</label>
              <input
                className="modal__input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Комментарий"
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