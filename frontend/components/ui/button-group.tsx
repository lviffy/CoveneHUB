import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface ButtonGroupContextValue {
  orientation: "horizontal" | "vertical"
}

const ButtonGroupContext = React.createContext<ButtonGroupContextValue | undefined>(
  undefined
)

const useButtonGroup = () => {
  const context = React.useContext(ButtonGroupContext)
  if (!context) {
    throw new Error("useButtonGroup must be used within a ButtonGroup")
  }
  return context
}

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <ButtonGroupContext.Provider value={{ orientation }}>
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center",
          orientation === "vertical" && "flex-col",
          className
        )}
        {...props}
      />
    </ButtonGroupContext.Provider>
  )
)
ButtonGroup.displayName = "ButtonGroup"

interface ButtonGroupSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}

const ButtonGroupSeparator = React.forwardRef<
  HTMLDivElement,
  ButtonGroupSeparatorProps
>(({ className, orientation, ...props }, ref) => {
  const groupContext = React.useContext(ButtonGroupContext)
  const finalOrientation = orientation || groupContext?.orientation || "vertical"

  return (
    <div
      ref={ref}
      className={cn(
        "bg-border",
        finalOrientation === "vertical"
          ? "h-6 w-px"
          : "h-px w-6",
        className
      )}
      {...props}
    />
  )
})
ButtonGroupSeparator.displayName = "ButtonGroupSeparator"

interface ButtonGroupTextProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
}

const ButtonGroupText = React.forwardRef<HTMLDivElement, ButtonGroupTextProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        ref={ref}
        className={cn(
          "flex items-center justify-center px-3 py-2 text-sm font-medium",
          className
        )}
        {...props}
      />
    )
  }
)
ButtonGroupText.displayName = "ButtonGroupText"

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText }
