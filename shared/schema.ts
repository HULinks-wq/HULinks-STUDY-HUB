import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users as authUsers } from "./models/auth";

export const users = authUsers;

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  modules: text("modules").array().notNull().default([]),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  isTest: boolean("is_test").default(false),
  questions: jsonb("questions").notNull().$type<any[]>(),
  timerSeconds: integer("timer_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  feedback: jsonb("feedback").$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calculatorLogs = pgTable("calculator_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  equation: text("equation").notNull(),
  solution: jsonb("solution").notNull().$type<any>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  module: text("module").notNull(),
  title: text("title").notNull(),
  type: varchar("type").notNull().default("mock"),
  questions: jsonb("questions").$type<any[]>(),
  predictionResult: jsonb("prediction_result").$type<any>(),
  userAnswers: jsonb("user_answers").$type<Record<number, string>>(),
  score: real("score"),
  weakTopics: text("weak_topics").array(),
  timerSeconds: integer("timer_seconds"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentUploads = pgTable("student_uploads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  module: text("module").notNull(),
  topic: text("topic"),
  filename: text("filename").notNull(),
  fileContent: text("file_content").notNull(),
  fileSize: integer("file_size"),
  quizzesGenerated: integer("quizzes_generated").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCourseSchema = createInsertSchema(courses).omit({ id: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true, createdAt: true, feedback: true });
export const insertCalculatorLogSchema = createInsertSchema(calculatorLogs).omit({ id: true, createdAt: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export const insertUploadSchema = createInsertSchema(studentUploads).omit({ id: true, createdAt: true, quizzesGenerated: true });

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type CalculatorLog = typeof calculatorLogs.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type StudentUpload = typeof studentUploads.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertCalculatorLog = z.infer<typeof insertCalculatorLogSchema>;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type InsertUpload = z.infer<typeof insertUploadSchema>;

export type CreateQuizRequest = {
  courseId: number;
  topic: string;
  isTest: boolean;
  questionCount: number;
};
