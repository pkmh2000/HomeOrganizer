import { useEffect, useRef } from 'react';

interface MobileBackGestureOptions {
  hasOpenModal: boolean;
  onCloseTopModal: () => void;
  currentContainerId: string | null;
  onNavigateUp: () => void;
  onShowToast: (message: string) => void;
}

/**
 * Mobile Back Gesture & Hardware Back Button Controller
 * Intercepts mobile edge-swipe back & back button:
 * 1. Closes open modal / lightbox / editor instead of exiting app.
 * 2. Navigates up to parent container if inside a folder.
 * 3. Prevents accidental app exit with double-tap protection at root.
 */
export function useMobileBackGesture({
  hasOpenModal,
  onCloseTopModal,
  currentContainerId,
  onNavigateUp,
  onShowToast,
}: MobileBackGestureOptions) {
  const lastExitAttemptRef = useRef<number>(0);
  const isNavigatingRef = useRef<boolean>(false);

  // Keep latest handlers in refs to avoid re-binding popstate listener constantly
  const handlersRef = useRef({
    hasOpenModal,
    onCloseTopModal,
    currentContainerId,
    onNavigateUp,
    onShowToast,
  });

  useEffect(() => {
    handlersRef.current = {
      hasOpenModal,
      onCloseTopModal,
      currentContainerId,
      onNavigateUp,
      onShowToast,
    };
  }, [hasOpenModal, onCloseTopModal, currentContainerId, onNavigateUp, onShowToast]);

  useEffect(() => {
    // Seed initial history state so we have a cushion to intercept back gesture
    try {
      if (!window.history.state || window.history.state.homeorganizer !== true) {
        window.history.replaceState({ homeorganizer: true, level: 0 }, '');
        window.history.pushState({ homeorganizer: true, level: 1 }, '');
      }
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      if (isNavigatingRef.current) return;

      const { hasOpenModal, onCloseTopModal, currentContainerId, onNavigateUp, onShowToast } =
        handlersRef.current;

      // Case 1: A modal, lightbox, intake, scanner or gallery is open -> Close it!
      if (hasOpenModal) {
        onCloseTopModal();
        // Re-push history cushion so future backs can be caught
        window.history.pushState({ homeorganizer: true, level: 1 }, '');
        return;
      }

      // Case 2: User is drilled down inside a container -> Navigate up to parent/root!
      if (currentContainerId !== null) {
        onNavigateUp();
        window.history.pushState({ homeorganizer: true, level: 1 }, '');
        return;
      }

      // Case 3: At root level with no modal -> Double back to exit protection
      const now = Date.now();
      if (now - lastExitAttemptRef.current < 2500) {
        // User confirmed exit by swiping back twice quickly
        return;
      }

      lastExitAttemptRef.current = now;
      window.history.pushState({ homeorganizer: true, level: 1 }, '');
      onShowToast('👋 再滑動/按一次返回即可離開收納管家');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
