import { useEffect, useMemo, useState } from "react";
import { HistoryToolbar } from "./HistoryToolbar";
import { HistoryTable } from "./HistoryTable";
import { AddLessonModal } from "./Modal/AddLessonModal";
import { AddStudentEventModal } from "./Modal/AddStudentEventModal";
import { EditStudentEventModal } from "./Modal/EditStudentEventModal";
import { LessonDetailsModal } from "./Modal/LessonDetailsModal";

const API_URL = import.meta.env.VITE_API_URL;

type HistoryTab = "группа" | "студент";

export type LessonItem = {
  id: number;
  group_id: number;
  teacher_id: number;
  lesson_date: string;
  note: string | null;
  cabinet: string;
  school_name: string;
  teacher_name: string;
};

export type StudentHistoryItem = {
  id: number;
  lesson_id: number | null;
  enrollment_id: number;
  student_id: number;
  attendance_date: string;
  record_type: "lesson" | "makeup" | "additional";
  status: "present" | "absent_excused" | "absent_unexcused";
  duration_value: 0 | 0.5 | 1;
  format: "offline" | "online";
  topic: string | null;
  note: string | null;
  student_name: string;
  course_code: string | null;
  school_name: string;
  cabinet: string;
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

type HistoryPageProps = {
  user: AuthUser | null;
  token: string | null;
};

export const HistoryPage = ({ user, token }: HistoryPageProps) => {
  const [activeHistoryTab, setActiveHistoryTab] = useState<HistoryTab>("группа");
  const [activeHistorySort, setActiveHistorySort] = useState<string | null>(null);
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]);

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [studentHistory, setStudentHistory] = useState<StudentHistoryItem[]>([]);

  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [isAddStudentEventOpen, setIsAddStudentEventOpen] = useState(false);

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedStudentHistoryId, setSelectedStudentHistoryId] =
    useState<number | null>(null);

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) || null;
  const selectedStudentEvent = studentHistory.find((item) => item.id === selectedStudentHistoryId) || null;

  // const isParent = user?.role === "parent";
  // const isStudent = user?.role === "student";
  const canEditHistory = user?.role === "admin" || user?.role === "teacher";


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

  const fetchLessons = async () => {
    try {
      const data = await fetchWithAuth(`${API_URL}/history/lessons`);
      setLessons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при получении истории занятий:", error);
    }
  };

  const fetchStudentHistory = async () => {
    try {
      const data = await fetchWithAuth(`${API_URL}/history/students`);
      setStudentHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при получении истории студентов:", error);
    }
  };

  const refreshHistory = async () => {
    await fetchLessons();
    await fetchStudentHistory();
  };

  useEffect(() => {
    if (!token) return;
    refreshHistory();
  }, [token]);

  useEffect(() => {
    if (user?.role === "student") {
      setActiveHistoryTab("студент");
      setActiveHistorySort(null);
      setSelectedFilterValues([]);
    }
  }, [user?.role]);

  const filterOptions = useMemo(() => {
    if (activeHistorySort === "По препод.") {
      const teachers = lessons
        .map((lesson) => lesson.teacher_name)
        .filter((teacher): teacher is string => Boolean(teacher));

      return Array.from(new Set(teachers)).map((teacher) => ({
        id: teacher,
        label: teacher,
      }));
    }

    if (activeHistorySort === "По студенту") {
      const students = studentHistory
        .map((item) => item.student_name)
        .filter((student): student is string => Boolean(student));

      return Array.from(new Set(students)).map((student) => ({
        id: student,
        label: student,
      }));
    }

    if (activeHistorySort === "По филиалу") {
      const schools =
        activeHistoryTab === "группа"
          ? lessons
              .map((lesson) => lesson.school_name)
              .filter((school): school is string => Boolean(school))
          : studentHistory
              .map((item) => item.school_name)
              .filter((school): school is string => Boolean(school));

      return Array.from(new Set(schools)).map((school) => ({
        id: school,
        label: school,
      }));
    }

    if (activeHistorySort === "По времени") {
      return [
        {
          id: "new_first",
          label: "Сначала новые",
        },
        {
          id: "old_first",
          label: "Сначала старые",
        },
      ];
    }

    return [];
  }, [activeHistorySort, activeHistoryTab, lessons, studentHistory]);

  const filteredLessons = useMemo(() => {
    let result = [...lessons];

    if (activeHistorySort === null || selectedFilterValues.length === 0) {
      return result;
    }

    if (activeHistorySort === "По препод.") {
      result = result.filter((lesson) =>
        selectedFilterValues.includes(lesson.teacher_name)
      );
    }

    if (activeHistorySort === "По филиалу") {
      result = result.filter((lesson) =>
        selectedFilterValues.includes(lesson.school_name)
      );
    }

    if (activeHistorySort === "По времени") {
      if (selectedFilterValues.includes("new_first")) {
        result.sort(
          (a, b) =>
            new Date(b.lesson_date).getTime() -
            new Date(a.lesson_date).getTime()
        );
      }

      if (selectedFilterValues.includes("old_first")) {
        result.sort(
          (a, b) =>
            new Date(a.lesson_date).getTime() -
            new Date(b.lesson_date).getTime()
        );
      }
    }

    return result;
  }, [lessons, activeHistorySort, selectedFilterValues]);

  const filteredStudentHistory = useMemo(() => {
    let result = [...studentHistory];

    if (activeHistorySort === null || selectedFilterValues.length === 0) {
      return result;
    }

    if (activeHistorySort === "По препод.") {
      const teacherLessonIds = lessons
        .filter((lesson) => selectedFilterValues.includes(lesson.teacher_name))
        .map((lesson) => lesson.id);

      result = result.filter(
        (item) => item.lesson_id !== null && teacherLessonIds.includes(item.lesson_id)
      );
    }

    if (activeHistorySort === "По студенту") {
      result = result.filter((item) =>
        selectedFilterValues.includes(item.student_name)
      );
    }

    if (activeHistorySort === "По филиалу") {
      result = result.filter((item) =>
        selectedFilterValues.includes(item.school_name)
      );
    }

    if (activeHistorySort === "По времени") {
      if (selectedFilterValues.includes("new_first")) {
        result.sort(
          (a, b) =>
            new Date(b.attendance_date).getTime() -
            new Date(a.attendance_date).getTime()
        );
      }

      if (selectedFilterValues.includes("old_first")) {
        result.sort(
          (a, b) =>
            new Date(a.attendance_date).getTime() -
            new Date(b.attendance_date).getTime()
        );
      }
    }

    return result;
  }, [studentHistory, lessons, activeHistorySort, selectedFilterValues]);

  return (
    <div>
      <HistoryToolbar
        user={user}
        activeHistoryTab={activeHistoryTab}
        setActiveHistoryTab={setActiveHistoryTab}
        activeHistorySort={activeHistorySort}
        setActiveHistorySort={setActiveHistorySort}
        filterOptions={filterOptions}
        selectedFilterValues={selectedFilterValues}
        setSelectedFilterValues={setSelectedFilterValues}
        onAddLesson={() => {
          if (!canEditHistory) return;
          setIsAddLessonOpen(true);
        }}
        onAddStudentAttendance={() => {
          if (!canEditHistory) return;
          setIsAddStudentEventOpen(true);
        }}
      />

      <HistoryTable
        activeHistoryTab={activeHistoryTab}
        lessons={filteredLessons}
        studentHistory={filteredStudentHistory}
        selectedLessonId={selectedLessonId}
        selectedStudentHistoryId={selectedStudentHistoryId}
        onLessonClick={(lessonId) => {
          setSelectedLessonId(lessonId);
          setSelectedStudentHistoryId(null);
        }}
        onStudentHistoryClick={(historyId) => {
          if (!canEditHistory) {
            return;
          }

          setSelectedStudentHistoryId(historyId);
          setSelectedLessonId(null);
        }}
      />

      {canEditHistory && (
        <>
          <AddLessonModal
            isOpen={isAddLessonOpen}
            onClose={() => setIsAddLessonOpen(false)}
            onSuccess={refreshHistory}
            token={token}
          />

          <AddStudentEventModal
            isOpen={isAddStudentEventOpen}
            onClose={() => setIsAddStudentEventOpen(false)}
            onSuccess={refreshHistory}
            token={token}
          />

          <EditStudentEventModal
            event={selectedStudentEvent}
            onClose={() => setSelectedStudentHistoryId(null)}
            onSuccess={refreshHistory}
            token={token}
          />
        </>
      )}

      <LessonDetailsModal
        lesson={selectedLesson}
        onClose={() => {
          setSelectedLessonId(null);
          setSelectedStudentHistoryId(null);
        }}
        onSuccess={refreshHistory}
        token={token}
        userRole={user?.role}
      />
    </div>
  );
};