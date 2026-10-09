"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, UserPlus, Trash2, Check, Pencil, Crown } from "lucide-react";
import { createTeam, getUserTeams, inviteMemberToTeam, removeMemberFromTeam, searchUsers, updateTeam, deleteTeam } from "@/lib/actions/teams";
import { Switch } from "@/components/ui/switch";

interface User {
  id: string;
  name: string;
  email: string;
}

export function TeamsManager() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamUpgradeMembers, setNewTeamUpgradeMembers] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDesc, setEditTeamDesc] = useState("");
  const [editTeamUpgradeMembers, setEditTeamUpgradeMembers] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Autocomplete state
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const data = await getUserTeams();
      setTeams(data);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;

    setCreating(true);
    try {
      const result = await createTeam(newTeamName, newTeamDesc, newTeamUpgradeMembers);
      if (result.success) {
        toast.success("Team created successfully");
        setIsCreateOpen(false);
        setNewTeamName("");
        setNewTeamDesc("");
        setNewTeamUpgradeMembers(false);
        fetchTeams();
      } else {
        toast.error(result.error || "Failed to create team");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setCreating(false);
    }
  };

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Search users for autocomplete
  const handleSearchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserSuggestions([]);
      return;
    }

    try {
      const users = await searchUsers(query);
      setUserSuggestions(users);
    } catch (error) {
      console.error("Failed to search users:", error);
    }
  }, []);

  // Handle email input change
  const handleEmailChange = (value: string, teamId: string) => {
    setSelectedTeamId(teamId);
    setInviteEmail(value);
    setSearchQuery(value);

    if (value.length >= 2) {
      handleSearchUsers(value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Select user from autocomplete
  const handleSelectUser = (user: User) => {
    setInviteEmail(user.email);
    setSearchQuery(user.email);
    setShowSuggestions(false);
  };

  const handleInvite = async (teamId: string) => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    if (!isValidEmail(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setInviting(true);
    try {
      const result = await inviteMemberToTeam(teamId, inviteEmail);
      if (result.success) {
        if (result.invited) {
          toast.success(`Invitation email sent to ${inviteEmail}`);
        } else {
          toast.success("Member added successfully");
        }
        setInviteEmail("");
        setSearchQuery("");
        setSelectedTeamId(null);
        setShowSuggestions(false);
        fetchTeams();
      } else {
        toast.error(result.error || "Failed to invite member");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
      if(!confirm("Are you sure you want to remove this member?")) return;

      try {
          const result = await removeMemberFromTeam(teamId, userId);
          if (result.success) {
              toast.success("Member removed");
              fetchTeams();
          } else {
              toast.error(result.error || "Failed to remove member");
          }
      } catch (error) {
          toast.error("An error occurred");
      }
  };

  const handleEditTeam = (team: any) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamDesc(team.description || "");
    setEditTeamUpgradeMembers(team.upgradeMembers || false);
    setIsEditOpen(true);
  };

  const handleUpdateTeam = async () => {
    if (!editTeamName.trim() || !editingTeam) return;

    setUpdating(true);
    try {
      const result = await updateTeam(editingTeam.id, editTeamName, editTeamDesc, editTeamUpgradeMembers);
      if (result.success) {
        toast.success("Team updated successfully");
        setIsEditOpen(false);
        setEditingTeam(null);
        setEditTeamName("");
        setEditTeamDesc("");
        setEditTeamUpgradeMembers(false);
        fetchTeams();
      } else {
        toast.error(result.error || "Failed to update team");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) return;

    try {
      const result = await deleteTeam(teamId);
      if (result.success) {
        toast.success("Team deleted successfully");
        fetchTeams();
      } else {
        toast.error(result.error || "Failed to delete team");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  if (loading) {
    return <div>Loading teams...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Teams</h2>
          <p className="text-muted-foreground">Manage your teams and collaborate with others</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to share strategies and signals.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Alpha Squad"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description (Optional)</Label>
                <Input
                  id="desc"
                  placeholder="What is this team for?"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <Label htmlFor="upgrade-members" className="font-medium">Upgrade Members to Pro</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Give all team members (max 8) Pro access while they&apos;re on the team
                  </p>
                </div>
                <Switch
                  id="upgrade-members"
                  checked={newTeamUpgradeMembers}
                  onCheckedChange={setNewTeamUpgradeMembers}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={creating}>
                {creating ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Team Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g. Alpha Squad"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description (Optional)</Label>
              <Input
                id="edit-desc"
                placeholder="What is this team for?"
                value={editTeamDesc}
                onChange={(e) => setEditTeamDesc(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <Label htmlFor="edit-upgrade-members" className="font-medium">Upgrade Members to Pro</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Give all team members (max 8) Pro access while they&apos;re on the team
                </p>
              </div>
              <Switch
                id="edit-upgrade-members"
                checked={editTeamUpgradeMembers}
                onCheckedChange={setEditTeamUpgradeMembers}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTeam} disabled={updating}>
              {updating ? "Updating..." : "Update Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6">
        {teams.length === 0 ? (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mb-4 opacity-50" />
                    <p>You haven&apos;t joined any teams yet.</p>
                </CardContent>
            </Card>
        ) : (
            teams.map((team) => {
              // Check if current user is team lead
              const isTeamLead = team.members?.some((m: any) => m.role === "lead");

              return (
            <Card key={team.id}>
                <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <CardTitle>{team.name}</CardTitle>
                            {team.upgradeMembers && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                    <Crown className="h-3 w-3 text-yellow-500" />
                                    Pro Team
                                </Badge>
                            )}
                        </div>
                        <CardDescription>{team.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-sm text-muted-foreground mr-2">
                            {team.members?.length || 0} members
                        </div>
                        {isTeamLead && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditTeam(team)}
                                    title="Edit team"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteTeam(team.id, team.name)}
                                    title="Delete team"
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                    <h4 className="text-sm font-medium">Members</h4>
                    <div className="space-y-2">
                    {team.members?.map((member: any) => (
                        <div key={member.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                    {member.user.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{member.user.name}</p>
                                        {team.upgradeMembers && (
                                            <Crown className="h-3 w-3 text-yellow-500" title="Pro access via team" />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                                </div>
                            </div>
                            {member.role !== "lead" && (
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(team.id, member.user.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </div>
                    ))}
                    </div>

                    <div className="pt-4 border-t">
                        <Label>Add Member</Label>
                        <div className="flex gap-2 mt-2">
                            <div className="relative flex-1">
                                <Input
                                    placeholder="user@example.com or search by name"
                                    value={selectedTeamId === team.id ? inviteEmail : ""}
                                    onChange={(e) => handleEmailChange(e.target.value, team.id)}
                                    onFocus={() => {
                                        if (inviteEmail.length >= 2) {
                                            setShowSuggestions(true);
                                        }
                                    }}
                                />
                                {showSuggestions && selectedTeamId === team.id && userSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
                                        <div className="p-1">
                                            {userSuggestions.map((user) => (
                                                <button
                                                    key={user.id}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                                    onClick={() => handleSelectUser(user)}
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                        {user.name?.charAt(0) || "U"}
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <p className="font-medium">{user.name}</p>
                                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                                    </div>
                                                    <Check className="h-4 w-4 opacity-0" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="secondary"
                                onClick={() => handleInvite(team.id)}
                                disabled={inviting || !inviteEmail || selectedTeamId !== team.id}
                            >
                                {inviting ? (
                                    <>Inviting...</>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Invite
                                    </>
                                )}
                            </Button>
                        </div>
                        {selectedTeamId === team.id && inviteEmail && !isValidEmail(inviteEmail) && (
                            <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>
                        )}
                    </div>
                </div>
                </CardContent>
            </Card>
              );
            })
        )}
      </div>
    </div>
  );
}
