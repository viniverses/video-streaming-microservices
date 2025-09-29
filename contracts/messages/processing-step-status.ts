export type ProcessingStep = "thumbnail" | "metadata" | "transcode";

export type ProcessingLogStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export interface ProcessingStepStatus {
  videoId: string;
  step: ProcessingStep;
  status: ProcessingLogStatus;
  message?: string;
  resolution?: number;
  timestamp?: string;
  data?: unknown;
  error?: string;
}
