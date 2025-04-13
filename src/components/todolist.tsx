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
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const deleteSelectedTasks = async (): Promise<void> => {
    if (selectedTasks.length === 0) return;

    const result = await Swal.fire({
      title: `Hapus ${selectedTasks.length} tugas?`,
      text: `Tindakan ini tidak dapat dibatalkan!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus semua!",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
      cancelButtonColor: "#ef4444",
    });

    if (result.isConfirmed) {
      await Promise.all(
        selectedTasks.map((id) => deleteDoc(doc(db, "tasks", id)))
      );
      setTasks((prev) =>
        prev.filter((task) => !selectedTasks.includes(task.id))
      );
      setSelectedTasks([]);
      toast.success("Tugas terpilih berhasil dihapus!");
    }
  };

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

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Default to user's preferred color scheme
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newMode);
  };

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
  // Add Task
  const addTask = async (): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Tambahkan Tugas Baru",
      html:
        '<div class="text-left mb-4">' +
        '  <label for="swal-input1" class="block text-sm font-medium text-gray-700 mb-1">Nama Tugas</label>' +
        '  <input id="swal-input1" class="swal2-input w-full" placeholder="Masukkan nama tugas" required>' +
        "</div>" +
        '<div class="text-left">' +
        '  <label for="swal-input2" class="block text-sm font-medium text-gray-700 mb-1">Deadline</label>' +
        '  <input id="swal-input2" type="datetime-local" class="swal2-input w-full" required>' +
        "</div>",
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669", // emerald-600
      cancelButtonColor: "#ef4444", // red-500
      backdrop: `
      rgba(0,0,0,0.4)
      url("/images/nyan-cat.gif")
      left top
      no-repeat
    `,
      preConfirm: () => {
        const taskName = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value;
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;

        if (!taskName || !deadline) {
          Swal.showValidationMessage("Harap isi semua field");
          return false;
        }

        return [taskName, deadline];
      },
    });

    if (formValues) {
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
  // Edit Task
  const editTask = async (task: Task): Promise<void> => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Tugas",
      html:
        '<div class="text-left mb-4">' +
        '  <label for="swal-input1" class="block text-sm font-medium text-gray-700 mb-1">Nama Tugas</label>' +
        '  <input id="swal-input1" class="swal2-input w-full" value="' +
        task.text +
        '" placeholder="Masukkan nama tugas" required>' +
        "</div>" +
        '<div class="text-left">' +
        '  <label for="swal-input2" class="block text-sm font-medium text-gray-700 mb-1">Deadline</label>' +
        '  <input id="swal-input2" type="datetime-local" class="swal2-input w-full" value="' +
        task.deadline +
        '" required>' +
        "</div>",
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669", // emerald-600
      cancelButtonColor: "#ef4444", // red-500
      preConfirm: () => {
        const taskName = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value;
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;

        if (!taskName || !deadline) {
          Swal.showValidationMessage("Harap isi semua field");
          return false;
        }

        return [taskName, deadline];
      },
    });

    if (formValues) {
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
  // Delete Task
  const deleteTask = async (id: string): Promise<void> => {
    const result = await Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Anda tidak dapat mengembalikan tugas yang sudah dihapus!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#059669", // emerald-600
      cancelButtonColor: "#ef4444", // red-500
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-lg",
        confirmButton: "px-4 py-2 rounded-lg",
        cancelButton: "px-4 py-2 rounded-lg",
      },
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp",
      },
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
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? "dark bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-2xl mx-auto pt-10 pb-20 px-6">
        <div
          className={`p-6 rounded-xl shadow-lg transition-colors duration-300 ${
            darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
          }`}
        >
          <Toaster
            position="top-right"
            toastOptions={{
              className: darkMode ? "!bg-gray-700 !text-white" : "",
            }}
          />

          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <h1
                className={`text-3xl font-bold mb-2 ${
                  darkMode ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                To-Do List Rajaie
              </h1>
              <p className={darkMode ? "text-gray-400" : "text-gray-500"}>
                Kelola tugas Anda dengan mudah
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${
                darkMode
                  ? "bg-gray-700 text-yellow-300"
                  : "bg-gray-200 text-gray-700"
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <button
              onClick={addTask}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center gap-2 ${
                darkMode
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
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
              className={`w-full sm:w-auto py-3 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-white focus:ring-emerald-400 focus:border-emerald-400"
                  : "bg-white border-gray-300 text-gray-700 focus:ring-emerald-500 focus:border-emerald-500"
              }`}
            >
              <option value="all">Semua Tugas</option>
              <option value="done">Tugas Selesai</option>
              <option value="not_done">Tugas Belum Selesai</option>
            </select>
          </div>

          {selectedTasks.length > 0 && (
            <button
              onClick={deleteSelectedTasks}
              className={`mb-4 w-full py-3 rounded-lg font-medium shadow-md transition-colors duration-300 text-white ${
                darkMode
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              Hapus {selectedTasks.length} Tugas Terpilih
            </button>
          )}

          <ul className="space-y-4">
            <AnimatePresence>
              {filteredTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-center py-8 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Tidak ada tugas yang ditemukan
                </motion.div>
              ) : (
                filteredTasks.map((task) => {
                  const timeLeft = calculateTimeRemaining(task.deadline);
                  const isExpired = timeLeft === "Waktu habis!";
                  const taskColor = task.completed
                    ? darkMode
                      ? "bg-green-900 border-l-4 border-green-500"
                      : "bg-green-50 border-l-4 border-green-500"
                    : isExpired
                    ? darkMode
                      ? "bg-red-900 border-l-4 border-red-500"
                      : "bg-red-50 border-l-4 border-red-500"
                    : darkMode
                    ? "bg-yellow-900 border-l-4 border-yellow-500"
                    : "bg-yellow-50 border-l-4 border-yellow-500";

                  return (
                    <motion.li
                      key={task.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`p-4 rounded-lg shadow-sm ${taskColor} hover:shadow-md transition-shadow duration-200 ${
                        darkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            id={`checkbox-${task.id}`}
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => toggleSelect(task.id)}
                            className="peer hidden"
                          />
                          <label
                            htmlFor={`checkbox-${task.id}`}
                            className={`w-5 h-5 flex items-center justify-center border rounded cursor-pointer transition-colors duration-200
                              ${
                                selectedTasks.includes(task.id)
                                  ? darkMode
                                    ? "bg-emerald-600 border-emerald-600"
                                    : "bg-emerald-500 border-emerald-500"
                                  : darkMode
                                  ? "border-gray-500 hover:border-emerald-400"
                                  : "border-gray-300 hover:border-emerald-500"
                              }
                            `}
                          >
                            {selectedTasks.includes(task.id) && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 text-white"
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
                          </label>
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                              task.completed
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : darkMode
                                ? "border-gray-400 hover:border-emerald-400"
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
                                  : darkMode
                                  ? "font-medium"
                                  : "font-medium"
                              }`}
                            >
                              {task.text}
                            </span>
                            <div
                              className={`flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm ${
                                darkMode ? "text-gray-300" : "text-gray-500"
                              }`}
                            >
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
                            className={`px-3 py-1 rounded transition-colors duration-200 flex items-center gap-1 ${
                              darkMode
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
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
                            className={`px-3 py-1 rounded transition-colors duration-200 flex items-center gap-1 ${
                              darkMode
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
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
      </div>
    </div>
  );
}
