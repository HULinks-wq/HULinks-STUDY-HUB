import { db } from "./db";
import {
  courses, quizzes, assignments, calculatorLogs, exams, studentUploads, users,
  type InsertCourse, type InsertQuiz, type InsertAssignment,
  type InsertCalculatorLog, type InsertExam, type InsertUpload,
  type Course, type Quiz, type Assignment, type CalculatorLog, type Exam, type StudentUpload,
} from "@shared/schema";
import { eq, desc, and, ilike } from "drizzle-orm";

export interface IStorage {
  // Courses
  getCourses(): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  // Quizzes
  getQuizzes(userId: string): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  // Assignments
  getAssignments(userId: string): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignmentFeedback(id: number, feedback: any): Promise<Assignment>;
  // Calculator
  getCalculatorLogs(userId: string): Promise<CalculatorLog[]>;
  createCalculatorLog(log: InsertCalculatorLog): Promise<CalculatorLog>;
  // Exams
  getExams(userId: string): Promise<Exam[]>;
  getExam(id: number): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExamResult(id: number, data: { userAnswers: Record<number, string>; score: number; weakTopics: string[]; completedAt: Date }): Promise<Exam>;
  // Student Uploads
  getUploads(userId: string): Promise<StudentUpload[]>;
  getUpload(id: number): Promise<StudentUpload | undefined>;
  getUploadsForModule(userId: string, module: string): Promise<StudentUpload[]>;
  createUpload(upload: InsertUpload): Promise<StudentUpload>;
  deleteUpload(id: number): Promise<void>;
  incrementUploadQuizCount(id: number): Promise<void>;
  // Payments
  updateUserPayment(userId: string, data: { isPremium: boolean; tier: string; paymentStatus: string; stripeSessionId: string; subscriptionEnd: Date }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getCourses() { return db.select().from(courses); }
  async getCourse(id: number) { const [r] = await db.select().from(courses).where(eq(courses.id, id)); return r; }
  async createCourse(v: InsertCourse) { const [r] = await db.insert(courses).values(v).returning(); return r; }

  async getQuizzes(userId: string) { return db.select().from(quizzes).where(eq(quizzes.userId, userId)).orderBy(desc(quizzes.createdAt)); }
  async getQuiz(id: number) { const [r] = await db.select().from(quizzes).where(eq(quizzes.id, id)); return r; }
  async createQuiz(v: InsertQuiz) { const [r] = await db.insert(quizzes).values(v).returning(); return r; }

  async getAssignments(userId: string) { return db.select().from(assignments).where(eq(assignments.userId, userId)).orderBy(desc(assignments.createdAt)); }
  async getAssignment(id: number) { const [r] = await db.select().from(assignments).where(eq(assignments.id, id)); return r; }
  async createAssignment(v: InsertAssignment) { const [r] = await db.insert(assignments).values(v).returning(); return r; }
  async updateAssignmentFeedback(id: number, feedback: any) { const [r] = await db.update(assignments).set({ feedback }).where(eq(assignments.id, id)).returning(); return r; }

  async getCalculatorLogs(userId: string) { return db.select().from(calculatorLogs).where(eq(calculatorLogs.userId, userId)).orderBy(desc(calculatorLogs.createdAt)); }
  async createCalculatorLog(v: InsertCalculatorLog) { const [r] = await db.insert(calculatorLogs).values(v).returning(); return r; }

  async getExams(userId: string) { return db.select().from(exams).where(eq(exams.userId, userId)).orderBy(desc(exams.createdAt)); }
  async getExam(id: number) { const [r] = await db.select().from(exams).where(eq(exams.id, id)); return r; }
  async createExam(v: InsertExam) { const [r] = await db.insert(exams).values(v).returning(); return r; }
  async updateExamResult(id: number, data: { userAnswers: Record<number, string>; score: number; weakTopics: string[]; completedAt: Date }) {
    const [r] = await db.update(exams).set(data).where(eq(exams.id, id)).returning(); return r;
  }

  async getUploads(userId: string) { return db.select().from(studentUploads).where(eq(studentUploads.userId, userId)).orderBy(desc(studentUploads.createdAt)); }
  async getUpload(id: number) { const [r] = await db.select().from(studentUploads).where(eq(studentUploads.id, id)); return r; }
  async getUploadsForModule(userId: string, module: string) {
    return db.select().from(studentUploads)
      .where(and(eq(studentUploads.userId, userId), ilike(studentUploads.module, `%${module}%`)));
  }
  async createUpload(v: InsertUpload) { const [r] = await db.insert(studentUploads).values(v).returning(); return r; }
  async deleteUpload(id: number) { await db.delete(studentUploads).where(eq(studentUploads.id, id)); }
  async incrementUploadQuizCount(id: number) {
    const [u] = await db.select().from(studentUploads).where(eq(studentUploads.id, id));
    if (u) await db.update(studentUploads).set({ quizzesGenerated: (u.quizzesGenerated || 0) + 1 }).where(eq(studentUploads.id, id));
  }

  async updateUserPayment(userId: string, data: { isPremium: boolean; tier: string; paymentStatus: string; stripeSessionId: string; subscriptionEnd: Date }) {
    await db.update(users).set({
      isPremium: data.isPremium,
      tier: data.tier,
      paymentStatus: data.paymentStatus,
      stripeSessionId: data.stripeSessionId,
      subscriptionEnd: data.subscriptionEnd,
    }).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
