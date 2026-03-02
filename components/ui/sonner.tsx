 "use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--border-radius": "0.9rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast w-[min(92vw,22rem)] border border-[#C5B358]/40 bg-[#f9f7f2]/95 px-3.5 py-3 text-[#1c1917] shadow-lg shadow-[#C5B358]/20 backdrop-blur-sm",
          content: "text-left",
          title: "pr-6 text-[13px] font-semibold leading-5 text-stone-900 break-words",
          description:
            "mt-0.5 pr-6 text-xs leading-5 text-stone-600 break-words",
          actionButton:
            "bg-[#C5B358] text-white hover:bg-[#B3A24E] rounded-lg px-3 py-1.5 text-xs font-medium",
          closeButton:
            "text-stone-400 hover:text-stone-600 border-none bg-transparent",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
