import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function MetricCard({
  icon,
  title,
  value,
  footNote,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  footNote?: string | React.ReactNode;
  iconColor?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-5 flex flex-col h-full">
        <div
          className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 ${
            iconColor || "bg-gray-100 text-gray-700"
          }`}
        >
          {icon}
        </div>
        <div className="text-xl font-semibold mb-1">{value}</div>
        <div className="text-[13px] text-gray-600 mb-2">{title}</div>
        {footNote ? (
          <div className="text-xs font-medium text-green-600">{footNote}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}