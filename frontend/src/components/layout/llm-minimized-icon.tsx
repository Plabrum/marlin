import { LlmOrb } from "@/components/ui/loading-orb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  isOpen: boolean;
  onOpen: () => void;
};

export function LlmMinimizedIcon({ isOpen, onOpen }: Props) {
  if (isOpen) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onOpen}
            aria-label="Open assistant"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 h-8 px-6 rounded-full bg-background border border-border shadow-lg flex items-center hover:scale-105 active:scale-95 transition-transform"
          >
            <LlmOrb size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Open assistant
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
