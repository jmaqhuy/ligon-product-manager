"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Edit2, Save, X, Loader2, Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AiModel {
  id: string;
  name: string;
}

export default function AiModelsMetadataPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedModel, setSelectedModel] = useState<AiModel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchModels = async () => {
    try {
      const { data } = await apiFetch("/api/ai-models");
      if (data) setModels(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSelect = (model: AiModel) => {
    setSelectedModel(model);
    setEditName(model.name);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedModel(null);
    setIsEditing(false);
    setIsCreating(true);
    setNewName("");
  };

  const handleSaveEdit = async () => {
    if (!selectedModel || !editName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await apiFetch("/api/ai-models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedModel.id, name: editName }),
        successMessage: "Đã cập nhật AI Model",
      });
      if (data) {
        setIsEditing(false);
        setModels(models.map(m => m.id === data.id ? data : m));
        setSelectedModel(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await apiFetch("/api/ai-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
        successMessage: "Đã tạo AI Model mới",
      });
      if (data) {
        setIsCreating(false);
        setModels([...models, data].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedModel(data);
        setEditName(data.name);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { data } = await apiFetch(`/api/ai-models?id=${id}`, { 
      method: "DELETE",
      successMessage: "Đã xoá AI Model",
    });
    if (data) {
      setModels(models.filter(m => m.id !== id));
      if (selectedModel?.id === id) {
        setSelectedModel(null);
        setIsEditing(false);
      }
    }
  };

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-65px)] gap-4 p-4">
      <Card className="w-1/3 flex flex-col h-full overflow-hidden shrink-0">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Models</CardTitle>
              <CardDescription>Quản lý các AI Model</CardDescription>
            </div>
            <Button size="icon" variant="outline" onClick={handleStartCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Tìm kiếm AI Model..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : filteredModels.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy AI Model nào.</div>
          ) : (
            <div className="divide-y">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between ${
                    selectedModel?.id === model.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <span className="truncate">{model.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedModel && !isCreating ? (
          <>
            <CardHeader className="border-b flex flex-row items-center justify-between py-4">
              <CardTitle>Chi tiết AI Model</CardTitle>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-4 w-4 mr-2" /> Sửa
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" /> Xoá
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Xác nhận xoá?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Nếu model này đang được sử dụng bởi các ý tưởng, bạn sẽ không thể xoá.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Huỷ</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(selectedModel.id)}>Tiếp tục</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditName(selectedModel.name); }}>
                      <X className="h-4 w-4 mr-2" /> Huỷ
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Lưu
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Tên AI Model</Label>
                  {isEditing ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md border">{selectedModel.name}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </>
        ) : isCreating ? (
          <>
            <CardHeader className="border-b flex flex-row items-center justify-between py-4">
              <CardTitle>Tạo AI Model mới</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                  <X className="h-4 w-4 mr-2" /> Huỷ
                </Button>
                <Button size="sm" onClick={handleSaveNew} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Lưu mới
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Tên AI Model <span className="text-destructive">*</span></Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nhập tên AI Model..." autoFocus />
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p>Chọn một AI Model bên trái để xem chi tiết</p>
          </div>
        )}
      </Card>
    </div>
  );
}
