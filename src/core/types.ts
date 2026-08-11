export type ApprovalStatus = 'approved' | 'rejected' | 'pending';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface CommandReview {
  id: string;
  command: string;
  reason: string;
  risk: RiskLevel;
  requiresApproval: boolean;
  approvalStatus: ApprovalStatus;
  addedAt: string;
}

export interface TranscriptEntry {
  at: string;
  role: 'system' | 'agent' | 'user' | 'tool';
  text: string;
  meta?: Record<string, string | number | boolean> & {
    commandReviewId?: string;
    approvalStatus?: ApprovalStatus;
  };
}

export interface WorkspaceCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface SessionFixture {
  sessionId: string;
  workspaceRoot: string;
  objective: string;
  transcript: TranscriptEntry[];
  commandReviews: CommandReview[];
  expectedPaths: string[];
}

export interface InspectOptions {
  fixturePath: string;
  outputDir: string;
  summaryOnly?: boolean;
}

export interface ExportArtifacts {
  summaryPath: string;
  transcriptPath: string;
  proofBundlePath: string;
}

export interface InspectResult {
  sessionId: string;
  workspaceRoot: string;
  objective: string;
  checks: WorkspaceCheck[];
  commandReviews: CommandReview[];
  transcriptCount: number;
  exportArtifacts: ExportArtifacts;
}
