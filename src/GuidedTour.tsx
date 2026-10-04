import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import type { TourStep } from "./tour";

type GuidedTourProps = {
  step: TourStep;
  index: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onExit: () => void;
  onSkip: () => void;
  onRestart: () => void;
  dontShowAgain: boolean;
  onDontShowAgain: (checked: boolean) => void;
};

type Spotlight = { top: number; left: number; width: number; height: number };

export function GuidedTour({
  step,
  index,
  total,
  onBack,
  onNext,
  onExit,
  onSkip,
  onRestart,
  dontShowAgain,
  onDontShowAgain,
}: GuidedTourProps) {
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [tip, setTip] = useState({ top: 16, left: 16, width: 420 });
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(step.target);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }
  }, [step]);

  useEffect(() => {
    let animId: number;

    const update = () => {
      const target = document.querySelector<HTMLElement>(step.target);
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const PADDING = 16;
      const GAP = 16;
      const margin = 10;

      const isMobile = viewportW <= 640;
      const cardWidth = Math.min(420, viewportW - PADDING * 2);

      if (!target) {
        setSpotlight(null);
        setTip({
          top: Math.max(PADDING, (viewportH - 360) / 2),
          left: Math.max(PADDING, (viewportW - cardWidth) / 2),
          width: cardWidth,
        });
        return;
      }

      const rect = target.getBoundingClientRect();
      // Bounding box of the spotlighted element
      const highlighted: Spotlight = {
        top: Math.max(PADDING, rect.top - margin),
        left: Math.max(PADDING, rect.left - margin),
        width: Math.min(viewportW - PADDING * 2, rect.width + margin * 2),
        height: Math.min(viewportH - PADDING * 2, rect.height + margin * 2),
      };
      setSpotlight(highlighted);

      const cardEl = cardRef.current;
      const cardHeight = cardEl ? cardEl.getBoundingClientRect().height : 340;

      let top = PADDING;
      let left = PADDING;

      if (isMobile) {
        // Mobile layout: place card at top or bottom depending on target vertical center
        const targetCenterY = highlighted.top + highlighted.height / 2;
        if (targetCenterY < viewportH / 2) {
          top = viewportH - cardHeight - PADDING;
        } else {
          top = PADDING;
        }
        left = (viewportW - cardWidth) / 2;
      } else {
        // Desktop layout: find non-overlapping quadrant
        const spaceRight = viewportW - (highlighted.left + highlighted.width + GAP);
        const spaceLeft = highlighted.left - GAP;
        const spaceBelow = viewportH - (highlighted.top + highlighted.height + GAP);
        const spaceAbove = highlighted.top - GAP;

        if (spaceRight >= cardWidth + PADDING) {
          // Place to the Right
          left = highlighted.left + highlighted.width + GAP;
          top = highlighted.top + highlighted.height / 2 - cardHeight / 2;
        } else if (spaceLeft >= cardWidth + PADDING) {
          // Place to the Left
          left = highlighted.left - cardWidth - GAP;
          top = highlighted.top + highlighted.height / 2 - cardHeight / 2;
        } else if (spaceBelow >= cardHeight + PADDING) {
          // Place Below
          top = highlighted.top + highlighted.height + GAP;
          left = highlighted.left + highlighted.width / 2 - cardWidth / 2;
        } else if (spaceAbove >= cardHeight + PADDING) {
          // Place Above
          top = highlighted.top - cardHeight - GAP;
          left = highlighted.left + highlighted.width / 2 - cardWidth / 2;
        } else {
          // Fallback: Pick side with maximum space
          if (spaceBelow >= spaceAbove && spaceBelow >= spaceRight && spaceBelow >= spaceLeft) {
            top = highlighted.top + highlighted.height + GAP;
            left = (viewportW - cardWidth) / 2;
          } else if (spaceAbove >= spaceRight && spaceAbove >= spaceLeft) {
            top = highlighted.top - cardHeight - GAP;
            left = (viewportW - cardWidth) / 2;
          } else if (spaceRight >= spaceLeft) {
            left = highlighted.left + highlighted.width + GAP;
            top = (viewportH - cardHeight) / 2;
          } else {
            left = highlighted.left - cardWidth - GAP;
            top = (viewportH - cardHeight) / 2;
          }
        }
      }

      // Strict anti-overlap check: if card rectangle overlaps target rectangle, nudge it completely outside
      const overlapsX = left < highlighted.left + highlighted.width && left + cardWidth > highlighted.left;
      const overlapsY = top < highlighted.top + highlighted.height && top + cardHeight > highlighted.top;

      if (overlapsX && overlapsY) {
        if (highlighted.top - cardHeight - GAP >= PADDING) {
          top = highlighted.top - cardHeight - GAP;
        } else if (highlighted.top + highlighted.height + GAP + cardHeight <= viewportH - PADDING) {
          top = highlighted.top + highlighted.height + GAP;
        } else if (highlighted.left - cardWidth - GAP >= PADDING) {
          left = highlighted.left - cardWidth - GAP;
        } else if (highlighted.left + highlighted.width + GAP + cardWidth <= viewportW - PADDING) {
          left = highlighted.left + highlighted.width + GAP;
        }
      }

      // Clamp strictly within viewport
      top = Math.max(PADDING, Math.min(top, viewportH - cardHeight - PADDING));
      left = Math.max(PADDING, Math.min(left, viewportW - cardWidth - PADDING));

      setTip({ top, left, width: cardWidth });
    };

    // Run continuous animation loop to smoothly track target during scroll, transition & tab rendering
    const loop = () => {
      update();
      animId = window.requestAnimationFrame(loop);
    };
    animId = window.requestAnimationFrame(loop);

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit();
      const target = event.target;
      const isEditing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (!isEditing && event.key === "ArrowRight") onNext();
      if (!isEditing && event.key === "ArrowLeft" && index > 0) onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, onBack, onExit, onNext]);

  return (
    <div className="tour-layer" aria-label="Guided product tour">
      <svg className="tour-spotlight" aria-hidden="true" width="100%" height="100%">
        {spotlight && (
          <path
            fillRule="evenodd"
            d={`M 0,0 H ${window.innerWidth} V ${window.innerHeight} H 0 Z M ${spotlight.left},${spotlight.top} h ${spotlight.width} v ${spotlight.height} h -${spotlight.width} Z`}
          />
        )}
      </svg>
      <section
        className="tour-card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        tabIndex={-1}
        ref={cardRef}
        style={{ top: tip.top, left: tip.left, width: tip.width }}
      >
        <div className="tour-card-top">
          <span>JALRAKSHAK AI · GUIDED WALKTHROUGH</span>
          <button type="button" aria-label="Exit guided tour" onClick={onExit}>
            <X size={20} />
          </button>
        </div>
        <div className="tour-progress-copy">
          <strong>Stage {index + 1} of {total}</strong>
          <span>{Math.round(((index + 1) / total) * 100)}%</span>
        </div>
        <div
          className="tour-progress-track"
          role="progressbar"
          aria-label="Tour progress"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <i style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.description}</p>
        <label className="tour-suppress">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => onDontShowAgain(event.currentTarget.checked)}
          />
          Don’t show this welcome screen automatically again
        </label>
        <div className="tour-controls">
          <button className="tour-text-button" type="button" onClick={onSkip}>
            Skip tour
          </button>
          <button className="tour-text-button tour-exit" type="button" onClick={onExit}>
            Exit
          </button>
          <span className="tour-control-spacer" />
          {index > 0 && (
            <button className="tour-back" type="button" onClick={onBack}>
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <button className="tour-next" type="button" onClick={onNext}>
            {index === total - 1 ? "Finish tour" : "Next"}
            <ChevronRight size={18} />
          </button>
        </div>
        <button className="tour-restart" type="button" onClick={onRestart}>
          <RotateCcw size={15} /> Restart from stage 1
        </button>
      </section>
    </div>
  );
}

export function TourCompletion({ onRestart, onDashboard }: { onRestart: () => void; onDashboard: () => void }) {
  return (
    <div className="tour-welcome-backdrop">
      <section className="tour-completion" role="dialog" aria-modal="true" aria-labelledby="tour-complete-title">
        <span className="tour-complete-icon">
          <Check size={32} />
        </span>
        <span className="tour-eyebrow">WORKFLOW COMPLETE</span>
        <h2 id="tour-complete-title">Evidence to action, transparently.</h2>
        <p>You’ve explored all ten stages. Demo examples remain labelled as simulated; connected analysis is only available when a backend responds successfully.</p>
        <div className="tour-completion-actions">
          <button className="tour-welcome-secondary" type="button" onClick={onRestart}>
            <RotateCcw size={18} /> Restart walkthrough
          </button>
          <button className="tour-welcome-primary" type="button" onClick={onDashboard}>
            Return to dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
