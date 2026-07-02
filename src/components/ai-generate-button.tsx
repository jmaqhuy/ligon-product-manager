'use client'

import React from 'react'
import * as motion from 'motion/react-client'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { Loader2, Sparkles } from 'lucide-react'

interface AIGenerateButtonProps {
  isGenerating: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const AIGenerateButton = ({ isGenerating, onClick, disabled }: AIGenerateButtonProps) => {
  return (
    <motion.div 
      whileTap={!isGenerating && !disabled ? { scale: 0.88 } : {}} 
      whileHover={!isGenerating && !disabled ? { scale: 1.02 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`inline-block ${isGenerating ? 'pointer-events-none opacity-85' : ''}`}
    >
      <RainbowButton
        className="transition-none active:translate-y-0 h-7 px-3 text-xs font-semibold w-full shadow-sm cursor-pointer border-0"
        onClick={onClick}
        disabled={isGenerating || disabled}
        type="button"
      >
        {isGenerating ? (
          <span className="flex items-center gap-1.5 text-primary-foreground tracking-wide">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            AI đang viết bài...
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-primary-foreground tracking-wide">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Tạo bằng AI
          </span>
        )}
      </RainbowButton>
    </motion.div>
  )
}

