import "./ScheduleGrid.css";

const weekDays = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

const weekDaysShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const hours = Array.from({ length: 13 }, (_, i) => 9 + i);

const dayNameToShort: Record<string, string> = {
  Понедельник: "Пн",
  Вторник: "Вт",
  Среда: "Ср",
  Четверг: "Чт",
  Пятница: "Пт",
  Суббота: "Сб",
  Воскресенье: "Вс",
};

const START_HOUR = 9;
const HOUR_HEIGHT = 68;
const TIME_COLUMN_WIDTH = 90;
const HEADER_HEIGHT = 72;
const DAY_HORIZONTAL_PADDING = 6;
const EVENT_GAP = 4;

export type AggregatePopoverItem = {
  id: string;
  group_name: string;
  teacher_name: string | null;
  school_name: string | null;
  cabinet: string | null;
  start_time: string;
  end_time: string;
};

type GroupScheduleItem = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

type GroupItem = {
  id: number;
  group_name: string;
  teacher_name: string | null;
  school_name: string | null;
  cabinet: string | null;
  schedule_list: GroupScheduleItem[];
};

type ScheduleGridProps = {
  viewMode: string;
  selectedDate: string;
  groups: GroupItem[];
  onAggregateClick: (
    items: AggregatePopoverItem[],
    anchorRect: DOMRect,
    lessonDate: string
  ) => void;
  onGroupClick?: (groupId: number, lessonDate: string) => void;
};

type ScheduleDay = {
  name: string;
  date: string;
  fullDate: string;
};

type ScheduleEvent = {
  id: string;
  group_id: number;
  dayShort: string;
  group_name: string;
  teacher_name: string | null;
  school_name: string | null;
  cabinet: string | null;
  start_time: string;
  end_time: string;
  startMinutes: number;
  endMinutes: number;
  column: number;
  columnsCount: number;
  clusterId: string;
  clusterSize: number;
};

type RenderItem =
  | {
      type: "event";
      event: ScheduleEvent;
    }
  | {
      type: "aggregate";
      id: string;
      dayShort: string;
      startMinutes: number;
      endMinutes: number;
      items: ScheduleEvent[];
    };

const formatShortDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
};

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMinutesToTime = (minutes: number) => {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
};

const getMonday = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  return monday;
};

const getMonthMatrix = (dateString: string) => {
  const baseDate = new Date(dateString);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number | null; fullDate: string | null }> = [];

  for (let i = 0; i < firstWeekDay; i++) {
    cells.push({ day: null, fullDate: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);

    cells.push({
      day,
      fullDate: formatIsoDate(currentDate),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, fullDate: null });
  }

  return cells;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
};

const createRawEvents = (groups: GroupItem[]): ScheduleEvent[] => {
  return groups.flatMap((group) =>
    group.schedule_list.map((item, index) => ({
      id: `${group.id}-${item.day_of_week}-${item.start_time}-${item.end_time}-${index}`,
      group_id: group.id,
      dayShort: item.day_of_week,
      group_name: group.group_name,
      teacher_name: group.teacher_name,
      school_name: group.school_name,
      cabinet: group.cabinet,
      start_time: item.start_time,
      end_time: item.end_time,
      startMinutes: timeToMinutes(item.start_time),
      endMinutes: timeToMinutes(item.end_time),
      column: 0,
      columnsCount: 1,
      clusterId: "",
      clusterSize: 1,
    }))
  );
};

const layoutDayEvents = (events: ScheduleEvent[]): ScheduleEvent[] => {
  const sorted = [...events].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }

    if (a.endMinutes !== b.endMinutes) {
      return a.endMinutes - b.endMinutes;
    }

    return a.group_name.localeCompare(b.group_name);
  });

  const result: ScheduleEvent[] = [];
  let cluster: ScheduleEvent[] = [];
  let clusterEnd = -1;
  let clusterCounter = 0;

  const finalizeCluster = () => {
    if (cluster.length === 0) return;

    const currentClusterId = `${cluster[0].dayShort}-cluster-${clusterCounter++}`;
    const columns: ScheduleEvent[][] = [];

    cluster.forEach((event) => {
      let placed = false;

      for (let i = 0; i < columns.length; i++) {
        const lastEventInColumn = columns[i][columns[i].length - 1];

        if (lastEventInColumn.endMinutes <= event.startMinutes) {
          event.column = i;
          columns[i].push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        event.column = columns.length;
        columns.push([event]);
      }
    });

    const columnsCount = columns.length;
    const clusterSize = cluster.length;

    cluster.forEach((event) => {
      event.columnsCount = columnsCount;
      event.clusterId = currentClusterId;
      event.clusterSize = clusterSize;
      result.push(event);
    });

    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((event) => {
    if (cluster.length === 0) {
      cluster.push(event);
      clusterEnd = event.endMinutes;
      return;
    }

    if (event.startMinutes < clusterEnd) {
      cluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.endMinutes);
    } else {
      finalizeCluster();
      cluster.push(event);
      clusterEnd = event.endMinutes;
    }
  });

  finalizeCluster();

  return result;
};

const getLaidOutEvents = (groups: GroupItem[]): ScheduleEvent[] => {
  const rawEvents = createRawEvents(groups);
  const groupedByDay: Record<string, ScheduleEvent[]> = {};

  rawEvents.forEach((event) => {
    if (!groupedByDay[event.dayShort]) {
      groupedByDay[event.dayShort] = [];
    }
    groupedByDay[event.dayShort].push(event);
  });

  return Object.values(groupedByDay).flatMap((dayEvents) =>
    layoutDayEvents(dayEvents)
  );
};

const buildRenderItems = (events: ScheduleEvent[]): RenderItem[] => {
  const groupedByCluster: Record<string, ScheduleEvent[]> = {};

  events.forEach((event) => {
    const clusterKey = `${event.dayShort}-${event.clusterId}`;
    if (!groupedByCluster[clusterKey]) {
      groupedByCluster[clusterKey] = [];
    }

    groupedByCluster[clusterKey].push(event);
  });

  const items: RenderItem[] = [];

  Object.values(groupedByCluster).forEach((clusterEvents) => {
    const sortedClusterEvents = [...clusterEvents].sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }

      if (a.endMinutes !== b.endMinutes) {
        return a.endMinutes - b.endMinutes;
      }

      return a.group_name.localeCompare(b.group_name);
    });

    const maxColumns = Math.max(
      ...sortedClusterEvents.map((event) => event.columnsCount)
    );

    if (maxColumns <= 2) {
      sortedClusterEvents.forEach((event) => {
        items.push({
          type: "event",
          event,
        });
      });

      return;
    }

    items.push({
      type: "aggregate",
      id: sortedClusterEvents[0].clusterId,
      dayShort: sortedClusterEvents[0].dayShort,
      startMinutes: Math.min(
        ...sortedClusterEvents.map((event) => event.startMinutes)
      ),
      endMinutes: Math.max(
        ...sortedClusterEvents.map((event) => event.endMinutes)
      ),
      items: sortedClusterEvents,
    });
  });

  return items;
};

const getEventPosition = (
  event: ScheduleEvent,
  dayIndex: number,
  daysCount: number
) => {
  const top = ((event.startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((event.endMinutes - event.startMinutes) / 60) * HOUR_HEIGHT;

  const dayWidthExpr = `((100% - ${TIME_COLUMN_WIDTH}px) / ${daysCount})`;
  const usableDayWidthExpr = `(${dayWidthExpr} - ${
    DAY_HORIZONTAL_PADDING * 2
  }px)`;
  const singleColumnWidthExpr = `(${usableDayWidthExpr} / ${event.columnsCount})`;

  return {
    top,
    height,
    left: `calc(${TIME_COLUMN_WIDTH}px + (${dayIndex} * ${dayWidthExpr}) + ${DAY_HORIZONTAL_PADDING}px + (${event.column} * ${singleColumnWidthExpr}) + ${
      EVENT_GAP / 2
    }px)`,
    width: `calc(${singleColumnWidthExpr} - ${EVENT_GAP}px)`,
  };
};

const getAggregatePosition = (
  dayIndex: number,
  daysCount: number,
  startMinutes: number,
  endMinutes: number
) => {
  const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

  const dayWidthExpr = `((100% - ${TIME_COLUMN_WIDTH}px) / ${daysCount})`;

  return {
    top,
    height,
    left: `calc(${TIME_COLUMN_WIDTH}px + (${dayIndex} * ${dayWidthExpr}) + ${DAY_HORIZONTAL_PADDING}px)`,
    width: `calc(${dayWidthExpr} - ${DAY_HORIZONTAL_PADDING * 2}px)`,
  };
};

const getCompactTitle = (event: ScheduleEvent) => {
  if (event.columnsCount >= 6) {
    return event.group_name.length > 8
      ? `${event.group_name.slice(0, 8)}…`
      : event.group_name;
  }

  if (event.columnsCount >= 4) {
    return event.group_name.length > 12
      ? `${event.group_name.slice(0, 12)}…`
      : event.group_name;
  }

  return event.group_name;
};

export const ScheduleGrid = ({
  viewMode,
  selectedDate,
  groups,
  onAggregateClick,
  onGroupClick,
}: ScheduleGridProps) => {
  const isDayView = viewMode === "день";
  const isWeekView = viewMode === "неделя";
  const isMonthView = viewMode === "месяц";

  if (isMonthView) {
    const monthCells = getMonthMatrix(selectedDate);

    return (
      <section className="schedule schedule--month">
        <div className="schedule-month">
          <div className="schedule-month__header">
            {weekDaysShort.map((day, index) => (
              <div
                key={day}
                className={`schedule-month__dayName ${
                  index >= 5 ? "schedule-month__dayName--weekend" : ""
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="schedule-month__grid">
            {monthCells.map((cell, index) => {
              const isWeekend = index % 7 === 5 || index % 7 === 6;
              const isSelected = cell.fullDate === selectedDate;

              return (
                <div
                  key={`${cell.fullDate ?? "empty"}-${index}`}
                  className={`schedule-month__cell ${
                    !cell.day ? "schedule-month__cell--empty" : ""
                  } ${isWeekend ? "schedule-month__cell--weekend" : ""} ${
                    isSelected ? "schedule-month__cell--active" : ""
                  }`}
                >
                  {cell.day && (
                    <div className="schedule-month__dateNumber">{cell.day}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const monday = getMonday(selectedDate);

  const days: ScheduleDay[] = isDayView
    ? [
        {
          name: weekDays[
            new Date(selectedDate).getDay() === 0
              ? 6
              : new Date(selectedDate).getDay() - 1
          ],
          date: formatShortDate(new Date(selectedDate)),
          fullDate: selectedDate,
        },
      ]
    : weekDays.map((dayName, index) => {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + index);

        return {
          name: dayName,
          date: formatShortDate(currentDate),
          fullDate: formatIsoDate(currentDate),
        };
      });

  const allEvents = getLaidOutEvents(groups);
  const renderItems = buildRenderItems(allEvents);

  const visibleItems = renderItems.filter((item) =>
    days.some((day) => {
      const currentShort = dayNameToShort[day.name];
      return item.type === "event"
        ? item.event.dayShort === currentShort
        : item.dayShort === currentShort;
    })
  );

  return (
    <section className={`schedule ${isDayView ? "schedule--day" : ""}`}>
      <div
        className={`schedule__wrapper ${
          isDayView ? "schedule__wrapper--day" : ""
        }`}
        style={{
          gridTemplateColumns: isDayView
            ? "90px 700px"
            : `90px repeat(${days.length}, 1fr)`,
        }}
      >
        <div className="schedule__corner"></div>

        {days.map((day) => (
          <div key={`${day.name}-${day.date}`} className="schedule__dayHeader">
            <div className="schedule__dayName">{day.name}</div>
            {(isWeekView || isDayView) && (
              <div className="schedule__dayDate">{day.date}</div>
            )}
          </div>
        ))}

        {hours.map((hour) => (
          <div key={hour} style={{ display: "contents" }}>
            <div className="schedule__timeCell">{hour}:00</div>

            {days.map((day) => (
              <div
                key={`${day.name}-${day.date}-${hour}`}
                className="schedule__cell"
              />
            ))}
          </div>
        ))}

        <div className="schedule__eventsOverlay">
          {visibleItems.map((item) => {
            const itemDayShort =
              item.type === "event" ? item.event.dayShort : item.dayShort;

            const dayIndex = days.findIndex(
              (day) => dayNameToShort[day.name] === itemDayShort
            );

            if (dayIndex === -1) return null;

            if (item.type === "aggregate") {
              const position = getAggregatePosition(
                dayIndex,
                days.length,
                item.startMinutes,
                item.endMinutes
              );

              return (
                <div
                  key={item.id}
                  className="schedule__eventCard schedule__eventCard--aggregate"
                  style={{
                    top: `${HEADER_HEIGHT + position.top}px`,
                    height: `${position.height}px`,
                    left: position.left,
                    width: position.width,
                  }}
                  onClick={(event) => {
                    onAggregateClick(
                      item.items.map((group) => ({
                        id: group.id,
                        group_name: group.group_name,
                        teacher_name: group.teacher_name,
                        school_name: group.school_name,
                        cabinet: group.cabinet,
                        start_time: group.start_time,
                        end_time: group.end_time,
                      })),
                      event.currentTarget.getBoundingClientRect(),
                      days[dayIndex].fullDate
                    );
                  }}
                >
                  <div className="schedule__eventTitle">Группы</div>
                  <div className="schedule__eventText">
                    {item.items.length} группы
                  </div>
                  <div className="schedule__eventText">
                    {formatMinutesToTime(item.startMinutes)} —{" "}
                    {formatMinutesToTime(item.endMinutes)}
                  </div>
                </div>
              );
            }

            const event = item.event;
            const position = getEventPosition(event, dayIndex, days.length);
            const hasOverlap = event.columnsCount > 1;
            const isVeryNarrow = event.columnsCount >= 5;
            const isNarrow = event.columnsCount >= 3;

            return (
              <div
                key={event.id}
                className={`schedule__eventCard ${
                  isVeryNarrow
                    ? "schedule__eventCard--veryNarrow"
                    : isNarrow
                    ? "schedule__eventCard--narrow"
                    : ""
                }`}
                style={{
                  top: `${HEADER_HEIGHT + position.top}px`,
                  height: `${position.height}px`,
                  left: position.left,
                  width: position.width,
                }}
                title={`${event.group_name}
${event.teacher_name ?? ""}
${event.school_name ?? ""}${
                  event.school_name && event.cabinet ? ", " : ""
                }${event.cabinet ?? ""}
${event.start_time.slice(0, 5)} — ${event.end_time.slice(0, 5)}`}
                onClick={() => {
                  onGroupClick?.(event.group_id, days[dayIndex].fullDate);
                }}
              >
                <div className="schedule__eventTitle">
                  {getCompactTitle(event)}
                </div>

                {!hasOverlap && event.teacher_name && (
                  <div className="schedule__eventText">
                    {event.teacher_name}
                  </div>
                )}

                {!hasOverlap && (event.school_name || event.cabinet) && (
                  <div className="schedule__eventText">
                    {event.school_name ?? ""}
                    {event.school_name && event.cabinet ? ", " : ""}
                    {event.cabinet ?? ""}
                  </div>
                )}

                {!isNarrow && (
                  <div className="schedule__eventText">
                    {event.start_time.slice(0, 5)} — {event.end_time.slice(0, 5)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};