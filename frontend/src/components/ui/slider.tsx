'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="border-border/80 bg-background relative h-3 w-full grow overflow-hidden rounded-full border shadow-inner"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-primary absolute h-full rounded-full"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="border-primary bg-background focus-visible:ring-ring/40 block size-5 rounded-full border-2 shadow-md transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:outline-none data-[disabled]:pointer-events-none"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
