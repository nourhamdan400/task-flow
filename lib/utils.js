export const STATUS = { todo: "To Do", in_progress: "In Progress", done: "Done" };
export const PRIORITY = { low: "Low", medium: "Medium", high: "High" };
export const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local timezone
export const isOverdue = (t) => !!t.dueDate && t.status !== "done" && t.dueDate < today();
