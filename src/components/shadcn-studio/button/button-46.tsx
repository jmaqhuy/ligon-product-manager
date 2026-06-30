import * as React from "react"
import { Button } from '@/components/ui/button'

export interface ButtonHeartbeatProps extends React.ComponentProps<"button"> {
  label?: React.ReactNode;
}

const ButtonHeartbeatEffect = ({ label = "Sửa đổi mới", className, ...props }: ButtonHeartbeatProps) => {
  return (
    <Button 
      variant='destructive' 
      className={`animate-heartbeat bg-destructive! dark:bg-destructive! text-white flex items-center gap-1.5 h-8 text-xs font-semibold px-2 ${className || ''}`}
      {...props}
    >
      <span className="relative flex h-2 w-2 mr-1">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      {label}
    </Button>
  )
}

export default ButtonHeartbeatEffect
