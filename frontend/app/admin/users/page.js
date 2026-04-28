"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/convene/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
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
export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();
  const supabase = createClient();
  useEffect(() => {
    checkAuth();
    fetchUsers();
  }, []);
  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();

      // Fetch emails separately since they're in auth.users
      const usersData = data.users || [];
      setUsers(usersData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const updateUserRole = async (userId, newRole) => {
    try {
      setUpdating(userId);

      // Update user role via API
      const response = await fetch("/api/admin/users/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update user role");
      }
      toast({
        title: "Success!",
        description: `User role updated to ${newRole}`,
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };
  const deleteUser = async (userId, email) => {
    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      toast({
        title: "User Deleted",
        description: `${email} has been removed`,
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin_team":
        return "bg-purple-500 hover:bg-purple-600";
      case "organizer":
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };
  const getRoleLabel = (role) => {
    switch (role) {
      case "admin_team":
        return "ConveneHub Team";
      case "organizer":
        return "Event Operations";
      default:
        return "User";
    }
  };
  if (loading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "min-h-screen flex items-center justify-center",
      },
      /*#__PURE__*/ React.createElement(Spinner, {
        className: "h-8 w-8 text-[#195ADC]",
      }),
    );
  }
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "min-h-screen bg-gray-50 p-6",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "max-w-7xl mx-auto",
      },
      /*#__PURE__*/ React.createElement(
        Card,
        null,
        /*#__PURE__*/ React.createElement(
          CardHeader,
          null,
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-center justify-between",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                CardTitle,
                {
                  className: "text-2xl font-bold flex items-center gap-2",
                },
                /*#__PURE__*/ React.createElement(Shield, {
                  className: "h-6 w-6 text-blue-600",
                }),
                "User Management",
              ),
              /*#__PURE__*/ React.createElement(
                CardDescription,
                null,
                "Manage user roles and permissions",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              Badge,
              {
                variant: "outline",
                className: "text-sm",
              },
              /*#__PURE__*/ React.createElement(Users, {
                className: "h-4 w-4 mr-1",
              }),
              users.length,
              " Total Users",
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          CardContent,
          null,
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "rounded-md border",
            },
            /*#__PURE__*/ React.createElement(
              Table,
              null,
              /*#__PURE__*/ React.createElement(
                TableHeader,
                null,
                /*#__PURE__*/ React.createElement(
                  TableRow,
                  null,
                  /*#__PURE__*/ React.createElement(TableHead, null, "Email"),
                  /*#__PURE__*/ React.createElement(TableHead, null, "Phone"),
                  /*#__PURE__*/ React.createElement(TableHead, null, "Name"),
                  /*#__PURE__*/ React.createElement(TableHead, null, "City"),
                  /*#__PURE__*/ React.createElement(
                    TableHead,
                    null,
                    "Current Role",
                  ),
                  /*#__PURE__*/ React.createElement(
                    TableHead,
                    null,
                    "Change Role",
                  ),
                  /*#__PURE__*/ React.createElement(TableHead, null, "Joined"),
                  /*#__PURE__*/ React.createElement(
                    TableHead,
                    {
                      className: "text-right",
                    },
                    "Actions",
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                TableBody,
                null,
                users.length === 0
                  ? /*#__PURE__*/ React.createElement(
                      TableRow,
                      null,
                      /*#__PURE__*/ React.createElement(
                        TableCell,
                        {
                          colSpan: 7,
                          className: "text-center py-8 text-gray-500",
                        },
                        "No users found",
                      ),
                    )
                  : users.map((user) =>
                      /*#__PURE__*/ React.createElement(
                        TableRow,
                        {
                          key: user.id,
                        },
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          {
                            className: "font-medium",
                          },
                          user.email,
                        ),
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          null,
                          user.phone || "-",
                        ),
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          null,
                          user.full_name,
                        ),
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          null,
                          user.city,
                        ),
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          null,
                          /*#__PURE__*/ React.createElement(
                            Badge,
                            {
                              className: getRoleBadgeColor(user.role),
                            },
                            getRoleLabel(user.role),
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          null,
                          /*#__PURE__*/ React.createElement(
                            Select,
                            {
                              value: user.role,
                              onValueChange: (value) =>
                                updateUserRole(user.id, value),
                              disabled:
                                updating === user.id ||
                                user.id === currentUser?.id,
                            },
                            /*#__PURE__*/ React.createElement(
                              SelectTrigger,
                              {
                                className: "w-40",
                              },
                              /*#__PURE__*/ React.createElement(
                                SelectValue,
                                null,
                              ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              SelectContent,
                              null,
                              /*#__PURE__*/ React.createElement(
                                SelectItem,
                                {
                                  value: "user",
                                },
                                "User",
                              ),
                              /*#__PURE__*/ React.createElement(
                                SelectItem,
                                {
                                  value: "organizer",
                                },
                                "Event Operations",
                              ),
                              /*#__PURE__*/ React.createElement(
                                SelectItem,
                                {
                                  value: "admin_team",
                                },
                                "ConveneHub Team",
                              ),
                            ),
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          {
                            className: "text-sm text-gray-500",
                          },
                          new Date(user.created_at).toLocaleDateString(),
                        ),
                        /*#__PURE__*/ React.createElement(
                          TableCell,
                          {
                            className: "text-right",
                          },
                          /*#__PURE__*/ React.createElement(
                            AlertDialog,
                            null,
                            /*#__PURE__*/ React.createElement(
                              AlertDialogTrigger,
                              {
                                asChild: true,
                              },
                              /*#__PURE__*/ React.createElement(
                                Button,
                                {
                                  variant: "ghost",
                                  size: "sm",
                                  disabled: user.id === currentUser?.id,
                                  className:
                                    "text-red-600 hover:text-red-700 hover:bg-red-50",
                                },
                                /*#__PURE__*/ React.createElement(Trash2, {
                                  className: "h-4 w-4",
                                }),
                              ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              AlertDialogContent,
                              null,
                              /*#__PURE__*/ React.createElement(
                                AlertDialogHeader,
                                null,
                                /*#__PURE__*/ React.createElement(
                                  AlertDialogTitle,
                                  null,
                                  "Delete User?",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  AlertDialogDescription,
                                  null,
                                  "This will permanently delete ",
                                  /*#__PURE__*/ React.createElement(
                                    "strong",
                                    null,
                                    user.email,
                                  ),
                                  " and all their data. This action cannot be undone.",
                                ),
                              ),
                              /*#__PURE__*/ React.createElement(
                                AlertDialogFooter,
                                null,
                                /*#__PURE__*/ React.createElement(
                                  AlertDialogCancel,
                                  null,
                                  "Cancel",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  AlertDialogAction,
                                  {
                                    onClick: () =>
                                      deleteUser(user.id, user.email),
                                    className: "bg-red-600 hover:bg-red-700",
                                  },
                                  "Delete",
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
              ),
            ),
          ),
          updating &&
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "mt-4 flex items-center gap-2 text-sm text-gray-500",
              },
              /*#__PURE__*/ React.createElement(Spinner, {
                className: "h-4 w-4 text-[#195ADC]",
              }),
              "Updating user role...",
            ),
        ),
      ),
    ),
  );
}
