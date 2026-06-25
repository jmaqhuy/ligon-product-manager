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

interface Topic {
  id: string;
  name: string;
}

export default function TopicsMetadataPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selection and edit states
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const fetchTopics = async () => {
    try {
      const { data } = await apiFetch("/api/topics");
      if (data) setTopics(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setEditName(topic.name);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedTopic(null);
    setIsEditing(false);
    setIsCreating(true);
    setNewName("");
  };

  const handleSaveEdit = async () => {
    if (!selectedTopic || !editName.trim()) return;
    setSaving(true);
    try {
      const { data } = await apiFetch("/api/topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTopic.id, name: editName }),
        successMessage: "Đã cập nhật chủ đề",
      });
      if (data) {
        setIsEditing(false);
        setTopics(topics.map(t => t.id === data.id ? data : t));
        setSelectedTopic(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data } = await apiFetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
        successMessage: "Đã tạo chủ đề mới",
      });
      if (data) {
        setIsCreating(false);
        setTopics([...topics, data].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedTopic(data);
        setEditName(data.name);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { data } = await apiFetch(`/api/topics?id=${id}`, { 
      method: "DELETE",
      successMessage: "Đã xoá chủ đề",
    });
    if (data) {
      setTopics(topics.filter(t => t.id !== id));
      if (selectedTopic?.id === id) {
        setSelectedTopic(null);
        setIsEditing(false);
      }
    }
  };

  const filteredTopics = topics.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-65px)] gap-4 p-4">
      {/* Master List */}
      <Card className="w-1/3 flex flex-col h-full overflow-hidden shrink-0">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chủ đề sản phẩm</CardTitle>
              <CardDescription>Quản lý các chủ đề cho ý tưởng</CardDescription>
            </div>
            <Button size="icon" variant="outline" onClick={handleStartCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Tìm kiếm chủ đề..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy chủ đề nào.</div>
          ) : (
            <div className="divide-y">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => handleSelect(topic)}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between ${
                    selectedTopic?.id === topic.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <span className="truncate">{topic.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail View */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedTopic && !isCreating ? (
          <>
            <CardHeader className="border-b flex flex-row items-center justify-between py-4">
              <CardTitle>Chi tiết Chủ đề</CardTitle>
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
                            Hành động này không thể hoàn tác. Nếu chủ đề này đang được sử dụng bởi các ý tưởng, bạn sẽ không thể xoá.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Huỷ</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(selectedTopic.id)}>Tiếp tục</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditName(selectedTopic.name); }}>
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
                  <Label>Tên Chủ đề</Label>
                  {isEditing ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md border">{selectedTopic.name}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </>
        ) : isCreating ? (
          <>
            <CardHeader className="border-b flex flex-row items-center justify-between py-4">
              <CardTitle>Tạo Chủ đề mới</CardTitle>
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
                  <Label>Tên Chủ đề <span className="text-destructive">*</span></Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nhập tên chủ đề..." autoFocus />
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p>Chọn một chủ đề bên trái để xem chi tiết</p>
          </div>
        )}
      </Card>
    </div>
  );
}
