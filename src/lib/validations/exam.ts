import { z } from "zod";

export const examFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    subject: z.string().min(1, "Subject is required").max(100),
    examType: z.enum(["mcq", "cq", "mixed"]),
    duration: z.coerce.number().min(1).max(600),
    isUnlimited: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    isHidden: z.boolean(),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    allowedStudents: z.string().optional(),
    negativeMarking: z.coerce.number().min(0).max(1).default(0),
    proctoringEnabled: z.boolean().default(true),
    maxViolations: z.coerce.number().min(1).max(20).default(5),
    allowRetakes: z.boolean().default(false),
    requireRetakeApproval: z.boolean().default(false),
    maxRetakes: z.coerce.number().min(1).max(10).default(1),
    tags: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })
  .refine(
    (data) => {
      if (data.isUnlimited) return true;
      return !!data.startTime && !!data.endTime;
    },
    { message: "Start and end times required when not unlimited", path: ["endTime"] }
  )
  .refine(
    (data) => {
      if (data.isUnlimited || !data.startTime || !data.endTime) return true;
      return new Date(data.startTime) < new Date(data.endTime);
    },
    { message: "End time must be after start time", path: ["endTime"] }
  );

export type ExamFormValues = z.infer<typeof examFormSchema>;

export const questionFormSchema = z.object({
  examId: z.string().min(1),
  text: z.string().min(1, "Question text required"),
  options: z.array(z.string().min(1)).length(4).optional(),
  correctIndex: z.coerce.number().min(0).max(3).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  points: z.coerce.number().min(1).default(1),
});

export const bulkQuestionsSchema = z.array(
  z.object({
    text: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correctIndex: z.number().min(0),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    points: z.number().optional(),
  })
);

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRegisterSchema = authLoginSchema.extend({
  name: z.string().min(2).max(100),
});

export const cqScoreSchema = z.object({
  resultId: z.string().min(1),
  score: z.coerce.number().min(0),
  feedback: z.string().max(2000).optional(),
});

export const submitMcqSchema = z.object({
  examId: z.string().min(1),
  answers: z.record(z.string(), z.number()),
  bookmarks: z.array(z.string()).optional(),
  violationCount: z.number().optional(),
  timeTakenMs: z.number().min(0).optional(),
  startedAt: z.number().optional(),
});

export const violationSchema = z.object({
  examId: z.string().min(1),
  sessionId: z.string().min(1),
  type: z.enum([
    "tab_switch",
    "visibility_hidden",
    "fullscreen_exit",
    "copy_paste",
    "right_click",
    "keyboard_shortcut",
    "devtools",
    "multiple_tabs",
  ]),
  metadata: z.record(z.unknown()).optional(),
});
