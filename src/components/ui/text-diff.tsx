import * as Diff from 'diff';
import type { Change } from 'diff';

interface TextDiffProps {
  oldText?: string | null;
  newText?: string | null;
}

export function TextDiff({ oldText = "", newText = "" }: TextDiffProps) {
  if (oldText === newText) {
    return <div className="text-sm text-muted-foreground whitespace-pre-wrap">{newText}</div>;
  }

  const diffResult: Change[] = Diff.diffWords(oldText || "", newText || "");

  return (
    <div className="text-sm whitespace-pre-wrap break-words">
      {diffResult.map((part, index) => {
        if (part.added) {
          return (
            <span key={index} className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium px-0.5 rounded-sm">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="bg-red-500/20 text-red-600 dark:text-red-400 line-through opacity-70 px-0.5 mx-0.5 rounded-sm">
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </div>
  );
}
