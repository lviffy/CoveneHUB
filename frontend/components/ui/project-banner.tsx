import React from "react";
import clsx from "clsx";
import Link from "next/link";

interface ProjectBannerProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  callToAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export const ProjectBanner = ({
  label,
  icon,
  callToAction,
  className
}: ProjectBannerProps) => {
  return (
    <div className={clsx(
      "inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#C6BEF4] rounded-full px-4 py-2 shadow-sm",
      className
    )}>
      {icon && (
        <div className="flex items-center gap-1.5">
          {icon}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-gray-700 font-medium text-xs">{label}</span>
        {callToAction && (
          <>
            <span className="text-gray-400 text-xs">•</span>
            {callToAction.href ? (
              <Link
                href={callToAction.href}
                className="text-xs font-medium text-[#195ADC] underline underline-offset-2 decoration-[#195ADC] hover:text-[#378FFA] hover:decoration-[#378FFA] transition-colors duration-200"
              >
                {callToAction.label}
              </Link>
            ) : (
              <button
                onClick={callToAction.onClick}
                className="text-xs font-medium text-[#195ADC] underline underline-offset-2 decoration-[#195ADC] hover:text-[#378FFA] hover:decoration-[#378FFA] transition-colors duration-200"
              >
                {callToAction.label}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
