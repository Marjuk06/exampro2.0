"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ChevronLeft, ChevronRight, User, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface StudentData {
  uid: string;
  name: string;
  studentId: string;
  email: string;
  examsCompleted: number;
  xp: number;
  level: number;
}

export default function AdminStudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/admin/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add student");
      
      setIsAddOpen(false);
      setAddForm({ name: "", email: "", password: "" });
      setRefreshTrigger(prev => prev + 1);
      toast.success("Student added successfully!");
    } catch (err: unknown) {
      setAddError((err as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/students/search?q=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=20`);
        const json = await res.json();
        if (res.ok) {
          setData(json.students);
          setPagination(json.pagination);
        }
      } catch (e) {
        console.error("Failed to fetch students", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [debouncedSearch, page, refreshTrigger]);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Students Directory</h2>
        <div className="flex w-full flex-col sm:flex-row gap-3 sm:w-auto items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, ID, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full bg-white/5 border-white/10"
            />
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>
                  Manually register a student account. They will be able to log in using the email and password provided here.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddStudent} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. John Doe" 
                    required 
                    value={addForm.name}
                    onChange={e => setAddForm({...addForm, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="student@example.com" 
                    required 
                    value={addForm.email}
                    onChange={e => setAddForm({...addForm, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    minLength={6}
                    value={addForm.password}
                    onChange={e => setAddForm({...addForm, password: e.target.value})}
                  />
                </div>
                {addError && <p className="text-sm text-red-500">{addError}</p>}
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={isAdding}>
                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-white/10">
                <th className="p-4 font-medium">Student</th>
                <th className="p-4 font-medium">Student ID</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Exams Done</th>
                <th className="p-4 font-medium">Level (XP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-2" />
                    <p className="text-muted-foreground">Searching students...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12">
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                      <User className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-lg font-medium">No students found</p>
                      <p className="text-sm mt-1">Try adjusting your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((s) => (
                  <tr key={s.uid} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium text-white">{s.name}</td>
                    <td className="p-4 text-blue-400 font-mono text-sm">{s.studentId}</td>
                    <td className="p-4 text-muted-foreground text-sm">{s.email && s.email.trim() ? s.email : <span className="text-white/30">—</span>}</td>
                    <td className="p-4 text-center sm:text-left">{s.examsCompleted}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-400">
                        Lv.{s.level} <span className="opacity-60 text-[10px]">({s.xp} XP)</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-white">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium text-white">{pagination.total}</span> results
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="h-8 border-white/10 bg-transparent"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="h-8 border-white/10 bg-transparent"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
