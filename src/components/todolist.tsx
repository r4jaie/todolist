// file: todolist.tsx
"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import toast, { Toaster } from "react-hot-toast"; // ✅ TOAST ADDED
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../app/lib/firebase";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  deadline: string;
};

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>(
    {}
  );
  const [filter, setFilter] = useState<"all" | "done" | "not_done">("all");

  useEffect(() => {
    const fetchTasks = async () => {
      const querySnapshot = await getDocs(collection(db, "tasks"));
      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      setTasks(tasksData);
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
      toast.success("Tugas berhasil ditambahkan!"); // ✅ TOAST
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
      toast.success("Tugas berhasil diperbarui!"); // ✅ TOAST
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
      toast.success("Tugas berhasil dihapus!"); // ✅ TOAST
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
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "done") return task.completed;
    if (filter === "not_done") return !task.completed;
    return true;
  });

  return (
    <div className="max-w-md mx-auto mt-10 p-4 bg-white shadow-md rounded-lg">
      <Toaster position="top-right" /> {/* ✅ TOASTER PROVIDER */}
      <h1 className="text-2xl text-emerald-500 font-bold mb-4">
        To-Do List Rajaie
      </h1>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={addTask}
          className="bg-slate-500 text-white px-4 py-2 rounded"
        >
          Tambah Tugas
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="bg-slate-500 text-white px-4 py-2 rounded"
        >
          <option value="all">Semua</option>
          <option value="done">Selesai</option>
          <option value="not_done">Belum</option>
        </select>
      </div>
      <ul>
        <AnimatePresence>
          {filteredTasks.map((task) => {
            const timeLeft = calculateTimeRemaining(task.deadline);
            const isExpired = timeLeft === "Waktu habis!";
            const taskColor = task.completed
              ? "bg-green-200"
              : isExpired
              ? "bg-red-200"
              : "bg-yellow-200";

            return (
              <motion.li
                key={task.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className={`flex flex-col justify-between p-2 border-b rounded-lg ${taskColor}`}
              >
                <div className="flex justify-between items-center">
                  <span
                    onClick={() => toggleTask(task.id)}
                    className={`cursor-pointer transition-500 ${
                      task.completed
                        ? "line-through text-gray-500"
                        : "font-semibold text-gray-700"
                    }`}
                  >
                    {task.text}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => editTask(task)}
                      className="text-white px-2 rounded bg-blue-600 hover:bg-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-white px-2 rounded bg-red-600 hover:bg-red-800"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-700">
                  Deadline: {new Date(task.deadline).toLocaleString()}
                </p>
                <p className="text-xs font-semibold text-gray-700">
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
