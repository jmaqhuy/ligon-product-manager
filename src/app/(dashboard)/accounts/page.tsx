"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Search,
  UserX,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { roleLabels } from "@/types";
import type { Role } from "@/lib/permissions";

interface UserData {
  id: string;
  email: string;
  fullName: string;
  nameAbbreviation: string;
  role: string;
  status: string;
  startDate: string;
}

interface SellingAccountData {
  id: string;
  platform: string;
  name: string;
  status: string;
  createdAt: string;
}

function getRoleBadge(role: string) {
  const variants: Record<string, string> = {
    boss: "bg-purple-100 text-purple-800 border-purple-200",
    manager: "bg-blue-100 text-blue-800 border-blue-200",
    employee: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <Badge variant="outline" className={variants[role] || ""}>
      {roleLabels[role as Role] || role}
    </Badge>
  );
}

function getStatusBadge(status: string) {
  return status === "active" ? (
    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
      Hoạt động
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
      Vô hiệu
    </Badge>
  );
}

export default function AccountsPage() {
  const { data: session } = useSession();
  const currentRole = session?.user?.role as Role | undefined;

  const [users, setUsers] = useState<UserData[]>([]);
  const [sellingAccounts, setSellingAccounts] = useState<SellingAccountData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "employee",
  });

  // Create selling account dialog state
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    platform: "amazon",
    name: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      toast.error("Lỗi tải danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSellingAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/selling-accounts");
      if (res.ok) {
        const data = await res.json();
        setSellingAccounts(data);
      }
    } catch {
      toast.error("Lỗi tải danh sách tài khoản đăng bán");
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchSellingAccounts();
  }, [fetchUsers, fetchSellingAccounts]);

  const handleCreateUser = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        toast.success("Tạo tài khoản thành công");
        setCreateOpen(false);
        setNewUser({ email: "", password: "", fullName: "", role: "employee" });
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi tạo tài khoản");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/deactivate`, {
        method: "PATCH",
      });
      if (res.ok) {
        toast.success("Đã vô hiệu hoá tài khoản");
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi vô hiệu hoá");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    }
  };

  const handleCreateSellingAccount = async () => {
    setCreatingAccount(true);
    try {
      const res = await fetch("/api/selling-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });

      if (res.ok) {
        toast.success("Tạo tài khoản đăng bán thành công");
        setCreateAccountOpen(false);
        setNewAccount({ platform: "amazon", name: "" });
        fetchSellingAccounts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi tạo tài khoản đăng bán");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleToggleAccountStatus = async (accountId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const res = await fetch(`/api/selling-accounts/${accountId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Đã ${newStatus === "active" ? "kích hoạt" : "ngừng"} tài khoản`);
        fetchSellingAccounts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = currentRole === "manager" || currentRole === "boss";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quản lý tài khoản</h1>
        <p className="text-muted-foreground text-sm">
          Tài khoản người dùng và tài khoản đăng bán
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Tài khoản người dùng</TabsTrigger>
          <TabsTrigger value="selling">Tài khoản đăng bán</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {canManage && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo tài khoản
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo tài khoản mới</DialogTitle>
                    <DialogDescription>
                      Tạo tài khoản cho nhân viên mới. Tên viết tắt sẽ được tự động sinh.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="new-email">Email *</Label>
                      <Input
                        id="new-email"
                        type="email"
                        placeholder="email@ligonteam.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Mật khẩu * (tối thiểu 8 ký tự)</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-name">Tên nhân viên *</Label>
                      <Input
                        id="new-name"
                        placeholder="Nguyễn Văn A"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Chức vụ *</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Nhân viên</SelectItem>
                          {currentRole === "boss" && (
                            <SelectItem value="manager">Quản lý</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                      Huỷ
                    </Button>
                    <Button onClick={handleCreateUser} disabled={creating}>
                      {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Tạo tài khoản
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Viết tắt</TableHead>
                    <TableHead>Chức vụ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày bắt đầu</TableHead>
                    {canManage && <TableHead className="w-[100px]">Thao tác</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        Không tìm thấy tài khoản nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const canDeactivate =
                        currentRole === "boss" ||
                        (currentRole === "manager" && user.role === "employee");
                      const isSelf = user.id === session?.user?.id;

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.fullName}</TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {user.nameAbbreviation}
                            </code>
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell>{getStatusBadge(user.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.startDate).toLocaleDateString("vi-VN")}
                          </TableCell>
                          {canManage && (
                            <TableCell>
                              {canDeactivate && !isSelf && user.status === "active" && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Vô hiệu hoá tài khoản?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tài khoản <strong>{user.fullName}</strong> sẽ không thể đăng nhập nữa. 
                                        Dữ liệu của họ vẫn được giữ nguyên.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Huỷ</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeactivateUser(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Vô hiệu hoá
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Selling Accounts Tab */}
        <TabsContent value="selling" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1" />
            {canManage && (
              <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm tài khoản
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm tài khoản đăng bán</DialogTitle>
                    <DialogDescription>
                      Tài khoản đăng bán không thể xoá, chỉ có thể ngừng sử dụng.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Sàn *</Label>
                      <Select
                        value={newAccount.platform}
                        onValueChange={(v) => setNewAccount({ ...newAccount, platform: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amazon">Amazon</SelectItem>
                          <SelectItem value="etsy">Etsy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acc-name">Tên tài khoản *</Label>
                      <Input
                        id="acc-name"
                        placeholder="VD: Ligon Amazon Main"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateAccountOpen(false)}>
                      Huỷ
                    </Button>
                    <Button onClick={handleCreateSellingAccount} disabled={creatingAccount}>
                      {creatingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Thêm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Sàn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  {canManage && <TableHead className="w-[120px]">Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellingAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8 text-muted-foreground">
                      Chưa có tài khoản đăng bán
                    </TableCell>
                  </TableRow>
                ) : (
                  sellingAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            acc.platform === "amazon"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-orange-100 text-orange-800 border-orange-200"
                          }
                        >
                          {acc.platform === "amazon" ? "Amazon" : "Etsy"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(acc.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(acc.createdAt).toLocaleDateString("vi-VN")}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAccountStatus(acc.id, acc.status)}
                          >
                            {acc.status === "active" ? "Ngừng dùng" : "Kích hoạt"}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
