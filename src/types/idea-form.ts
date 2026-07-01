/** Shared form types for Idea creation/editing */

export interface IdeaFormValues {
  autoGenerateMsku: boolean;
  manualMsku: string;
  topicId: string;
  aiModelId: string;
  ideaSource: "employee" | "partner";
  partnerId: string;
  mainImageUrl: string;
  designFileUrl: string;
  prompt: string;
  sourceLinks: string[];
  title: string;
  description: string;
  bulletPoints: string[];
  tags: string;
  slugs: string;
  width: string;
  height: string;
  thickness: string;
  material: string;
  itemHighlights: string;
}
