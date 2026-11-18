import { z } from "zod";
import { parseCalendarDate } from "../domain/dates";

const taskStatus = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const taskPriority = z.enum(["LOW", "MEDIUM", "HIGH"]);

const calendarDate = z
  .string()
  .refine((v) => parseCalendarDate(v) !== null, {
    message: "Must be a valid calendar date YYYY-MM-DD",
  });

export const createTaskSchema = z
  .object({
    title: z.string().transform((s) => s.trim()),
    description: z
      .string()
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    status: taskStatus.optional(),
    priority: taskPriority.optional(),
    assignee: z
      .string()
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    dueDate: calendarDate,
  })
  .strip()
  .superRefine((data, ctx) => {
    if (data.title.length < 3 || data.title.length > 120) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["title"],
        message: "Title must be between 3 and 120 characters after trim",
      });
    }
    if (data.description !== null && data.description !== undefined) {
      if (data.description.length > 2000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["description"],
          message: "Description must be at most 2000 characters",
        });
      }
    }
    if (data.assignee !== null && data.assignee !== undefined) {
      if (data.assignee.length > 80) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assignee"],
          message: "Assignee must be at most 80 characters",
        });
      }
    }
  });

export const patchTaskSchema = z
  .object({
    title: z.string().transform((s) => s.trim()).optional(),
    description: z
      .string()
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    status: taskStatus.optional(),
    priority: taskPriority.optional(),
    assignee: z
      .string()
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
    dueDate: calendarDate.optional(),
  })
  .strip()
  .superRefine((data, ctx) => {
    if (data.title !== undefined) {
      if (data.title.length < 3 || data.title.length > 120) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["title"],
          message: "Title must be between 3 and 120 characters after trim",
        });
      }
    }
    if (data.description !== undefined && data.description !== null) {
      if (data.description.length > 2000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["description"],
          message: "Description must be at most 2000 characters",
        });
      }
    }
    if (data.assignee !== undefined && data.assignee !== null) {
      if (data.assignee.length > 80) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["assignee"],
          message: "Assignee must be at most 80 characters",
        });
      }
    }
  });

const intQuery = (min: number, max?: number) =>
  z.string().transform((s, ctx) => {
    if (!/^\d+$/.test(s)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be an integer" });
      return z.NEVER;
    }
    const n = Number(s);
    if (n < min || (max !== undefined && n > max)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Out of range" });
      return z.NEVER;
    }
    return n;
  });

export const listTasksQuerySchema = z
  .object({
    status: taskStatus.optional(),
    priority: taskPriority.optional(),
    q: z.string().optional(),
    sort: z.enum(["dueDate", "createdAt"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    page: intQuery(1).optional(),
    pageSize: intQuery(1, 50).optional(),
  })
  .strip();

export const createCommentSchema = z
  .object({
    body: z.string().transform((s) => s.trim()),
    author: z
      .string()
      .nullable()
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return null;
        const t = v.trim();
        return t === "" ? null : t;
      }),
  })
  .strip()
  .superRefine((data, ctx) => {
    if (data.body.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Comment body is required",
      });
    }
    if (data.body.length > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["body"],
        message: "Comment body must be at most 1000 characters",
      });
    }
    if (data.author !== null && data.author !== undefined) {
      if (data.author.length > 80) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["author"],
          message: "Author must be at most 80 characters",
        });
      }
    }
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type PatchTaskInput = z.infer<typeof patchTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;