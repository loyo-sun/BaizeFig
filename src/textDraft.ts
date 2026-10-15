import type { TextRun } from "./textLayout";
import type { TextParagraph } from "./textParagraphs";
export interface TextDraft {
  text: string;
  runs: TextRun[];
  paragraphs: TextParagraph[];
  start: number;
  end: number;
}
export class TextDraftHistory {
  past: TextDraft[] = [];
  future: TextDraft[] = [];
  push(value: TextDraft) {
    const last = this.past.at(-1);
    if (last && JSON.stringify(last) === JSON.stringify(value)) return;
    this.past.push(structuredClone(value));
    if (this.past.length > 100) this.past.shift();
    this.future = [];
  }
  undo(current: TextDraft) {
    const previous = this.past.pop();
    if (!previous) return current;
    this.future.push(structuredClone(current));
    return previous;
  }
  redo(current: TextDraft) {
    const next = this.future.pop();
    if (!next) return current;
    this.past.push(structuredClone(current));
    return next;
  }
}
