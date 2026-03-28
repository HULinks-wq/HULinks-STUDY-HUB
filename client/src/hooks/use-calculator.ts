import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useCalculatorHistory() {
  return useQuery({
    queryKey: [api.calculator.history.path],
    queryFn: async () => {
      const res = await fetch(api.calculator.history.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch calculator history");
      return parseWithLogging(api.calculator.history.responses[200], await res.json(), "calculator.history");
    },
  });
}

export function useSolveEquation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.calculator.solve.input>) => {
      const validated = api.calculator.solve.input.parse(data);
      const res = await fetch(api.calculator.solve.path, {
        method: api.calculator.solve.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to solve equation");
      return parseWithLogging(api.calculator.solve.responses[200], await res.json(), "calculator.solve");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.calculator.history.path] });
    },
  });
}

export function useSolveFromFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ files, prompt }: { files: File[]; prompt: string }) => {
      const formData = new FormData();
      for (const file of files) formData.append("files", file);
      formData.append("prompt", prompt);
      const res = await fetch("/api/calculator/solve-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed to process file" }));
        throw new Error(err.message || "Failed to process file");
      }
      return parseWithLogging(api.calculator.solve.responses[200], await res.json(), "calculator.solve-file");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.calculator.history.path] });
    },
  });
}
