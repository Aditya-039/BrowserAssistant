import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const explanations = pgTable("explanations", {
  id: serial("id").primaryKey(),
  selectedText: text("selected_text").notNull(),
  explanation: text("explanation").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const insertExplanationSchema = createInsertSchema(explanations).pick({
  selectedText: true,
  explanation: true,
  timestamp: true,
});

export type InsertExplanation = z.infer<typeof insertExplanationSchema>;
export type Explanation = typeof explanations.$inferSelect;

// API request/response types
export const explainTextSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const explanationResponseSchema = z.object({
  explanation: z.string(),
  selectedText: z.string(),
});

export type ExplainTextRequest = z.infer<typeof explainTextSchema>;
export type ExplanationResponse = z.infer<typeof explanationResponseSchema>;
