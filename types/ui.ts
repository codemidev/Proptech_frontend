/**
 * Aviritech PropTech
 *
 * Business-agnostic shared UI contracts.
 *
 * Do not add Clerk, Prisma, API, Agent, LandVault, Property,
 * organization, or other business-domain dependencies here.
 */

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  ThHTMLAttributes,
} from "react";

/* ============================================================================
 * COMMON
 * ========================================================================== */

export type Size = "sm" | "md" | "lg";

export type AsyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | {
      status: "error";
      message?: string;
    };

/* ============================================================================
 * BUTTON
 * ========================================================================== */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonState =
  | {
      state?: "default";
      loading?: false;
      disabled?: boolean;
    }
  | {
      state: "loading";
      loading: true;
      loadingText?: string;
      disabled?: true;
    }
  | {
      state: "disabled";
      loading?: false;
      disabled: true;
    };

export interface ButtonBaseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loadingText?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

export type ButtonProps = ButtonBaseProps & ButtonState;

/* ============================================================================
 * CARD
 * ========================================================================== */

export type CardVariant =
  | "default"
  | "elevated"
  | "outlined"
  | "interactive"
  | "danger"
  | "success";

export type CardPadding = "none" | "sm" | "md" | "lg";

export type CardInteraction =
  | {
      interactive?: false;
      href?: never;
      onClick?: never;
      role?: never;
    }
  | {
      interactive: true;
      href?: string;
      onClick?: () => void;
      role?: "button" | "link";
    };

export interface CardBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onClick"> {
  variant?: CardVariant;
  padding?: CardPadding;
  as?: "div" | "section" | "article";
  children: ReactNode;
}

export type CardProps = CardBaseProps & CardInteraction;

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

/* ============================================================================
 * FORM FIELD
 * ========================================================================== */

export type FormFieldOrientation = "vertical" | "horizontal";

export type FormFieldState =
  | {
      status?: "default";
      error?: never;
      successMessage?: never;
      warningMessage?: never;
    }
  | {
      status: "error";
      error: ReactNode;
      successMessage?: never;
      warningMessage?: never;
    }
  | {
      status: "success";
      error?: never;
      successMessage?: ReactNode;
      warningMessage?: never;
    }
  | {
      status: "warning";
      error?: never;
      successMessage?: never;
      warningMessage?: ReactNode;
    }
  | {
      status: "disabled";
      disabled: true;
      error?: never;
      successMessage?: never;
      warningMessage?: never;
    };

export interface FormFieldBaseProps {
  id: string;
  label?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  orientation?: FormFieldOrientation;
  ariaLabel?: string;
  children: ReactElement;
}

export type FormFieldProps = FormFieldBaseProps & FormFieldState;

export interface FormLabelProps
  extends HTMLAttributes<HTMLLabelElement> {
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}

export interface FormDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  id: string;
  children: ReactNode;
}

export interface FormErrorProps
  extends HTMLAttributes<HTMLParagraphElement> {
  id: string;
  children: ReactNode;
}

/* ============================================================================
 * DATA TABLE
 * ========================================================================== */

export type SortDirection = "asc" | "desc";

export interface DataTableSort {
  columnId: string;
  direction: SortDirection;
}

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  accessor?: keyof T;
  cell?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  hideOnMobile?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  headerProps?: ThHTMLAttributes<HTMLTableCellElement>;
};

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableSelection<T> {
  selectedIds: string[];
  onSelectionChange: (
    selectedIds: string[],
    selectedRows: T[],
  ) => void;
}

export type DataTableState<T> =
  | {
      state?: "ready";
      data: T[];
    }
  | {
      state: "loading";
      data?: T[];
    }
  | {
      state: "empty";
      data: [];
      emptyState?: ReactNode;
    }
  | {
      state: "error";
      data?: T[];
      error: ReactNode;
      onRetry?: () => void;
    };

export interface DataTableBaseProps<T> {
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  ariaLabel?: string;
  caption?: ReactNode;
  selectable?: boolean;
  selection?: DataTableSelection<T>;
  sortable?: boolean;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  stickyHeader?: boolean;
  className?: string;
}

export type DataTableProps<T> =
  DataTableBaseProps<T> &
  DataTableState<T>;

/* ============================================================================
 * DIALOG
 * ========================================================================== */

export type DialogSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "full";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  destructive?: boolean;
  closeLabel?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  loading?: boolean;
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

/* ============================================================================
 * STATUS BADGE
 * ========================================================================== */

export type StatusBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type StatusBadgeSize = "sm" | "md";

export interface StatusBadgeProps {
  label: ReactNode;
  tone?: StatusBadgeTone;
  size?: StatusBadgeSize;
  dot?: boolean;
  icon?: ReactNode;
  iconDecorative?: boolean;
  iconAriaLabel?: string;
  srLabel?: string;
  className?: string;
}

/* ============================================================================
 * SKELETON
 * ========================================================================== */

export type SkeletonVariant =
  | "text"
  | "title"
  | "avatar"
  | "rect"
  | "card"
  | "table-row";

export type SkeletonAnimation =
  | "pulse"
  | "shimmer"
  | "none";

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  animate?: boolean;
  animation?: SkeletonAnimation;
}

/* ============================================================================
 * APP SHELL
 * ========================================================================== */

export type AppShellState =
  | {
      state?: "ready";
      loading?: false;
      error?: never;
    }
  | {
      state: "loading";
      loading?: true;
      error?: never;
    }
  | {
      state: "error";
      loading?: false;
      error: ReactNode;
    };

export interface AppShellBaseProps {
  children: ReactNode;
  sidebar?: ReactNode;
  mobileNavigation?: ReactNode;
  /**
   * Optional shared DashboardHeader presentation slot.
   *
   * This is UI-only. Authentication, authorization, data fetching,
   * and business workflow logic remain outside AppShell.
   */
  dashboardHeader?: ReactNode;
  header?: ReactNode;
  breadcrumbs?: ReactNode;
  organization?: ReactNode;
  userMenu?: ReactNode;
  footer?: ReactNode;
  mainContentId?: string;
  navigationLabel?: string;
  mainContentLabel?: string;
  navigationOpen?: boolean;
  onNavigationOpenChange?: (open: boolean) => void;
  className?: string;
}

export type AppShellProps =
  AppShellBaseProps &
  AppShellState;

/* ============================================================================
 * TYPE-LEVEL UTILITY
 * ========================================================================== */

export type InputControlProps =
  InputHTMLAttributes<HTMLInputElement>;
