import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useAssignments() {
  return useQuery({
    queryKey: [api.assignments.list.path],
    queryFn: async () => {
      const res = await fetch(api.assignments.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return parseWithLogging(api.assignments.list.responses[200], await res.json(), "assignments.list");
    },
  });
}

export function useAssignment(id: number) {
  return useQuery({
    queryKey: [api.assignments.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.assignments.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch assignment");
      return parseWithLogging(api.assignments.get.responses[200], await res.json(), "assignments.get");
    },
    enabled: !!id,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.assignments.create.input>) => {
      const validated = api.assignments.create.input.parse(data);
      const res = await fetch(api.assignments.create.path, {
        method: api.assignments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create assignment");
      return parseWithLogging(api.assignments.create.responses[201], await res.json(), "assignments.create");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.assignments.list.path] });
    },
  });
}

export function useGenerateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.assignments.generateFeedback.path, { id });
      const res = await fetch(url, {
        method: api.assignments.generateFeedback.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate feedback");
      return parseWithLogging(api.assignments.generateFeedback.responses[200], await res.json(), "assignments.feedback");
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.assignments.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.assignments.list.path] });
    },
  });
}
