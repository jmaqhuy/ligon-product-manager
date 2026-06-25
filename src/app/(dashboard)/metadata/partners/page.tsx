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

interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  googleSheetUrl: string | null;
}

export default function PartnersMetadataPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Partner>>({});
  const [saving, setSaving] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [newData, setNewData] = useState<Partial<Partner>>({});

  const fetchPartners = async () => {
    try {
      const { data } = await apiFetch("/api/partners");
      if (data) setPartners(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleSelect = (partner: Partner) => {
    setSelectedPartner(partner);
    setEditData(partner);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setSelectedPartner(null);
    setIsEditing(false);
    setIsCreating(true);
    setNewData({ name: "", email: "", phone: "", address: "", googleSheetUrl: "" });
  };

  const handleSaveEdit = async () => {
    if (!selectedPartner || !editData.name?.trim()) {
      toast.error("Tên đối tác không được để trống");
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiFetch("/api/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editData, id: selectedPartner.id }),
        successMessage: "Đã cập nhật Đối tác",
      });
      if (data) {
        setIsEditing(false);
        setPartners(partners.map(p => p.id === data.id ? data : p));
        setSelectedPartner(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNew = async () => {
    if (!newData.name?.trim()) {
      toast.error("Tên đối tác không được để trống");
      return;
    }
    setSaving(true);
    try {
      const { data } = await apiFetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
        successMessage: "Đã tạo Đối tác mới",
      });
      if (data) {
        setIsCreating(false);
        setPartners([...partners, data].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedPartner(data);
        setEditData(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { data } = await apiFetch(`/api/partners?id=${id}`, { 
      method: "DELETE",
      successMessage: "Đã xoá Đối tác",
    });
    if (data) {
      setPartners(partners.filter(p => p.id !== id));
      if (selectedPartner?.id === id) {
        setSelectedPartner(null);
        setIsEditing(false);
      }
    }
  };

  const filteredPartners = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-65px)] gap-4 p-4">
      <Card className="w-1/3 flex flex-col h-full overflow-hidden shrink-0">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Đối tác</CardTitle>
              <CardDescription>Quản lý các nhà cung cấp/đối tác</CardDescription>
            </div>
            <Button size="icon" variant="outline" onClick={handleStartCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Tìm kiếm đối tác..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Đang tải...</div>
          ) : filteredPartners.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy đối tác nào.</div>
          ) : (
            <div className="divide-y">
              {filteredPartners.map((partner) => (
                <div
                  key={partner.id}
                  onClick={() => handleSelect(partner)}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors flex flex-col justify-center ${
                    selectedPartner?.id === partner.id ? "bg-muted" : ""
                  }`}
                >
                  <span className={`truncate ${selectedPartner?.id === partner.id ? "font-medium" : ""}`}>{partner.name}</span>
                  {partner.email && <span className="text-xs text-muted-foreground truncate">{partner.email}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedPartner && !isCreating ? (
          <>
            <CardHeader className="border-b flex flex-row items-center justify-between py-4">
              <CardTitle>Chi tiết Đối tác</CardTitle>
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
                            Hành động này không thể hoàn tác. Nếu đối tác này đang có ý tưởng, bạn sẽ không thể xoá.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Huỷ</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(selectedPartner.id)}>Tiếp tục</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditData(selectedPartner); }}>
                      <X className="h-4 w-4 mr-2" /> Huỷ
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Lưu
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Tên Đối tác <span className="text-destructive">*</span></Label>
                  {isEditing ? (
                    <Input value={editData.name || ""} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md border min-h-9">{selectedPartner.name}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input value={editData.email || ""} onChange={(e) => setEditData({...editData, email: e.target.value})} />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md border min-h-9">{selectedPartner.email || "-"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  {isEditing ? (
                    <Input value={editData.phone || ""} onChange={(e) => setEditData({...editData, phone: e.target.value})} />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md border min-h-9">{selectedPartner.phone || "-"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Địa chỉ</Label>
                  {isEditing ? (
                    <Input value={editData.address || ""} onChange={(e) => setEditData({...editData, address: e.target.value})} />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md border min-h-9">{selectedPartner.address || "-"}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Google Sheet URL</Label>
                  {isEditing ? (
                    <Input value={editData.googleSheetUrl || ""} onChange={(e) => setEditData({...editData, googleSheetUrl: e.target.value})} />
                  ) : (
                    <div className="p-2 bg-muted/50 rounded-md border min-h-9 overflow-hidden text-ellipsis whitespace-nowrap">
                      {selectedPartner.googleSheetUrl ? (
                        <a href={selectedPartner.googleSheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {selectedPartner.googleSheetUrl}
                        </a>
                      ) : "-"}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </>
        ) : isCreating ? (
          <>
            <CardHeader className="border-b flex flex-row items-center justify-between py-4">
              <CardTitle>Tạo Đối tác mới</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                  <X className="h-4 w-4 mr-2" /> Huỷ
                </Button>
                <Button size="sm" onClick={handleSaveNew} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Lưu mới
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>Tên Đối tác <span className="text-destructive">*</span></Label>
                  <Input value={newData.name || ""} onChange={(e) => setNewData({...newData, name: e.target.value})} placeholder="Công ty ABC..." autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={newData.email || ""} onChange={(e) => setNewData({...newData, email: e.target.value})} placeholder="contact@..." />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input value={newData.phone || ""} onChange={(e) => setNewData({...newData, phone: e.target.value})} placeholder="09..." />
                </div>
                <div className="space-y-2">
                  <Label>Địa chỉ</Label>
                  <Input value={newData.address || ""} onChange={(e) => setNewData({...newData, address: e.target.value})} placeholder="Hà Nội" />
                </div>
                <div className="space-y-2">
                  <Label>Google Sheet URL</Label>
                  <Input value={newData.googleSheetUrl || ""} onChange={(e) => setNewData({...newData, googleSheetUrl: e.target.value})} placeholder="https://docs.google.com/..." />
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
            <Search className="h-8 w-8 text-muted-foreground/50" />
            <p>Chọn một đối tác bên trái để xem chi tiết</p>
          </div>
        )}
      </Card>
    </div>
  );
}
