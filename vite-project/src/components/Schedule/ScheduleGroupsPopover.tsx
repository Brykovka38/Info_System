import { useEffect } from "react";
import type { SchedulePopoverGroupItem } from "./SchedulePage";
import "./ScheduleGroupsPopover.css";

type SchedulePopoverData = {
  items: SchedulePopoverGroupItem[];
  anchorRect: DOMRect;
  lessonDate: string;
} | null;

type ScheduleGroupsPopoverProps = {
  data: SchedulePopoverData;
  onClose: () => void;
  onGroupClick: (groupId: number, lessonDate: string) => void;
};

export const ScheduleGroupsPopover = ({
  data,
  onClose,
  onGroupClick,
}: ScheduleGroupsPopoverProps) => {
  useEffect(() => {
    if (!data) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [data, onClose]);

  if (!data) return null;

  const { items, anchorRect, lessonDate } = data;

    const POPOVER_WIDTH = 340;
    const POPOVER_HEIGHT = 420;
    const GAP = 12;
    const VIEWPORT_PADDING = 12;

    let left = anchorRect.right + GAP;
    let top = anchorRect.top + 8;

    const fitsRight =
    anchorRect.right + GAP + POPOVER_WIDTH <=
    window.innerWidth - VIEWPORT_PADDING;

    if (!fitsRight) {
    left = anchorRect.left - POPOVER_WIDTH - GAP;
    }

    if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING;
    }

    if (top + POPOVER_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
    top = window.innerHeight - POPOVER_HEIGHT - VIEWPORT_PADDING;
    }

    if (top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING;
    }

  return (
    <>
      <div className="schedule-popover__backdrop" onClick={onClose} />

      <div
        className="schedule-popover"
        style={{
          top: `${top}px`,
          left: `${left}px`,
        }}
      >
        <div className="schedule-popover__header">
          <div className="schedule-popover__title">Группы</div>
          <button
            type="button"
            className="schedule-popover__close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="schedule-popover__count">{items.length} группы</div>

        <div className="schedule-popover__list">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="schedule-popover__item"
              onClick={() => onGroupClick(Number(item.id.split("-")[0]), lessonDate)}
            >
              <div className="schedule-popover__groupName">
                {item.group_name}
              </div>

              <div className="schedule-popover__meta">
                {item.start_time.slice(0, 5)} — {item.end_time.slice(0, 5)}
              </div>

              {item.teacher_name && (
                <div className="schedule-popover__meta">
                  {item.teacher_name}
                </div>
              )}

              {(item.school_name || item.cabinet) && (
                <div className="schedule-popover__meta">
                  {item.school_name ?? ""}
                  {item.school_name && item.cabinet ? ", " : ""}
                  {item.cabinet ?? ""}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};