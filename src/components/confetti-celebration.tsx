"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";

export function ConfettiCelebration() {
  const router = useRouter();
  const pathname = usePathname();
  const confettiRef = useRef<ConfettiRef>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("confetti-celebrate");
    if (!raw) return;
    sessionStorage.removeItem("confetti-celebrate");

    let msku = "";
    let ideaId = "";
    try {
      const data = JSON.parse(raw);
      msku = data.msku || "";
      ideaId = data.ideaId || "";
    } catch {
      msku = raw;
    }

    // Fire side cannons
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      if (Date.now() > end) return;
      confettiRef.current?.fire({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
      });
      confettiRef.current?.fire({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
      });

      requestAnimationFrame(frame);
    };
    frame();

    toast.success("🎉 Xin chúc mừng!", {
      description: "Sếp đã duyệt xong toàn bộ ý tưởng đang chờ.",
      action: ideaId
        ? {
            label: `Trở về ${msku}`,
            onClick: () => router.push(`/ideas/${ideaId}`),
          }
        : undefined,
      duration: 10000,
    });
  }, [router, pathname]);

  return (
    <Confetti
      ref={confettiRef}
      className="pointer-events-none fixed inset-0 z-[999999] h-full w-full"
      globalOptions={{ useWorker: false }}
      manualstart
    />
  );
}
