import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench } from "lucide-react";

export default function ToolsPage() {
  const tools = [
    { name: "Tool 1", description: "Dự phòng cho tiện ích nội bộ sau này" },
    { name: "Tool 2", description: "Dự phòng cho tiện ích nội bộ sau này" },
    { name: "Tool 3", description: "Dự phòng cho tiện ích nội bộ sau này" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý Tool</h1>
        <p className="text-muted-foreground text-sm">
          Các tiện ích nội bộ (sẽ được bổ sung sau)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tools.map((tool) => (
          <Card key={tool.name} className="border-dashed">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">{tool.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
