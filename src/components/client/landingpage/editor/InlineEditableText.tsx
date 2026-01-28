import { useState, useRef, useEffect, createElement, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type TextElement = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';

interface InlineEditableTextProps {
  value: string;
  onChange: (value: string) => void;
  as?: TextElement;
  className?: string;
  placeholder?: string;
  canEdit: boolean;
  multiline?: boolean;
}

export function InlineEditableText({
  value,
  onChange,
  as: Component = 'p',
  className,
  placeholder = 'Clique para editar...',
  canEdit,
  multiline = false
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const elementRef = useRef<HTMLElement>(null);

  // Sync local value when prop changes externally
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    if (!canEdit) return;
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newValue = elementRef.current?.textContent || '';
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Enter saves (unless multiline is allowed)
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      elementRef.current?.blur();
    }
    // Escape reverts
    if (e.key === 'Escape') {
      setLocalValue(value);
      if (elementRef.current) {
        elementRef.current.textContent = value;
      }
      elementRef.current?.blur();
    }
  };

  // Non-editable mode - just render the text
  if (!canEdit) {
    return createElement(Component, { className }, value || placeholder);
  }

  return createElement(
    Component,
    {
      ref: elementRef,
      className: cn(
        className,
        "outline-none cursor-text transition-all duration-200",
        "focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:rounded-sm",
        isEditing && "bg-primary/5",
        !localValue && !isEditing && "text-muted-foreground/50 italic"
      ),
      contentEditable: true,
      suppressContentEditableWarning: true,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      "data-placeholder": placeholder,
      style: {
        minWidth: '20px',
        minHeight: '1em',
      },
    },
    localValue || (isEditing ? '' : placeholder)
  );
}
