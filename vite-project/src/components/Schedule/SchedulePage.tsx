import { useEffect, useMemo, useState } from "react";
import { ControlsPanel } from "./ControlsPanel";
import { ScheduleGrid } from "./ScheduleGrid";
import { ScheduleGroupsPopover } from "./ScheduleGroupsPopover";
import { AddLessonModal } from "../History/Modal/AddLessonModal";
import { LessonDetailsModal } from "../History/Modal/LessonDetailsModal";
import type { LessonItem } from "../History/HistoryPage";

const API_URL = import.meta.env.VITE_API_URL;

type GroupScheduleItem = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

type GroupItem = {
  id: number;
  group_name: string;
  teacher_id?: number | null;
  teacher_name: string | null;
  school_name: string | null;
  cabinet: string | null;
  schedule_list: GroupScheduleItem[];
};

export type SchedulePopoverGroupItem = {
  id: string;
  group_name: string;
  teacher_name: string | null;
  school_name: string | null;
  cabinet: string | null;
  start_time: string;
  end_time: string;
};

const toInputDate = (date: string | null | undefined) => {
  if (!date) return "";
  return date.slice(0, 10);
};

type SchedulePopoverData = {
  items: SchedulePopoverGroupItem[];
  anchorRect: DOMRect;
  lessonDate: string;
} | null;

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  phone?: string;
  must_change_password: boolean;
  status: string;
};

type SchedulePageProps = {
  user: AuthUser | null;
  token: string | null;
};


export const SchedulePage = ({ user, token }: SchedulePageProps) => {
  const [viewMode, setViewMode] = useState("неделя");

  const today = new Date().toISOString().split("T")[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedLessonDate, setSelectedLessonDate] = useState(today);

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [popoverData, setPopoverData] = useState<SchedulePopoverData>(null);

  const [selectedFilter, setSelectedFilter] = useState("Без сортировки");
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>(
    []
  );

  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [selectedGroupIdForLesson, setSelectedGroupIdForLesson] =
    useState<number | null>(null);

  const [selectedExistingLesson, setSelectedExistingLesson] =
    useState<LessonItem | null>(null);

  const fetchGroups = async () => {
    try {
      const data = await fetchWithAuth(`${API_URL}/groups`);
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка загрузки групп:", error);
      setGroups([]);
    }
  };

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
    if (!token) return;
    fetchGroups();
  }, [token]);

  const filterOptions = useMemo(() => {
    if (selectedFilter === "Филиал") {
      const schools = groups
        .map((group) => group.school_name)
        .filter((school): school is string => Boolean(school));

      return Array.from(new Set(schools)).map((school) => ({
        id: school,
        label: school,
      }));
    }

    if (selectedFilter === "Группа") {
      return groups.map((group) => ({
        id: String(group.id),
        label: group.group_name,
      }));
    }

    if (selectedFilter === "Препод.") {
      const teachers = groups
        .map((group) => group.teacher_name)
        .filter((teacher): teacher is string => Boolean(teacher));

      return Array.from(new Set(teachers)).map((teacher) => ({
        id: teacher,
        label: teacher,
      }));
    }

    return [];
  }, [groups, selectedFilter]);

  const filteredGroups = useMemo(() => {
    if (
      selectedFilter === "Без сортировки" ||
      selectedFilterValues.length === 0
    ) {
      return groups;
    }

    if (selectedFilter === "Филиал") {
      return groups.filter(
        (group) =>
          group.school_name && selectedFilterValues.includes(group.school_name)
      );
    }

    if (selectedFilter === "Группа") {
      return groups.filter((group) =>
        selectedFilterValues.includes(String(group.id))
      );
    }

    if (selectedFilter === "Препод.") {
      return groups.filter(
        (group) =>
          group.teacher_name &&
          selectedFilterValues.includes(group.teacher_name)
      );
    }

    return groups;
  }, [groups, selectedFilter, selectedFilterValues]);

  const handleCloseAddLesson = () => {
    setIsAddLessonOpen(false);
    setSelectedGroupIdForLesson(null);
    setSelectedLessonDate(today);
  };

  const openLessonFromSchedule = async (groupId: number, lessonDate: string) => {
    try {
      if (!token) {
        throw new Error("Нет токена авторизации");
      }

      const data = await fetchWithAuth(`${API_URL}/history/lessons`);
      const lessons: LessonItem[] = Array.isArray(data) ? data : [];

      const existingLesson = lessons.find(
        (lesson) =>
          Number(lesson.group_id) === Number(groupId) &&
          toInputDate(lesson.lesson_date) === lessonDate
      );

      if (existingLesson) {
        setSelectedExistingLesson(existingLesson);
        return;
      }

      if (user?.role === "student" || user?.role === "parent") {
        alert("На эту дату занятие ещё не добавлено");
        return;
      }

      setSelectedGroupIdForLesson(groupId);
      setSelectedLessonDate(lessonDate);
      setIsAddLessonOpen(true);
    } catch (error) {
      console.error("Ошибка при проверке занятия:", error);
      alert("Не удалось открыть занятие");
    }
  };
  return (
    <>
      <ControlsPanel
        user={user}
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
        filterOptions={filterOptions}
        selectedFilterValues={selectedFilterValues}
        setSelectedFilterValues={setSelectedFilterValues}
      />

      <ScheduleGrid
        viewMode={viewMode}
        selectedDate={selectedDate}
        groups={filteredGroups}
        onGroupClick={openLessonFromSchedule}
        onAggregateClick={(items, anchorRect, lessonDate) => {
          setPopoverData({
            items,
            anchorRect,
            lessonDate,
          });
        }}
      />

      <ScheduleGroupsPopover
        data={popoverData}
        onClose={() => setPopoverData(null)}
        onGroupClick={(groupId, lessonDate) => {
          setPopoverData(null);
          openLessonFromSchedule(groupId, lessonDate);
        }}
      />

      {(user?.role === "admin" || user?.role === "teacher") && (
        <AddLessonModal
          isOpen={isAddLessonOpen}
          onClose={handleCloseAddLesson}
          onSuccess={handleCloseAddLesson}
          initialGroupId={selectedGroupIdForLesson}
          initialDate={selectedLessonDate}
          token={token}
        />
      )}

      <LessonDetailsModal
        lesson={selectedExistingLesson}
        onClose={() => setSelectedExistingLesson(null)}
        onSuccess={async () => {
          setSelectedExistingLesson(null);
        }}
        token={token}
        userRole={user?.role}
      />
    </>
  );
};