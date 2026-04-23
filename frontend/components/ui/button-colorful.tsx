import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface ButtonColorfulProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
}

function ButtonColorful({
    className,
    label = "Explore Components",
    ...props
}: ButtonColorfulProps) {
    return (
        <Button
            className={cn(
                "relative h-10 px-4 overflow-hidden",
                "bg-[#010101]",
                "transition-all duration-200",
                "group",
                className
            )}
            {...props}
        >
            {/* ConveneHub gradient background effect - using brand colors */}
            <div
                className={cn(
                    "absolute inset-0",
                    "bg-gradient-to-r from-[#195ADC] via-[#7F56D9] to-[#378FFA]",
                    "opacity-40 group-hover:opacity-80",
                    "blur transition-opacity duration-500"
                )}
            />

            {/* Content */}
            <div className="relative flex items-center justify-center gap-2">
                <span className="text-white">{label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-white/90" />
            </div>
        </Button>
    );
}

export { ButtonColorful };
