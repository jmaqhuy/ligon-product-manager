"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export default function RulesMetadataPage() {
  const [rules, setRules] = useState<{ idea_title_max_length: string; idea_prompt_max_length: string }>({
    idea_title_max_length: "75",
    idea_prompt_max_length: "500",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    const { data } = await apiFetch("/api/metadata/rules");
    if (data) {
      setRules({
        idea_title_max_length: data.idea_title_max_length || "75",
        idea_prompt_max_length: data.idea_prompt_max_length || "500",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data } = await apiFetch("/api/metadata/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: rules }),
      successMessage: "Lưu cấu hình thành công",
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quy tắc hệ thống</h1>
        <p className="text-muted-foreground">
          Cấu hình các quy tắc xác thực dữ liệu (Validation Rules) chung cho toàn hệ thống.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quy tắc Ý tưởng (Ideas)</CardTitle>
          <CardDescription>Các ràng buộc dữ liệu khi nhân viên tạo mới ý tưởng</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titleLength">Độ dài tối đa của Tiêu đề (ký tự)</Label>
            <Input 
              id="titleLength" 
              type="number" 
              value={rules.idea_title_max_length} 
              onChange={(e) => setRules(prev => ({ ...prev, idea_title_max_length: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="promptLength">Độ dài tối đa của Prompt (ký tự)</Label>
            <Input 
              id="promptLength" 
              type="number" 
              value={rules.idea_prompt_max_length} 
              onChange={(e) => setRules(prev => ({ ...prev, idea_prompt_max_length: e.target.value }))}
            />
          </div>
          
          <Button onClick={handleSave} disabled={saving} className="mt-4">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu thay đổi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
