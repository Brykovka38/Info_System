import { useEffect, useMemo, useState, useRef } from "react";
import { UsersToolbar } from "./UsersToolbar";
import { UsersTable } from "./UsersTable";
import { AddTeacherModal } from "./Modal/AddTeacherModal";
import { AddStudentModal } from "./Modal/AddStudentModal";
import { AddSchoolModal } from "./Modal/AddSchoolModal";
import { AddParentModal } from "./Modal/AddParentModal";
import { AddGroupModal } from "./Modal/AddGroupModal";
import { EditTeacherModal } from "./Modal/EditTeacherModal";
import { EditStudentModal } from "./Modal/EditStudentModal";
import { EditParentModal } from "./Modal/EditParentModal";
import { EditGroupModal } from "./Modal/EditGroupModal";
import { CredentialsModal } from "../common/CredentialsModal";
import { EditSchoolModal } from "./Modal/EditSchoolModal";

const API_URL = import.meta.env.VITE_API_URL;

function sortByAlphabet<T>(
  items: T[],
  getValue: (item: T) => string | null | undefined
) {
  return [...items].sort((a, b) =>
    String(getValue(a) ?? "").localeCompare(String(getValue(b) ?? ""), "ru", {
      sensitivity: "base",
      numeric: true,
    })
  );
}

type AuthUser = {
  id: number;
  login: string;
  full_name: string;
  role: string;
  must_change_password: boolean;
  status: string;
  phone?: string;
};

type UsersPageProps = {
  user: AuthUser | null;
  token: string | null;
};

export const UsersPage = ({ user, token }: UsersPageProps) => {
  const [createdCredentials, setCreatedCredentials] = useState<{
    full_name?: string;
    role?: string;
    login: string;
    temporary_password: string;
  } | null>(null);

  const [activeRole, setActiveRole] = useState<string | null>(
    user?.role === "teacher" || user?.role === "parent" || user?.role === "student"? "студенты" : null);
  const [activeSort, setActiveSort] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]);

  useEffect(() => {
    if (
      (user?.role === "teacher" ||
        user?.role === "parent" ||
        user?.role === "student") &&
      !activeRole
    ) {
      setActiveRole("студенты");
    }
  }, [user, activeRole]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tableRef.current &&
        !tableRef.current.contains(event.target as Node)
      ) {
        setSelectedId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setSelectedId(null);
    setActiveSort(null);
    setSelectedFilterValues([]);
  }, [activeRole]);

  useEffect(() => {
    setSelectedId(null);
    setSelectedFilterValues([]);
  }, [activeSort]);


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
      throw new Error(data.error || data.message || "Ошибка запроса");
    }

    return data;
  };

  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [isAddParentOpen, setIsAddParentOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);

  const [isEditTeacherOpen, setIsEditTeacherOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [isEditParentOpen, setIsEditParentOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<any | null>(null);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [isEditSchoolOpen, setIsEditSchoolOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [allSchoolsForStudentEdit, setAllSchoolsForStudentEdit] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [freeStudents, setFreeStudents] = useState<any[]>([]);
  const [freeStudentsForGroup, setFreeStudentsForGroup] = useState<any[]>([]);
  const [myGroupStudents, setMyGroupStudents] = useState<any[]>([]);

  const loadTeachers = async () => {
    const data = await fetchWithAuth(`${API_URL}/teachers`);
    setTeachers(Array.isArray(data) ? data : []);
  };

  const loadStudents = async () => {
    const data = await fetchWithAuth(`${API_URL}/students`);
    setStudents(Array.isArray(data) ? data : []);
  };

  const loadParents = async () => {
    const data = await fetchWithAuth(`${API_URL}/parents`);
    setParents(Array.isArray(data) ? data : []);
  };

  const loadGroups = async () => {
    const data = await fetchWithAuth(`${API_URL}/groups`);
    setGroups(Array.isArray(data) ? data : []);
  };

  const loadSchools = async () => {
    const data = await fetchWithAuth(`${API_URL}/schools`);
    setSchools(Array.isArray(data) ? data : []);
  };

  const loadAllSchoolsForStudentEdit = async () => {
    const data = await fetchWithAuth(`${API_URL}/schools/for-student-edit`);
    setAllSchoolsForStudentEdit(Array.isArray(data) ? data : []);
  };

  const loadCourses = async () => {
    const data = await fetchWithAuth(`${API_URL}/courses`);
    setCourses(Array.isArray(data) ? data : []);
  };

  const loadFreeStudents = async () => {
    const data = await fetchWithAuth(`${API_URL}/students/free`);
    setFreeStudents(Array.isArray(data) ? data : []);
  };

  const loadFreeStudentsForGroup = async () => {
    const data = await fetchWithAuth(`${API_URL}/students/free-for-group`);
    setFreeStudentsForGroup(Array.isArray(data) ? data : []);
  };

  const loadMyGroupStudents = async () => {
    const data = await fetchWithAuth(`${API_URL}/students/my-group`);
    setMyGroupStudents(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!token) return;

    const loadAllData = async () => {
      const requests: Promise<any>[] = [loadStudents(),];

      if (user?.role !== "student") {
        requests.push(loadGroups(), loadSchools());
      }

      if (user?.role === "admin") {
        requests.push(
          loadTeachers(),
          loadParents(),
          loadAllSchoolsForStudentEdit(),
          loadCourses(),
          loadFreeStudents()
        );
      }

      if (user?.role === "teacher") {
        requests.push(
          loadParents(),
          loadAllSchoolsForStudentEdit(),
          loadCourses(),
          loadFreeStudents()
        );
      }

      if (user?.role === "parent" || user?.role === "student") {
        requests.push(loadTeachers());
      }

      if (user?.role === "student") {
        requests.push(loadMyGroupStudents());
      }

      const results = await Promise.allSettled(requests);

      results.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Ошибка загрузки данных:", result.reason);
        }
      });
    };

    loadAllData();
  }, [token, user?.role]);

  const handleDelete = async () => {
    if (user?.role !== "admin") {
      alert("Недостаточно прав");
      return;
    }

    if (!activeRole || selectedId === null) {
        alert("Выберите запись");
        return;
    }

    if (!confirm("Удалить запись?")) return;


    try {
        let url = "";
        if (activeRole === "преподаватели") 
            url = `${API_URL}/teachers/${selectedId}`;
        if (activeRole === "студенты") 
            url = `${API_URL}/students/${selectedId}`;
        if (activeRole === "родители") 
            url = `${API_URL}/parents/${selectedId}`;
        if (activeRole === "группы")
          url = `${API_URL}/groups/${selectedId}`;
        if (activeRole === "школы")
          url = `${API_URL}/schools/${selectedId}`;

        await fetchWithAuth(url, {
          method: "DELETE",
        });

        if (activeRole === "преподаватели") 
            setTeachers((prev) => prev.filter((t) => t.id !== selectedId));
        if (activeRole === "студенты") 
            setStudents((prev) => prev.filter((s) => s.id !== selectedId));
        if (activeRole === "родители") 
            setParents((prev) => prev.filter((p) => p.id !== selectedId));
        if (activeRole === "группы")
          setGroups((prev) => prev.filter((g) => g.id !== selectedId));
        if (activeRole === "школы")
          setSchools((prev) => prev.filter((s) => s.id !== selectedId));

        setSelectedId(null);

    } catch (error: any) {
      alert(error.message); 
    }
    };


  const handleAdd = async () => {
    if (user?.role !== "admin") {
      alert("Недостаточно прав");
      return;
    }

    if (activeRole === "преподаватели") {
      setIsAddTeacherOpen(true);
      return;
    }
    if (activeRole === "студенты") {
      setIsAddStudentOpen(true);
      return;
    }
    if (activeRole === "родители") {
      await loadFreeStudents();
      setIsAddParentOpen(true);
      return;
    }
    if (activeRole === "группы") {
      await loadFreeStudentsForGroup();
      setIsAddGroupOpen(true);
      return;
    }
    if (activeRole === "школы") {
      setIsAddSchoolOpen(true);
      return;
    }
  };

  const handleCreateTeacher = async (teacherData: {
    full_name: string;
    phone: string;
    groupIds: number[];
    work_start_date: string;
  }) => {
    const data = await fetchWithAuth(`${API_URL}/teachers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: teacherData.full_name,
        phone: teacherData.phone,
        status: "active",
        groupIds: teacherData.groupIds,
        work_start_date: teacherData.work_start_date,
      }),
    });

    await loadTeachers();
    await loadGroups();

    setIsAddTeacherOpen(false);
    setCreatedCredentials(data.credentials || null);
  };

  const handleCreateStudent = async (studentData: {
    full_name: string;
    phone: string;
    class_name: string;
    school_id: number | null;
    course_id: number | null;
    group_id: number | null;
    parent_id: number | null;
    relation_type: string | null;
  }) => {
    const data = await fetchWithAuth(`${API_URL}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentData),
    });

    await loadStudents();
    await loadGroups();
    await loadFreeStudents();
    await loadFreeStudentsForGroup();

    setIsAddStudentOpen(false);
    setCreatedCredentials(data.credentials || null);
  };

  const handleCreateSchool = async (schoolData: {
    name: string;
    full_name: string;
    address: string;
  }) => {
    await fetchWithAuth(`${API_URL}/schools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(schoolData),
    });

    await loadSchools();
    await loadAllSchoolsForStudentEdit();

    setIsAddSchoolOpen(false);
  };

  const handleCreateParent = async (parentData: {
    full_name: string;
    phone: string;
    links: { student_id: number; relation_type: string }[];
  }) => {
    const data = await fetchWithAuth(`${API_URL}/parents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parentData),
    });

    await loadParents();
    await loadFreeStudents();

    setIsAddParentOpen(false);
    setCreatedCredentials(data.credentials || null);
  };

  const handleCreateGroup = async (groupData: {
    school_id: number;
    cabinet: string;
    teacher_id: number | null;
    schedule: {
      day_of_week: string;
      start_time: string;
      end_time: string;
    }[];
    student_ids: number[];
  }) => {
    await fetchWithAuth(`${API_URL}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groupData),
    });

    await loadGroups();
    await loadStudents();

    setIsAddGroupOpen(false);
  };

  const handleEdit = async () => {
    if (!activeRole || selectedId === null) {
      alert("Выберите запись");
      return;
    }
    if (user?.role === "teacher" && activeRole !== "студенты" && activeRole !== "родители") {
      alert("Преподаватель может редактировать только учеников и родителей");
      return;
    }

    if (user?.role !== "admin" && user?.role !== "teacher") {
      alert("Недостаточно прав");
      return;
    }
    if (activeRole === "преподаватели") {
      const teacher = teachers.find((t) => t.id === selectedId);
      if (!teacher) {
        alert("Преподаватель не найден");
        return;
      }
      setEditingTeacher(teacher);
      setIsEditTeacherOpen(true);
      return;
    }
    if (activeRole === "студенты") {
      const student = students.find((s) => s.id === selectedId);
      if (!student) {
        alert("Студент не найден");
        return;
      }
      setEditingStudent(student);
      setIsEditStudentOpen(true);
      return;
    }
    if (activeRole === "родители") {
      const parent = parents.find((p) => p.id === selectedId);
      if (!parent) {
        alert("Родитель не найден");
        return;
      }
      setEditingParent(parent);
      setIsEditParentOpen(true);
      return;
    }
    if (activeRole === "группы") {
      const group = groups.find((g) => g.id === selectedId);
      if (!group) {
        alert("Группа не найдена");
        return;
      }
      await loadFreeStudentsForGroup();
      setEditingGroup(group);
      setIsEditGroupOpen(true);
      return;
    }
    if (activeRole === "школы") {
      const school = schools.find((s) => s.id === selectedId);
      if (!school) {
        alert("Школа не найдена");
        return;
      }

      setEditingSchool(school);
      setIsEditSchoolOpen(true);
      return;
    }
  };

  const handleUpdateTeacher = async (teacherData: {
    full_name: string;
    phone: string;
    status: string;
    groupIds: number[];
  }) => {
    if (!editingTeacher) return;

    await fetchWithAuth(`${API_URL}/teachers/${editingTeacher.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(teacherData),
    });

    await loadTeachers();
    await loadGroups();

    setIsEditTeacherOpen(false);
    setEditingTeacher(null);
  };

  const handleUpdateSchool = async (schoolData: {
    name: string;
    full_name: string;
    address: string;
  }) => {
    if (!editingSchool) return;

    await fetchWithAuth(`${API_URL}/schools/${editingSchool.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(schoolData),
    });

    await loadSchools();
    await loadAllSchoolsForStudentEdit();
    await loadGroups();
    await loadStudents();

    setIsEditSchoolOpen(false);
    setEditingSchool(null);
    setSelectedId(null);
  };

  const handleUpdateStudent = async (studentData: {
    full_name: string;
    phone: string;
    status: string;
    class_name: string;
    school_id: number | null;
    group_id?: number | null;
    course_id?: number | null;
  }) => {
    if (!editingStudent) return;

    await fetchWithAuth(`${API_URL}/students/${editingStudent.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentData),
    });

    await loadStudents();
    await loadGroups();
    await loadFreeStudents();
    await loadFreeStudentsForGroup();

    setIsEditStudentOpen(false);
    setEditingStudent(null);
    setSelectedId(null);
  };

  const handleAddParentToStudent = async (
    parentId: number,
    relationType: string
  ) => {
    if (!editingStudent) return;

    await fetchWithAuth(`${API_URL}/students/${editingStudent.id}/parents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent_id: parentId,
        relation_type: relationType,
      }),
    });

    await loadStudents();

    const updatedStudents = await fetchWithAuth(`${API_URL}/students`);
    setStudents(Array.isArray(updatedStudents) ? updatedStudents : []);

    const updatedStudent = updatedStudents.find(
      (s: any) => s.id === editingStudent.id
    );

    setEditingStudent(updatedStudent || null);
  };

  const handleRemoveParentFromStudent = async (parentId: number) => {
    if (!editingStudent) return;

    await fetchWithAuth(
      `${API_URL}/students/${editingStudent.id}/parents/${parentId}`,
      {
        method: "DELETE",
      }
    );

    await loadStudents();

    const updatedStudents = await fetchWithAuth(`${API_URL}/students`);
    setStudents(Array.isArray(updatedStudents) ? updatedStudents : []);

    const updatedStudent = updatedStudents.find(
      (s: any) => s.id === editingStudent.id
    );

    setEditingStudent(updatedStudent || null);
  };

  const handleUpdateParent = async (parentData: {
    full_name: string;
    phone: string;
    status: string;
  }) => {
    if (!editingParent) return;

    await fetchWithAuth(`${API_URL}/parents/${editingParent.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parentData),
    });

    await loadParents();

    setIsEditParentOpen(false);
    setEditingParent(null);
    setSelectedId(null);
  };

  const handleUpdateParentChildLink = async (
    studentId: number,
    relationType: string,
    benefit: boolean
  ) => {
    if (!editingParent) return;

    await fetchWithAuth(
      `${API_URL}/parents/${editingParent.id}/students/${studentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          relation_type: relationType,
          benefit,
        }),
      }
    );

    await loadParents();

    const updatedParents = await fetchWithAuth(`${API_URL}/parents`);
    setParents(Array.isArray(updatedParents) ? updatedParents : []);

    const updatedParent = updatedParents.find(
      (p: any) => p.id === editingParent.id
    );

    setEditingParent(updatedParent || null);
  };

  const handleRemoveStudentFromParent = async (studentId: number) => {
    if (!editingParent) return;

    await fetchWithAuth(
      `${API_URL}/parents/${editingParent.id}/students/${studentId}`,
      {
        method: "DELETE",
      }
    );

    await loadParents();
    await loadFreeStudents();

    const updatedParents = await fetchWithAuth(`${API_URL}/parents`);
    setParents(Array.isArray(updatedParents) ? updatedParents : []);

    const updatedParent = updatedParents.find(
      (p: any) => p.id === editingParent.id
    );

    setEditingParent(updatedParent || null);
  };

  const handleAddStudentToParent = async (
    studentId: number,
    relationType: string
  ) => {
    if (!editingParent) return;

    await fetchWithAuth(`${API_URL}/parents/${editingParent.id}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: studentId,
        relation_type: relationType,
      }),
    });

    await loadParents();
    await loadFreeStudents();

    const updatedParents = await fetchWithAuth(`${API_URL}/parents`);
    setParents(Array.isArray(updatedParents) ? updatedParents : []);

    const updatedParent = updatedParents.find(
      (p: any) => p.id === editingParent.id
    );

    setEditingParent(updatedParent || null);
  };

  const handleUpdateGroup = async (groupData: {
    school_id: number;
    cabinet: string;
    teacher_id: number | null;
    schedule: {
      day_of_week: string;
      start_time: string;
      end_time: string;
    }[];
  }) => {
    if (!editingGroup) return;

    await fetchWithAuth(`${API_URL}/groups/${editingGroup.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groupData),
    });

    await loadGroups();

    setIsEditGroupOpen(false);
    setEditingGroup(null);
    setSelectedId(null);
  };

  const handleRemoveStudentFromGroup = async (studentId: number) => {
    if (!editingGroup) return;

    await fetchWithAuth(
      `${API_URL}/groups/${editingGroup.id}/students/${studentId}`,
      {
        method: "DELETE",
      }
    );

    await loadGroups();
    await loadStudents();
    await loadFreeStudentsForGroup();

    const updatedGroups = await fetchWithAuth(`${API_URL}/groups`);
    setGroups(Array.isArray(updatedGroups) ? updatedGroups : []);

    const updatedGroup = updatedGroups.find(
      (g: any) => g.id === editingGroup.id
    );

    setEditingGroup(updatedGroup || null);
  };

  const handleAddStudentToGroup = async (
    studentId: number,
    courseId: number
  ) => {
    if (!editingGroup) return;

    await fetchWithAuth(`${API_URL}/groups/${editingGroup.id}/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        student_id: studentId,
        course_id: courseId,
      }),
    });

    await loadGroups();
    await loadStudents();
    await loadFreeStudentsForGroup();

    const updatedGroups = await fetchWithAuth(`${API_URL}/groups`);
    setGroups(Array.isArray(updatedGroups) ? updatedGroups : []);

    const updatedGroup = updatedGroups.find(
      (g: any) => g.id === editingGroup.id
    );

    setEditingGroup(updatedGroup || null);
  };

  const addTeacherGroups = groups
    .filter((group) => !group.teacher_name || group.teacher_name === "—")
    .map((group) => ({
      id: Number(group.id),
      group_name: group.group_name || `${group.school_name}-${group.cabinet}`,
      schedule_list: Array.isArray(group.schedule_list) ? group.schedule_list : [],
    }));

  const filterOptions = useMemo(() => {
    if (!activeRole || !activeSort) return [];

    if (activeSort === "По преподавателю") {
      const values =
        activeRole === "студенты"
          ? students.map((item) => item.teacher_name)
          : activeRole === "группы"
          ? groups.map((item) => item.teacher_name)
          : [];

      return Array.from(new Set(values.filter(Boolean))).map((value) => ({
        id: value,
        label: value,
      }));
    }

    if (activeSort === "По студенту") {
      const values =
        activeRole === "родители"
          ? parents.flatMap((parent) =>
              parent.children_groups_list?.map((item: any) => item.student_name) || []
            )
          : activeRole === "группы"
          ? groups.flatMap((group) =>
              group.students_list?.map((student: any) => student.full_name) || []
            )
          : [];

      return Array.from(new Set(values.filter(Boolean))).map((value) => ({
        id: value,
        label: value,
      }));
    }

    if (activeSort === "По группе") {
      const values =
        activeRole === "преподаватели"
          ? teachers.flatMap((teacher) =>
              String(teacher.group_names || "")
                .split(",")
                .map((group) => group.trim())
            )
          : activeRole === "студенты"
          ? students.map((item) => item.group_name)
          : activeRole === "родители"
          ? parents.flatMap((parent) =>
              parent.children_groups_list?.map((item: any) => item.group_name) || []
            )
          : [];

      return Array.from(new Set(values.filter(Boolean))).map((value) => ({
        id: value,
        label: value,
      }));
    }

    if (activeSort === "По филиалу") {
      const values =
        activeRole === "студенты"
          ? students.map((item) => item.school_name)
          : activeRole === "группы"
          ? groups.map((item) => item.school_name)
          : [];

      return Array.from(new Set(values.filter(Boolean))).map((value) => ({
        id: value,
        label: value,
      }));
    }

    if (activeSort === "По состоянию") {
      if (
        activeRole !== "преподаватели" &&
        activeRole !== "студенты" &&
        activeRole !== "родители"
      ) {
        return [];
      }

      return [
        { id: "active", label: "Активный" },
        { id: "inactive", label: "Неактивный" },
      ];
    }

    return [];
  }, [activeRole, activeSort, teachers, students, parents, groups]);

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];

    if (activeSort === "По группе" && selectedFilterValues.length > 0) {
      result = result.filter((teacher) =>
        selectedFilterValues.includes(teacher.group_names)
      );
    }

    if (activeSort === "По состоянию" && selectedFilterValues.length > 0) {
      result = result.filter((teacher) =>
        selectedFilterValues.includes(teacher.status)
      );
    }

    return sortByAlphabet(result, (teacher) => teacher.full_name);
  }, [teachers, activeSort, selectedFilterValues]);

  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (activeSort === "По преподавателю" && selectedFilterValues.length > 0) {
      result = result.filter((student) =>
        selectedFilterValues.includes(student.teacher_name)
      );
    }

    if (activeSort === "По группе" && selectedFilterValues.length > 0) {
      result = result.filter((student) =>
        selectedFilterValues.includes(student.group_name)
      );
    }

    if (activeSort === "По филиалу" && selectedFilterValues.length > 0) {
      result = result.filter((student) =>
        selectedFilterValues.includes(student.school_name)
      );
    }

    if (activeSort === "По состоянию" && selectedFilterValues.length > 0) {
      result = result.filter((student) =>
        selectedFilterValues.includes(student.status)
      );
    }

    return sortByAlphabet(result, (student) => student.full_name);
  }, [students, activeSort, selectedFilterValues]);

  const filteredParents = useMemo(() => {
    let result = [...parents];

    if (activeSort === "По студенту" && selectedFilterValues.length > 0) {
      result = result.filter((parent) =>
        parent.children_groups_list?.some((item: any) =>
          selectedFilterValues.includes(item.student_name)
        )
      );
    }

    if (activeSort === "По группе" && selectedFilterValues.length > 0) {
      result = result.filter((parent) =>
        parent.children_groups_list?.some((item: any) =>
          selectedFilterValues.includes(item.group_name)
        )
      );
    }

    if (activeSort === "По состоянию" && selectedFilterValues.length > 0) {
      result = result.filter((parent) =>
        selectedFilterValues.includes(parent.status)
      );
    }

    return sortByAlphabet(result, (parent) => parent.full_name);
  }, [parents, activeSort, selectedFilterValues]);

  const filteredGroups = useMemo(() => {
    let result = [...groups];

    if (activeSort === "По преподавателю" && selectedFilterValues.length > 0) {
      result = result.filter((group) =>
        selectedFilterValues.includes(group.teacher_name)
      );
    }

    if (activeSort === "По филиалу" && selectedFilterValues.length > 0) {
      result = result.filter((group) =>
        selectedFilterValues.includes(group.school_name)
      );
    }

    if (activeSort === "По студенту" && selectedFilterValues.length > 0) {
      result = result.filter((group) =>
        group.students_list?.some((student: any) =>
          selectedFilterValues.includes(student.full_name)
        )
      );
    }

    return sortByAlphabet(result, (group) => group.group_name);
  }, [groups, activeSort, selectedFilterValues]);

  const filteredSchools = useMemo(() => {
    return sortByAlphabet(schools, (school) => school.name || school.full_name);
  }, [schools]);

  const filteredMyGroupStudents = useMemo(() => {
    return sortByAlphabet(myGroupStudents, (student) => student.full_name);
  }, [myGroupStudents]);

  const studentTeacherRows = useMemo(() => {
    if (user?.role !== "student") return [];

    if (teachers.length > 0) {
      return teachers.map((teacher) => ({
        ...teacher,
        phone: teacher.phone || "—",
        group_names: teacher.group_names || "—",
        groups_list: teacher.groups_list || [],
        senior_count: 0,
        junior_count: 0,
        total_count: 0,
        students_list: [],
      }));
    }

    const currentStudent = filteredStudents[0];

    if (!currentStudent?.teacher_name) return [];

    return [
      {
        id: currentStudent.teacher_id || 0,
        full_name: currentStudent.teacher_name,
        phone: currentStudent.teacher_phone || "—",
        status: "active",
        group_names: currentStudent.group_name || "—",
        groups_list: [],
        senior_count: 0,
        junior_count: 0,
        total_count: 0,
        students_list: [],
      },
    ];
  }, [user?.role, teachers, filteredStudents]);

  return (
    <>
      <div ref={tableRef}>
        <UsersToolbar
          user={user}
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          activeSort={activeSort}
          setActiveSort={setActiveSort}
          filterOptions={filterOptions}
          selectedFilterValues={selectedFilterValues}
          setSelectedFilterValues={setSelectedFilterValues}
          selectedId={selectedId}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onEdit={handleEdit}
        />
      
        {user?.role === "student" ? (
          <>
            <h3 style={{ marginLeft: "10%", marginTop: "18px" }}>Мои данные</h3>

            <UsersTable
              key="student-own-data"
              user={user}
              activeRole="студенты"
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              token={token}
              teachers={[]}
              students={filteredStudents}
              parents={[]}
              groups={[]}
              schools={[]}
            />

            <h3 style={{ marginLeft: "10%", marginTop: "28px" }}>Мой учитель</h3>

            <UsersTable
              key="student-my-teacher"
              user={user}
              activeRole="преподаватели"
              selectedId={null}
              setSelectedId={() => {}}
              token={token}
              teachers={studentTeacherRows}
              students={[]}
              parents={[]}
              groups={[]}
              schools={[]}
            />

            <h3 style={{ marginLeft: "10%", marginTop: "28px" }}>Моя группа</h3>

            <UsersTable
              key="student-my-group"
              user={user}
              activeRole="студенты"
              selectedId={null}
              setSelectedId={() => {}}
              token={token}
              teachers={[]}
              students={filteredMyGroupStudents}
              parents={[]}
              groups={[]}
              schools={[]}
              tableVariant="myGroup"
            />
          </>
        ) : (
          <UsersTable
            key={activeRole ?? "all-users"}
            user={user}
            activeRole={activeRole}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            token={token}
            teachers={filteredTeachers}
            students={filteredStudents}
            parents={filteredParents}
            groups={filteredGroups}
            schools={filteredSchools}
          />
        )}

        <AddTeacherModal
          isOpen={isAddTeacherOpen}
          onClose={() => setIsAddTeacherOpen(false)}
          onSubmit={handleCreateTeacher}
          groups={addTeacherGroups}
        />
        <AddStudentModal
          isOpen={isAddStudentOpen}
          onClose={() => setIsAddStudentOpen(false)}
          onSubmit={handleCreateStudent}
          schools={schools}
          courses={courses}
          groups={groups}
          parents={parents}
          onOpenAddSchool={() => setIsAddSchoolOpen(true)}
          onOpenAddParent={() => setIsAddParentOpen(true)}
        />
        <AddSchoolModal
          isOpen={isAddSchoolOpen}
          onClose={() => setIsAddSchoolOpen(false)}
          onSubmit={handleCreateSchool}
        />
        <AddParentModal
          isOpen={isAddParentOpen}
          onClose={() => setIsAddParentOpen(false)}
          onSubmit={handleCreateParent}
          students={freeStudents}
        />
        <AddGroupModal
          isOpen={isAddGroupOpen}
          onClose={() => setIsAddGroupOpen(false)}
          schools={schools}
          teachers={teachers}
          students={freeStudentsForGroup}
          onSubmit={handleCreateGroup}
        />
        <EditTeacherModal
          isOpen={isEditTeacherOpen}
          onClose={() => {
            setIsEditTeacherOpen(false);
            setEditingTeacher(null);
          }}
          onSubmit={handleUpdateTeacher}
          teacher={editingTeacher}
          freeGroups={groups
            .filter((group) => {
              const isFree = !group.teacher_name || group.teacher_name === "—";
              const alreadyBelongsToTeacher =
                editingTeacher?.groups_list?.some((g: { id: number }) => Number(g.id) === Number(group.id));

              return isFree || alreadyBelongsToTeacher;
            })
            .map((group) => ({
              id: Number(group.id),
              name: group.group_name || `${group.school_name}-${group.cabinet}`,
              schedule_list: Array.isArray(group.schedule_list) ? group.schedule_list : [],
            }))
          }
        />
        <EditSchoolModal
          isOpen={isEditSchoolOpen}
          onClose={() => {
            setIsEditSchoolOpen(false);
            setEditingSchool(null);
          }}
          onSubmit={handleUpdateSchool}
          school={editingSchool}
        />
        <EditStudentModal
          isOpen={isEditStudentOpen}
          onClose={() => {
            setIsEditStudentOpen(false);
            setEditingStudent(null);
          }}
          onSubmit={handleUpdateStudent}
          userRole={user?.role}
          student={editingStudent}
          schools={allSchoolsForStudentEdit}
          groups={groups}
          courses={courses}
          parents={parents}
          onAddParent={handleAddParentToStudent}
          onRemoveParent={handleRemoveParentFromStudent}
          onOpenAddSchool={() => setIsAddSchoolOpen(true)}
          onOpenAddParent={() => setIsAddParentOpen(true)}
        />
        <EditParentModal
          isOpen={isEditParentOpen}
          onClose={() => {
            setIsEditParentOpen(false);
            setEditingParent(null);
          }}
          onSubmit={handleUpdateParent}
          userRole={user?.role}
          parent={editingParent}
          freeStudents={freeStudents}
          onAddStudent={handleAddStudentToParent}
          onRemoveStudent={handleRemoveStudentFromParent}
          onUpdateChildLink={handleUpdateParentChildLink}
        />
        <EditGroupModal
          isOpen={isEditGroupOpen}
          onClose={() => {
            setIsEditGroupOpen(false);
            setEditingGroup(null);
          }}
          onSubmit={handleUpdateGroup}
          group={editingGroup}
          schools={schools}
          teachers={teachers}
          students={freeStudentsForGroup}
          onAddStudent={handleAddStudentToGroup}
          onRemoveStudent={handleRemoveStudentFromGroup}
        />
      </div>
      <CredentialsModal
        isOpen={!!createdCredentials}
        credentials={createdCredentials}
        onClose={() => setCreatedCredentials(null)}
      />
    </>
  );
};