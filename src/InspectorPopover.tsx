import { useId, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "./LanguageContext";

/** Native popovers provide Escape, outside dismissal and focus restoration. */
export function InspectorPopover({
  title,
  children,
  iconOnly = false,
  icon,
}: {
  title: string;
  children: ReactNode;
  iconOnly?: boolean;
  icon?: ReactNode;
}) {
  const id = useId();
  const { t } = useI18n();
  return (
    <>
      <button
        className="inspector-popover-trigger"
        popoverTarget={id}
        title={title}
        aria-label={title}
      >
        {icon ?? <SlidersHorizontal size={14} />}
        {!iconOnly && <span>{title}</span>}
      </button>
      <div
        id={id}
        popover="auto"
        className="inspector-popover"
        role="dialog"
        aria-label={title}
      >
        <div className="section-heading">
          {title}
          <button
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label={t("Close")}
            title={t("Close")}
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
