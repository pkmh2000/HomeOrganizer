import { useState, useCallback, useRef } from 'react';
import { InventoryNode } from '../types';

export interface UndoStep {
  nodes: InventoryNode[];
  description: string;
  timestamp: number;
}

export function useUndoHistory(maxSteps: number = 20) {
  const [undoStack, setUndoStack] = useState<UndoStep[]>([]);
  const [redoStack, setRedoStack] = useState<UndoStep[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Record a history checkpoint before modifying data
  const recordHistory = useCallback(
    (currentNodes: InventoryNode[], description: string) => {
      // Clone deeply to avoid mutation
      const snapshot = JSON.parse(JSON.stringify(currentNodes));
      setUndoStack((prev) => {
        const nextStack = [...prev, { nodes: snapshot, description, timestamp: Date.now() }];
        if (nextStack.length > maxSteps) {
          return nextStack.slice(nextStack.length - maxSteps);
        }
        return nextStack;
      });
      setRedoStack([]); // Clear redo upon new action

      // Show friendly snackbar toast with undo prompt
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastMessage(description);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    },
    [maxSteps]
  );

  // Undo the last action
  const undo = useCallback(
    (currentNodes: InventoryNode[]): InventoryNode[] | null => {
      if (undoStack.length === 0) return null;

      const lastStep = undoStack[undoStack.length - 1];
      const remainingUndo = undoStack.slice(0, undoStack.length - 1);

      // Save current state to redo
      const currentSnapshot = JSON.parse(JSON.stringify(currentNodes));
      setRedoStack((prev) => [...prev, { nodes: currentSnapshot, description: lastStep.description, timestamp: Date.now() }]);
      setUndoStack(remainingUndo);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastMessage(`已復原：${lastStep.description}`);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 4000);

      return lastStep.nodes;
    },
    [undoStack]
  );

  // Redo
  const redo = useCallback(
    (currentNodes: InventoryNode[]): InventoryNode[] | null => {
      if (redoStack.length === 0) return null;

      const nextStep = redoStack[redoStack.length - 1];
      const remainingRedo = redoStack.slice(0, redoStack.length - 1);

      const currentSnapshot = JSON.parse(JSON.stringify(currentNodes));
      setUndoStack((prev) => [...prev, { nodes: currentSnapshot, description: nextStep.description, timestamp: Date.now() }]);
      setRedoStack(remainingRedo);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastMessage(`已重做：${nextStep.description}`);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 4000);

      return nextStep.nodes;
    },
    [redoStack]
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(null);
  }, []);

  return {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    lastActionDescription: undoStack[undoStack.length - 1]?.description || null,
    toastMessage,
    recordHistory,
    undo,
    redo,
    dismissToast,
  };
}
