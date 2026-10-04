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
      const highlighted: Spotlight = {
        top: Math.max(0, rect.top - margin),
        left: Math.max(0, rect.left - margin),
        width: Math.min(viewportW, rect.width + margin * 2),
        height: Math.min(viewportH, rect.height + margin * 2),
      };
      setSpotlight(highlighted);

      const cardEl = cardRef.current;
      const cardHeight = cardEl ? cardEl.getBoundingClientRect().height : 340;

      const checkOverlap = (t: number, l: number, w: number, h: number, target: Spotlight) => {
        return l < target.left + target.width && l + w > target.left && t < target.top + target.height && t + h > target.top;
      };

      const clampX = (val: number) => Math.max(PADDING, Math.min(val, viewportW - cardWidth - PADDING));
      const clampY = (val: number) => Math.max(PADDING, Math.min(val, viewportH - cardHeight - PADDING));

      let finalTop = PADDING;
      let finalLeft = PADDING;
      let foundPlacement = false;

      if (!isMobile) {
        // Candidate 1: Below
        const candBelowTop = highlighted.top + highlighted.height + GAP;
        const candBelowLeft = clampX(highlighted.left);
        if (candBelowTop + cardHeight <= viewportH - PADDING && !checkOverlap(candBelowTop, candBelowLeft, cardWidth, cardHeight, highlighted)) {
          finalTop = candBelowTop;
          finalLeft = candBelowLeft;
          foundPlacement = true;
        }

        // Candidate 2: Above
        if (!foundPlacement) {
          const candAboveTop = highlighted.top - cardHeight - GAP;
          const candAboveLeft = clampX(highlighted.left);
          if (candAboveTop >= PADDING && !checkOverlap(candAboveTop, candAboveLeft, cardWidth, cardHeight, highlighted)) {
            finalTop = candAboveTop;
            finalLeft = candAboveLeft;
            foundPlacement = true;
          }
        }

        // Candidate 3: Right
        if (!foundPlacement) {
          const candRightLeft = highlighted.left + highlighted.width + GAP;
          const candRightTop = clampY(highlighted.top);
          if (candRightLeft + cardWidth <= viewportW - PADDING && !checkOverlap(candRightTop, candRightLeft, cardWidth, cardHeight, highlighted)) {
            finalTop = candRightTop;
            finalLeft = candRightLeft;
            foundPlacement = true;
          }
        }

        // Candidate 4: Left
        if (!foundPlacement) {
          const candLeftLeft = highlighted.left - cardWidth - GAP;
          const candLeftTop = clampY(highlighted.top);
          if (candLeftLeft >= PADDING && !checkOverlap(candLeftTop, candLeftLeft, cardWidth, cardHeight, highlighted)) {
            finalTop = candLeftTop;
            finalLeft = candLeftLeft;
            foundPlacement = true;
          }
        }
      }

      // Fallback placement when element is huge (e.g. Map area or large panel) or on mobile
      if (!foundPlacement) {
        const corners = [
          // Bottom-Right
          { top: clampY(viewportH - cardHeight - PADDING), left: clampX(viewportW - cardWidth - PADDING) },
          // Top-Right
          { top: clampY(80), left: clampX(viewportW - cardWidth - PADDING) },
          // Bottom-Left
          { top: clampY(viewportH - cardHeight - PADDING), left: clampX(PADDING) },
          // Top-Left
          { top: clampY(80), left: clampX(PADDING) }
        ];

        let minOverlapArea = Infinity;
        let bestCorner = corners[0];

        for (const corner of corners) {
          const overlapW = Math.max(0, Math.min(corner.left + cardWidth, highlighted.left + highlighted.width) - Math.max(corner.left, highlighted.left));
          const overlapH = Math.max(0, Math.min(corner.top + cardHeight, highlighted.top + highlighted.height) - Math.max(corner.top, highlighted.top));
          const overlapArea = overlapW * overlapH;

          if (overlapArea < minOverlapArea) {
            minOverlapArea = overlapArea;
            bestCorner = corner;
          }
        }

        finalTop = bestCorner.top;
        finalLeft = bestCorner.left;
      }

      setTip({ top: finalTop, left: finalLeft, width: cardWidth });
    };

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
