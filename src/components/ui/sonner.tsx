import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-[#7b572e] bg-[linear-gradient(180deg,rgba(36,24,15,0.98)_0%,rgba(24,16,10,0.98)_100%)] text-[#f5dfb0] shadow-[0_18px_45px_rgba(0,0,0,0.42)]",
          title: "text-[#f8e8bf] font-black tracking-[0.02em]",
          description: "text-[#d8c39b]",
          actionButton: "bg-[#8c531f] text-[#f8e8bf] hover:bg-[#a66726]",
          cancelButton: "bg-[#2d2118] text-[#d8c39b] hover:bg-[#39291d]",
          success: "!border-[#5b7a39]",
          error: "!border-[#8d4039]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
