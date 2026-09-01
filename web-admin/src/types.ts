export type UserRecord = {
  uid: string;
  name?: string;
  phone?: string;
  bloodGroup?: string;
  district?: string;
  verificationStatus?: string;
};

export type PostRecord = {
  postId: string;
  authorUid: string;
  Name?: string;
  District?: string;
  BloodGroup?: string;
  Time?: number;
  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  isVisible?: boolean;
  reviewedAt?: number;
  reviewedBy?: string;
  flagReason?: string;
};

export type ReportRecord = {
  reportId: string;
  reporterUid: string;
  reportedUid: string;
  reason: string;
  timestamp: number;
  contentType: "POST" | "USER";
};

export type BlogRecord = {
  id: string;
  title: string;
  authorName: string;
  content: string;
  createdAt: number;
  publishedAt: number;
};

export type StoryRecord = {
  id: string;
  title: string;
  authorName: string;
  content: string;
  anonymous: boolean;
  createdAt: number;
  publishedAt: number;
};

export type SubmissionType = "blog" | "story";
export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ContentSubmission = {
  id: string;
  type: SubmissionType;
  title: string;
  authorName: string;
  content: string;
  anonymous: boolean;
  status: SubmissionStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
};

export type FeedbackDraft = {
  firstName: string;
  lastName: string;
  email: string;
  comment: string;
};

export type FeedbackFieldErrors = Partial<Record<keyof FeedbackDraft, string>>;

export type FeedbackApiError = {
  field: keyof FeedbackDraft;
  message: string;
};

export type FeedbackApiSuccess = {
  success: true;
  message: string;
  data: {
    id: string;
    timestamp: string;
  };
};

export type FeedbackApiFailure = {
  success: false;
  message: string;
  errors: FeedbackApiError[];
};

export type FeedbackSyncState = "PENDING" | "SYNCED" | "FAILED";

export type FeedbackLocalRecord = FeedbackDraft & {
  localId: string;
  createdAt: number;
  syncState: FeedbackSyncState;
  remoteId?: string;
};

export type FeedbackSubmitResult =
  | { ok: true; userMessage: string }
  | {
      ok: false;
      reason: "VALIDATION" | "RATE_LIMITED" | "NETWORK" | "TIMEOUT" | "SERVER";
      userMessage: string;
      fieldErrors?: FeedbackFieldErrors;
    };
