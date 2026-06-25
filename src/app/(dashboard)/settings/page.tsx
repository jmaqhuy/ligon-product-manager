"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ImagePreviewInput } from "@/components/image-preview-input";
import {
  User,
  Shield,
  Palette,
  Monitor,
  Moon,
  Sun,
  Loader2,
  Check,
  Info,
  BellRing,
  Camera,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { roleLabels } from "@/types";
import type { Role } from "@/lib/permissions";
import { apiFetch } from "@/lib/api-client";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Settings state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({
    new_idea: true,
    idea_approved: true,
    idea_rejected: true,
    photo_requested: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => { 
    setMounted(true);
    if (session?.user) {
      setAvatarUrl(session.user.avatarUrl || "");
      if (session.user.notificationSettings) {
        try {
          setNotificationSettings(JSON.parse(session.user.notificationSettings));
        } catch {}
      }
    }
  }, [session]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data } = await apiFetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl,
          notificationSettings,
        }),
        successMessage: "Đã lưu thông tin tài khoản",
      });

      if (data) {
        await updateSession();
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới phải ít nhất 8 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setChangingPassword(true);
    try {
      const { data } = await apiFetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        successMessage: "Đổi mật khẩu thành công!",
      });

      if (data) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const user = session?.user;
  const role = user?.role as Role | undefined;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground text-sm">
          Quản lý tài khoản và tuỳ chỉnh giao diện
        </p>
      </div>

      {/* Profile Info & Avatar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Thông tin cá nhân
            </CardTitle>
            <CardDescription>Cập nhật ảnh đại diện và xem thông tin</CardDescription>
          </div>
          <Button onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Lưu thay đổi
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-6 items-start">
            <div className="w-32 shrink-0">
              <ImagePreviewInput
                value={avatarUrl}
                onChange={setAvatarUrl}
                placeholder="Link Avatar (Square)"
                className="w-32 h-32 rounded-full aspect-square object-cover"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Họ tên</Label>
              <p className="text-sm font-medium">{user?.fullName || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{user?.email || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tên viết tắt</Label>
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">
                {user?.nameAbbreviation || "—"}
              </code>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Chức vụ</Label>
              <div>
                {role && (
                  <Badge variant="outline">{roleLabels[role] || role}</Badge>
                )}
              </div>
            </div>
          </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Để thay đổi thông tin cá nhân hoặc chức vụ, vui lòng liên hệ quản lý.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Cài đặt thông báo (Real-time)
          </CardTitle>
          <CardDescription>Chọn loại thông báo bạn muốn nhận Pop-up (Sonner)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Label className="text-sm font-medium">Ý tưởng mới</Label>
              <p className="text-xs text-muted-foreground">Khi nhân viên tạo một ý tưởng mới</p>
            </div>
            <Switch
              checked={notificationSettings.new_idea}
              onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, new_idea: c })}
            />
          </div>
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Label className="text-sm font-medium">Ý tưởng được duyệt / từ chối</Label>
              <p className="text-xs text-muted-foreground">Khi ý tưởng của bạn được Sếp phản hồi</p>
            </div>
            <Switch
              checked={notificationSettings.idea_approved}
              onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, idea_approved: c })}
            />
          </div>
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Label className="text-sm font-medium">Yêu cầu sửa đổi</Label>
              <p className="text-xs text-muted-foreground">Khi ý tưởng cần sửa đổi</p>
            </div>
            <Switch
              checked={notificationSettings.idea_rejected}
              onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, idea_rejected: c })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Yêu cầu làm ảnh/file</Label>
              <p className="text-xs text-muted-foreground">Khi ý tưởng được chuyển sang bước sản xuất ảnh</p>
            </div>
            <Switch
              checked={notificationSettings.photo_requested}
              onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, photo_requested: c })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Giao diện
          </CardTitle>
          <CardDescription>Chọn chế độ hiển thị</CardDescription>
        </CardHeader>
        <CardContent>
          {mounted && (
            <RadioGroup
              value={theme || "system"}
              onValueChange={setTheme}
              className="grid grid-cols-3 gap-3"
            >
              <Label
                htmlFor="theme-light"
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer hover:border-primary transition-colors ${theme === "light" ? "border-primary bg-primary/5" : ""
                  }`}
              >
                <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                <Sun className="h-5 w-5" />
                <span className="text-sm font-medium">Sáng</span>
                {theme === "light" && <Check className="h-4 w-4 text-primary" />}
              </Label>

              <Label
                htmlFor="theme-dark"
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer hover:border-primary transition-colors ${theme === "dark" ? "border-primary bg-primary/5" : ""
                  }`}
              >
                <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                <Moon className="h-5 w-5" />
                <span className="text-sm font-medium">Tối</span>
                {theme === "dark" && <Check className="h-4 w-4 text-primary" />}
              </Label>

              <Label
                htmlFor="theme-system"
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer hover:border-primary transition-colors ${theme === "system" ? "border-primary bg-primary/5" : ""
                  }`}
              >
                <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                <Monitor className="h-5 w-5" />
                <span className="text-sm font-medium">Hệ thống</span>
                {theme === "system" && <Check className="h-4 w-4 text-primary" />}
              </Label>
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Bảo mật
          </CardTitle>
          <CardDescription>Đổi mật khẩu đăng nhập</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pass">Mật khẩu hiện tại</Label>
            <Input
              id="current-pass"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-pass">Mật khẩu mới</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Xác nhận mật khẩu</Label>
              <Input
                id="confirm-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword}>
            {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Đổi mật khẩu
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
