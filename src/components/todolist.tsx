// File: todolist.tsx
"use client";
import { useState, useEffect, useRef } from "react";
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
  priority?: number;
  description?: string;
};

export default function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>(
    {}
  );
  const [filter, setFilter] = useState<"all" | "done" | "not_done">("all");
  const [priorityFilter, setPriorityFilter] = useState<number | "all">("all");
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const sortTasksByPriority = (tasks: Task[]) => {
    const now = new Date().getTime();

    return [...tasks].sort((a, b) => {
      // Tugas selesai
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;

      // Berdasarkan deadline
      if (a.completed && b.completed) {
        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      }

      // Berdasarkan deadline terdekat
      const aTime = new Date(a.deadline).getTime() - now;
      const bTime = new Date(b.deadline).getTime() - now;

      // Deadline sudah lewat, tampilkan di atas
      if (aTime < 0 && bTime >= 0) return -1;
      if (aTime >= 0 && bTime < 0) return 1;

      return aTime - bTime;
    });
  };

  // Fungsi long-press
  const handleLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelect(id);
    }, 500);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Pilih semua tugas
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTasks([]);
      setIsSelectionMode(false); // <- keluar dari mode seleksi saat batal semua
    } else {
      setSelectedTasks(tasks.map((task) => task.id));
    }
    setIsAllSelected(!isAllSelected);
  };

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
      // Mode Default
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setDarkMode(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  // Dark/Light mode
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
        '<div class="text-left mb-4">' +
        '  <label for="swal-input2" class="block text-sm font-medium text-gray-700 mb-1">Deadline</label>' +
        '  <input id="swal-input2" type="datetime-local" class="swal2-input w-full" required>' +
        "</div>" +
        '<div class="text-left">' +
        '  <label for="swal-input3" class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>' +
        '  <textarea id="swal-input3" class="swal2-textarea w-full" placeholder="Tulis deskripsi tugas..."></textarea>' +
        "</div>" +
        '<div class="text-left mb-4">' +
        '  <label for="swal-input4" class="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>' +
        '  <select id="swal-input4" class="swal2-input w-full">' +
        '    <option value="1">Prioritas 1</option>' +
        '    <option value="2" selected>Prioritas 2</option>' +
        '    <option value="3">Prioritas 3</option>' +
        "  </select>" +
        "</div>",
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
      cancelButtonColor: "#ef4444",
      preConfirm: () => {
        const taskName = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value;
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        const description = (
          document.getElementById("swal-input3") as HTMLTextAreaElement
        )?.value;
        const priority = parseInt(
          (document.getElementById("swal-input4") as HTMLSelectElement)?.value
        );
        if (!taskName || !deadline) {
          Swal.showValidationMessage("Harap isi semua field");
          return false;
        }
        if (description.length > 200) {
          Swal.showValidationMessage("Deskripsi maksimal 200 karakter");
          return false;
        }
        return [taskName, deadline, description, priority];
      },
    });

    if (formValues) {
      const newTask: Omit<Task, "id"> = {
        text: formValues[0],
        completed: false,
        deadline: formValues[1],
        description: formValues[2],
        priority: formValues[3],
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
        '<div class="text-left mb-4">' +
        '  <label for="swal-input2" class="block text-sm font-medium text-gray-700 mb-1">Deadline</label>' +
        '  <input id="swal-input2" type="datetime-local" class="swal2-input w-full" value="' +
        task.deadline +
        '" required>' +
        "</div>" +
        '<div class="text-left">' +
        '  <label for="swal-input3" class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>' +
        '  <textarea id="swal-input3" class="swal2-textarea w-full" placeholder="Tulis deskripsi tugas...">' +
        (task.description || "") +
        "</textarea>" +
        "</div>" +
        '<div class="text-left mb-4">' +
        '  <label for="swal-input4" class="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>' +
        '  <select id="swal-input4" class="swal2-input w-full">' +
        '    <option value="1">Prioritas 1</option>' +
        '    <option value="2" selected>Prioritas 2</option>' +
        '    <option value="3">Prioritas 3</option>' +
        "  </select>" +
        "</div>",
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
      cancelButtonColor: "#ef4444",
      preConfirm: () => {
        const taskName = (
          document.getElementById("swal-input1") as HTMLInputElement
        )?.value;
        const deadline = (
          document.getElementById("swal-input2") as HTMLInputElement
        )?.value;
        const description = (
          document.getElementById("swal-input3") as HTMLTextAreaElement
        )?.value;
        const priority = parseInt(
          (document.getElementById("swal-input4") as HTMLSelectElement)?.value
        );
        if (!taskName || !deadline) {
          Swal.showValidationMessage("Harap isi semua field");
          return false;
        }
        if (description.length > 200) {
          Swal.showValidationMessage("Deskripsi maksimal 200 karakter");
          return false;
        }
        return [taskName, deadline, description, priority];
      },
    });

    if (formValues) {
      const updatedTask = {
        ...task,
        text: formValues[0],
        deadline: formValues[1],
        description: formValues[2],
        priority: formValues[3],
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

  const filteredTasks = sortTasksByPriority(
    tasks.filter((task) => {
      const matchStatus =
        filter === "done"
          ? task.completed
          : filter === "not_done"
          ? !task.completed
          : true;
      const matchPriority =
        priorityFilter === "all" ? true : task.priority === priorityFilter;
      return matchStatus && matchPriority;
    })
  );

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
                To-Do List
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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
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
              <select
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                className={`w-full sm:w-auto py-3 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${
                  darkMode
                    ? "bg-gray-700 border-gray-600 text-white focus:ring-emerald-400 focus:border-emerald-400"
                    : "bg-white border-gray-300 text-gray-700 focus:ring-emerald-500 focus:border-emerald-500"
                }`}
              >
                <option value="all">Semua Prioritas</option>
                <option value="1">Prioritas 1</option>
                <option value="2">Prioritas 2</option>
                <option value="3">Prioritas 3</option>
              </select>
            </div>
          </div>
          {isSelectionMode && (
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <button
                onClick={toggleSelectAll}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center gap-2 ${
                  darkMode
                    ? "bg-gray-600 hover:bg-gray-700 text-white"
                    : "bg-gray-500 hover:bg-gray-600 text-white"
                }`}
              >
                {isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
              </button>

              <button
                onClick={deleteSelectedTasks}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center gap-2 ${
                  darkMode
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
                Hapus {selectedTasks.length} Tugas Terpilih
              </button>
            </div>
          )}{" "}
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
                  const isDueSoon =
                    !task.completed &&
                    new Date(task.deadline).getTime() - new Date().getTime() <
                      24 * 60 * 60 * 1000;
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
                    : isDueSoon
                    ? darkMode
                      ? "bg-purple-900 border-l-4 border-purple-500"
                      : "bg-purple-50 border-l-4 border-purple-500"
                    : darkMode
                    ? "bg-yellow-900 border-l-4 border-yellow-500"
                    : "bg-yellow-50 border-l-4 border-yellow-500";

                  return (
                    <motion.li
                      key={task.id}
                      onMouseDown={() => handleLongPress(task.id)}
                      onTouchStart={() => handleLongPress(task.id)}
                      onMouseUp={clearLongPress}
                      onMouseLeave={clearLongPress}
                      onTouchEnd={clearLongPress}
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
                          {isSelectionMode && (
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedTasks.includes(task.id)}
                                onChange={() => toggleSelect(task.id)}
                                className="hidden"
                              />
                              <svg
                                className={`w-5 h-5 border-2 rounded ${
                                  selectedTasks.includes(task.id)
                                    ? "border-emerald-500 bg-emerald-500"
                                    : "border-gray-300"
                                }`}
                                viewBox="0 0 24 24"
                              >
                                {selectedTasks.includes(task.id) && (
                                  <path
                                    fill="white"
                                    stroke="white"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                  />
                                )}
                              </svg>
                            </label>
                          )}{" "}
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
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ml-1 ${
                              task.priority === 1
                                ? "bg-red-600 text-white"
                                : task.priority === 2
                                ? "bg-yellow-500 text-white"
                                : task.priority === 3
                                ? "bg-blue-500 text-white"
                                : "bg-gray-400 text-white"
                            }`}
                          >
                            P{task.priority || "-"}
                          </span>
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
                            {task.description && (
                              <motion.div
                                className="mt-2 text-sm"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                transition={{ duration: 0.3 }}
                              >
                                <details
                                  className={`group ${
                                    darkMode ? "text-gray-300" : "text-gray-600"
                                  }`}
                                >
                                  <summary className="flex items-center cursor-pointer font-medium gap-1">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 group-open:rotate-180 transition-transform duration-200"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                    Deskripsi
                                  </summary>
                                  <p className="mt-1 whitespace-pre-wrap ml-5">
                                    {task.description}
                                  </p>
                                </details>
                              </motion.div>
                            )}
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
