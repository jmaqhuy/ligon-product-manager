import { Button, buttonVariants } from '@/components/ui/button'
import { VariantProps } from 'class-variance-authority'
import { ArrowRightIcon } from 'lucide-react'
import * as React from "react"

export interface ButtonIconHoverProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  asChild?: boolean;
}

const ButtonIconHover = React.forwardRef<HTMLButtonElement, ButtonIconHoverProps>(
  ({ children, className = "", icon, asChild, ...props }, ref) => {
    return (
      <Button className={`group ${className}`} ref={ref} asChild={asChild} {...props}>
        {children}
        {icon ? (
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
            {icon}
          </span>
        ) : (
          <ArrowRightIcon className='transition-transform duration-200 group-hover:translate-x-0.5' />
        )}
      </Button>
    )
  }
)
ButtonIconHover.displayName = "ButtonIconHover"

export { ButtonIconHover }
