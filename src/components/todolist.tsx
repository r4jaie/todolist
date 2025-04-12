// file: todolist.tsx
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import toast, { Toaster } from "react-hot-toast";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../app/lib/firebase";
import { PlusCircle, Edit3, Trash2 } from "lucide-react";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>({});
  const [filter, setFilter] = useState<"all" | "done" | "not_done">("all");

  useEffect(() => {
    const fetchTasks = async () => {
      await toast.promise(
        (async () => {
          const querySnapshot = await getDocs(collection(db, "tasks"));
          const tasksData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Task[];
          setTasks(tasksData);
        })(),
        {
          loading: "Memuat tugas...",
          success: "Tugas dimuat!",
          error: "Gagal memuat tugas.",
        }
      );
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeRemaining: { [key: string]: string } = {};
      tasks.forEach((task) => {
        newTimeRemaining[task.id] = calculateTimeRemaining(task.deadline);
      });
      setTimeRemaining(newTimeRemaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const calculateTimeRemaining = (deadline: string): string => {
    const deadlineTime = new Date(deadline).getTime();
    const now = new Date().getTime();
    const difference = deadlineTime - now;
    if (difference <= 0) return "Waktu habis!";
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return `${hours}j ${minutes}m ${seconds}d`;
  };

  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Tambahkan tugas baru",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Nama tugas">' +
        '<input id="swal-input2" type="datetime-local" class="swal2-input">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Tambah",
      cancelButtonText: "Batal",
      preConfirm: () => {
        return [
          (document.getElementById("swal-input1") as HTMLInputElement)?.value,
          (document.getElementById("swal-input2") as HTMLInputElement)?.value,
        ];
      },
    });
    if (formValues && formValues[0] && formValues[1]) {
      const newTask: Omit<Task, "id"> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
      };
      const docRef = await addDoc(collection(db, "tasks"), newTask);
      setTasks([...tasks, { id: docRef.id, ...newTask }]);
      toast.success("Tugas berhasil ditambahkan!");
    }
  };

  const editTask = async (task: Task): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Edit tugas",
      html:
        `<input id="swal-input1" class="swal2-input" value="${task.text}" placeholder="Nama tugas">` +
        `<input id="swal-input2" type="datetime-local" class="swal2-input" value="${task.deadline}">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      preConfirm: () => {
        return [
          (document.getElementById("swal-input1") as HTMLInputElement)?.value,
          (document.getElementById("swal-input2") as HTMLInputElement)?.value,
        ];
      },
    });
    if (formValues && formValues[0] && formValues[1]) {
      const updatedTask = {
        ...task,
        text: formValues[0],
        deadline: formValues[1],
      };
      await updateDoc(doc(db, "tasks", task.id), updatedTask);
      setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));
      toast.success("Tugas berhasil diperbarui!");
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    const result = await Swal.fire({
      title: "Yakin ingin menghapus tugas?",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });
    if (result.isConfirmed) {
      await deleteDoc(doc(db, "tasks", id));
      setTasks(tasks.filter((task) => task.id !== id));
      toast.success("Tugas berhasil dihapus!");
    }
  };

  const toggleTask = async (id: string): Promise<void> => {
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    await updateDoc(doc(db, "tasks", id), {
      completed: updatedTasks.find((task) => task.id === id)?.completed,
    });
    toast.success("Status tugas diperbarui!");
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "done") return task.completed;
    if (filter === "not_done") return !task.completed;
    return true;
  });

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white/80 backdrop-blur-md shadow-xl rounded-2xl">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold text-center text-emerald-600 mb-6">
        ✅ To-Do List
      </h1>

      <div className="flex justify-between items-center mb-6">
        <button
          onClick={addTask}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow transition-all"
        >
          <PlusCircle className="w-5 h-5" /> Tambah
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm text-black"
        >
          <option value="all" className="text-black">Semua</option>
          <option value="done" className="text-black">Selesai</option>
          <option value="not_done" className="text-black">Belum</option>
        </select>
      </div>

      <ul className="space-y-3">
        <AnimatePresence>
          {filteredTasks.map((task) => {
            const timeLeft = calculateTimeRemaining(task.deadline);
            const isExpired = timeLeft === "Waktu habis!";
            const taskColor = task.completed
              ? "bg-emerald-100"
              : isExpired
              ? "bg-rose-100"
              : "bg-yellow-100";

            return (
              <motion.li
                key={task.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-xl shadow-md ${taskColor}`}
              >
                <div className="flex justify-between items-center">
                  <span
                    onClick={() => toggleTask(task.id)}
                    className={`cursor-pointer text-lg transition-all ${
                      task.completed
                        ? "line-through text-gray-400"
                        : "font-medium text-gray-800"
                    }`}
                  >
                    {task.text}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editTask(task)}
                      className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  🗓️ {new Date(task.deadline).toLocaleString()}
                </p>
                <p className="text-xs text-gray-700 font-semibold">
                  ⏳ {timeRemaining[task.id] || "Menghitung..."}
                </p>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}