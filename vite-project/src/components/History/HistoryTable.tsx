import "./HistoryTable.css";
import type { LessonItem, StudentHistoryItem } from "./HistoryPage";

type HistoryTableProps = {
  activeHistoryTab: "группа" | "студент";
  lessons: LessonItem[];
  studentHistory: StudentHistoryItem[];
  selectedLessonId: number | null;
  selectedStudentHistoryId: number | null;
  onLessonClick: (lessonId: number) => void;
  onStudentHistoryClick: (historyId: number, lessonId: number | null) => void;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("ru-RU");
};

const getRecordTypeLabel = (type: StudentHistoryItem["record_type"]) => {
  if (type === "lesson") return "занятие";
  if (type === "makeup") return "отработка";
  return "доп. занятие";
};

const getStatusLabel = (status: StudentHistoryItem["status"]) => {
  if (status === "present") return "присутствовал";
  if (status === "absent_excused") return "уважительная";
  return "неуважительная";
};

const getDurationLabel = (value: StudentHistoryItem["duration_value"]) => {
  if (Number(value) === 1) return "1";
  if (Number(value) === 0.5) return "0.5";
  return "0";
};

const getFormatLabel = (format: StudentHistoryItem["format"]) => {
  if (format === "online") return "онлайн";
  return "очно";
};

export const HistoryTable = ({
  activeHistoryTab,
  lessons,
  studentHistory,
  selectedLessonId,
  selectedStudentHistoryId,
  onLessonClick,
  onStudentHistoryClick,
}: HistoryTableProps) => {
  if (activeHistoryTab === "группа") {
    return (
      <section className="history-table">
        <div className="history-table__header history-table__header--group">
          <div className="history-table__col">Группа</div>
          <div className="history-table__col">Дата</div>
          <div className="history-table__col">Преподаватель</div>
          <div className="history-table__col">Примечание</div>
        </div>

        <div className="history-table__body">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`history-table__row history-table__row--group ${
                selectedLessonId === lesson.id
                  ? "history-table__row--selected"
                  : ""
              }`}
              onClick={() => onLessonClick(lesson.id)}
            >
              <div className="history-table__cell">
                {lesson.school_name}-{lesson.cabinet}
              </div>

              <div className="history-table__cell">
                {formatDate(lesson.lesson_date)}
              </div>

              <div className="history-table__cell">
                {lesson.teacher_name}
              </div>

              <div className="history-table__cell">
                {lesson.note || "—"}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="history-table">
      <div className="history-table__header history-table__header--student">
        <div className="history-table__col">Студент</div>
        <div className="history-table__col">Дата</div>
        <div className="history-table__col">Тип</div>
        <div className="history-table__col">Статус</div>
        <div className="history-table__col">Объём</div>
        <div className="history-table__col">Формат</div>
        <div className="history-table__col">Тема</div>
        <div className="history-table__col">Примечание</div>
      </div>

      <div className="history-table__body">
        {studentHistory.map((item) => (
          <div
            key={item.id}
            className={`history-table__row history-table__row--student ${
              selectedStudentHistoryId === item.id
                ? "history-table__row--selected"
                : ""
            }`}
            onClick={() => onStudentHistoryClick(item.id, item.lesson_id)}
          >
            <div className="history-table__cell">{item.student_name}</div>

            <div className="history-table__cell">
              {formatDate(item.attendance_date)}
            </div>

            <div className="history-table__cell">
              {getRecordTypeLabel(item.record_type)}
            </div>

            <div className="history-table__cell">
              {getStatusLabel(item.status)}
            </div>

            <div className="history-table__cell">
              {getDurationLabel(item.duration_value)}
            </div>

            <div className="history-table__cell">
              {getFormatLabel(item.format)}
            </div>

            <div className="history-table__cell">
              {item.topic || "—"}
            </div>

            <div className="history-table__cell">
              {item.note || "—"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};