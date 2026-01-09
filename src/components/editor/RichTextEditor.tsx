import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Lightbulb,
  AlertTriangle,
  Pin,
  Image,
  Link,
  Code,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const wordCount = value.split(/\s+/).filter(w => w.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  const updateSelection = useCallback(() => {
    if (textareaRef.current) {
      setSelectionStart(textareaRef.current.selectionStart);
      setSelectionEnd(textareaRef.current.selectionEnd);
    }
  }, []);

  const insertText = useCallback(
    (before: string, after: string = "") => {
      if (!textareaRef.current) return;

      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = value.substring(start, end);

      const newValue =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + before.length + selectedText.length + after.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [value, onChange]
  );

  const insertAtLineStart = useCallback(
    (prefix: string) => {
      if (!textareaRef.current) return;

      const start = textareaRef.current.selectionStart;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;

      const newValue =
        value.substring(0, lineStart) + prefix + value.substring(lineStart);

      onChange(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + prefix.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [value, onChange]
  );

  const insertNewLine = useCallback(
    (text: string) => {
      if (!textareaRef.current) return;

      const start = textareaRef.current.selectionStart;
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(start);

      // Add newline before if not at start of line
      const needsNewline = !beforeCursor.endsWith("\n") && beforeCursor.length > 0;

      const newValue =
        beforeCursor + (needsNewline ? "\n" : "") + text + "\n" + afterCursor;

      onChange(newValue);

      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + (needsNewline ? 1 : 0) + text.length + 1;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [value, onChange]
  );

  const toolbarButtons = [
    { icon: Bold, label: "Negrito", action: () => insertText("**", "**") },
    { icon: Italic, label: "Itálico", action: () => insertText("*", "*") },
    { type: "separator" },
    { icon: Heading2, label: "Título H2", action: () => insertAtLineStart("## ") },
    { icon: Heading3, label: "Título H3", action: () => insertAtLineStart("### ") },
    { type: "separator" },
    { icon: List, label: "Lista", action: () => insertAtLineStart("- ") },
    { icon: ListOrdered, label: "Lista Numerada", action: () => insertAtLineStart("1. ") },
    { type: "separator" },
    { icon: Quote, label: "Citação", action: () => insertAtLineStart("> ") },
    { icon: Lightbulb, label: "Verdade Dura", action: () => insertNewLine("💡 ") },
    { icon: AlertTriangle, label: "Alerta", action: () => insertNewLine("⚠️ ") },
    { icon: Pin, label: "Dica", action: () => insertNewLine("📌 ") },
    { type: "separator" },
    { icon: Link, label: "Link", action: () => insertText("[", "](url)") },
    { icon: Code, label: "Código", action: () => insertText("`", "`") },
  ];

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <TooltipProvider>
        <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 rounded-lg border">
          {toolbarButtons.map((button, index) => {
            if (button.type === "separator") {
              return <Separator key={index} orientation="vertical" className="h-6 mx-1" />;
            }

            const Icon = button.icon!;
            return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={button.action}
                    disabled={disabled}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{button.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="ml-auto text-xs text-muted-foreground">
            {wordCount} palavras • {readingTime} min de leitura
          </div>
        </div>
      </TooltipProvider>

      {/* Editor */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={updateSelection}
        onClick={updateSelection}
        onKeyUp={updateSelection}
        disabled={disabled}
        placeholder={placeholder || "Escreva seu conteúdo aqui..."}
        className="min-h-[400px] font-mono text-sm resize-y"
      />
    </div>
  );
}
