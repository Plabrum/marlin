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
            className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <LlmOrb size={32} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          Open assistant
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
