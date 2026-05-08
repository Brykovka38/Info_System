export type GroupScheduleItem = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

export type GroupWithSchedule = {
  id: number;
  name?: string;
  group_name?: string;
  schedule_list: GroupScheduleItem[];
};

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
};

export const isTimeOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
};

// проверка конфликтов расписания
export const hasScheduleConflict = (
  groupToAdd: GroupWithSchedule,
  selectedGroups: GroupWithSchedule[]
) => {
  for (const existingGroup of selectedGroups) {
    for (const newSchedule of groupToAdd.schedule_list || []) {
      for (const existingSchedule of existingGroup.schedule_list || []) {
        if (
          newSchedule.day_of_week === existingSchedule.day_of_week &&
          isTimeOverlap(
            newSchedule.start_time,
            newSchedule.end_time,
            existingSchedule.start_time,
            existingSchedule.end_time
          )
        ) {
          return {
            hasConflict: true,
            conflictGroup:
              existingGroup.name || existingGroup.group_name || "Без названия",
            day: newSchedule.day_of_week,
            start: newSchedule.start_time,
            end: newSchedule.end_time,
          };
        }
      }
    }
  }

  return { hasConflict: false };
};