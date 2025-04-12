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
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
      <Toaster position="top-right" />

      <div className="flex flex-col items-center mb-6">
        <h1 className="text-3xl font-bold text-emerald-600 mb-2">
          To-Do List Rajaie
        </h1>
        <p className="text-gray-500">Kelola tugas Anda dengan mudah</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <button
          onClick={addTask}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Tambah Tugas
        </button>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 py-3 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="all">Semua Tugas</option>
          <option value="done">Tugas Selesai</option>
          <option value="not_done">Tugas Belum Selesai</option>
        </select>
      </div>

      <ul className="space-y-4">
        <AnimatePresence>
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500"
            >
              Tidak ada tugas yang ditemukan
            </motion.div>
          ) : (
            filteredTasks.map((task) => {
              const timeLeft = calculateTimeRemaining(task.deadline);
              const isExpired = timeLeft === "Waktu habis!";
              const taskColor = task.completed
                ? "bg-green-50 border-l-4 border-green-500"
                : isExpired
                ? "bg-red-50 border-l-4 border-red-500"
                : "bg-yellow-50 border-l-4 border-yellow-500";

              return (
                <motion.li
                  key={task.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg shadow-sm ${taskColor} hover:shadow-md transition-shadow duration-200`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                          task.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-gray-300 hover:border-emerald-500"
                        }`}
                      >
                        {task.completed && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1">
                        <span
                          className={`block text-lg ${
                            task.completed
                              ? "line-through text-gray-400"
                              : "text-gray-700 font-medium"
                          }`}
                        >
                          {task.text}
                        </span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {new Date(task.deadline).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {timeRemaining[task.id] || "Menghitung..."}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => editTask(task)}
                        className="text-white px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-white px-3 py-1 rounded bg-red-600 hover:bg-red-700 transition-colors duration-200 flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </div>
                </motion.li>
              );
            })
          )}
        </AnimatePresence>
      </ul>
    </div>
  );
}
