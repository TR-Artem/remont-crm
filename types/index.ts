import type { Status, AdType } from "@/lib/domain";

export interface AdSourceDTO {
  id: string;
  name: string;
  type: AdType;
  photoUrl: string | null;
  archived: boolean;
  createdAt: string;
}

export interface MasterDTO {
  id: string;
  name: string;
}

export interface RequestDocumentDTO {
  id: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface RequestDTO {
  id: string;
  clientName: string;
  phone: string;
  address: string;
  reason: string;
  status: Status;
  sourceId: string | null;
  source: AdSourceDTO | null;
  assignedMasterId: string | null;
  assignedMaster: MasterDTO | null;
  visitDatetime: string | null;
  branchId: string | null;
  createdAt: string;
  createdById: string;
  closedAt: string | null;
  closedById: string | null;
  closeStatus: "done" | "refused" | null;
  amountFull: number | null;
  amountRecorded: number | null;
  masterPercent: number | null;
  refusalReason: string | null;
  documents: RequestDocumentDTO[];
}
