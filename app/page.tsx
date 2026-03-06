"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type DayProgress = Record<number, boolean>;
type ProgressMap = Record<number, DayProgress>;

type ChallengeData = {
  startDate: string;
  tasks: string[];
  progress: ProgressMap;
};

const DEFAULT_TASKS = [
  "AI Learning",
  "LeetCode",
  "System Design",
  "Java / Spring Boot / Kotlin",
];

const TOTAL_DAYS = 100;
const STORAGE_KEY = "hundred-day-challenge-tracker-v1";

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayDifference(startDateStr: string, current: Date = new Date()): number {
  const start = parseLocalDate(startDateStr);
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((today.getTime() - startLocal.getTime()) / msPerDay);
}

function createInitialData(): ChallengeData {
  return {
    startDate: formatDateInput(new Date()),
    tasks: DEFAULT_TASKS,
    progress: {},
  };
}

function loadData(): ChallengeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialData();

    const parsed = JSON.parse(raw) as Partial<ChallengeData>;

    return {
      startDate: parsed.startDate || formatDateInput(new Date()),
      tasks: Array.isArray(parsed.tasks) && parsed.tasks.length ? parsed.tasks : DEFAULT_TASKS,
      progress: parsed.progress || {},
    };
  } catch {
    return createInitialData();
  }
}

function saveData(data: ChallengeData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-slate-900 transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ChallengeData>(createInitialData());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setData(loadData());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveData(data);
  }, [data, mounted]);

  const todayIndexRaw = useMemo(() => getDayDifference(data.startDate), [data.startDate]);
  const todayIndex = Math.max(0, Math.min(TOTAL_DAYS - 1, todayIndexRaw));
  const started = todayIndexRaw >= 0;

  const totalChecks = data.tasks.length * TOTAL_DAYS;

  const completedChecks = useMemo((): number => {
    return Object.values(data.progress).reduce((sum, taskMap) => {
      return sum + Object.values(taskMap).filter(Boolean).length;
    }, 0);
  }, [data.progress]);

  const completedDays = useMemo((): number => {
    return Object.keys(data.progress).length;
  }, [data.progress]);

  const overallPercent =
    totalChecks === 0 ? 0 : Math.round((completedChecks / totalChecks) * 100);

  const taskPercents = useMemo((): number[] => {
    return data.tasks.map((_, taskIndex) => {
      let count = 0;
      for (let day = 0; day < TOTAL_DAYS; day += 1) {
        if (data.progress[day]?.[taskIndex]) count += 1;
      }
      return Math.round((count / TOTAL_DAYS) * 100);
    });
  }, [data.tasks, data.progress]);

  const challengeStatus = useMemo((): string => {
    if (todayIndexRaw < 0) return `Starts in ${Math.abs(todayIndexRaw)} day(s)`;
    if (todayIndexRaw >= TOTAL_DAYS) return "100-Day Challenge Completed";
    return `Day ${todayIndex + 1} of ${TOTAL_DAYS}`;
  }, [todayIndex, todayIndexRaw]);

  const days = useMemo(() => Array.from({ length: TOTAL_DAYS }, (_, i) => i), []);

  const toggleTask = (dayIndex: number, taskIndex: number) => {
    setData((prev) => {
      const existingDay: DayProgress = prev.progress[dayIndex] || {};
      const nextValue = !existingDay[taskIndex];
      const nextDay: DayProgress = { ...existingDay, [taskIndex]: nextValue };

      const hasAnyTrue = Object.values(nextDay).some(Boolean);
      const nextProgress: ProgressMap = { ...prev.progress };

      if (hasAnyTrue) {
        nextProgress[dayIndex] = nextDay;
      } else {
        delete nextProgress[dayIndex];
      }

      return { ...prev, progress: nextProgress };
    });
  };

  const updateTaskName = (index: number, value: string) => {
    setData((prev) => {
      const nextTasks = [...prev.tasks];
      nextTasks[index] = value;
      return { ...prev, tasks: nextTasks };
    });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "100-day-challenge-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as Partial<ChallengeData>;
        setData({
          startDate: parsed.startDate || formatDateInput(new Date()),
          tasks:
            Array.isArray(parsed.tasks) && parsed.tasks.length
              ? parsed.tasks
              : DEFAULT_TASKS,
          progress: parsed.progress || {},
        });
      } catch {
        alert("Invalid JSON file. Please upload a valid backup file.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const resetAll = () => {
    const confirmed = window.confirm(
      "Reset all challenge data? This will remove all saved progress."
    );
    if (!confirmed) return;
    setData(createInitialData());
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl text-sm text-slate-600">
          Loading your 100-day challenge...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                100 Day Challenge Tracker
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Track your fixed daily activities for the next 100 days:
                AI learning, LeetCode, System Design, and Java/Spring Boot/Kotlin
                interview preparation.
              </p>
            </div>

            <div className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {challengeStatus}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatCard
              title="Start Date"
              value={data.startDate}
              subtitle="Your challenge begins from this date"
            />
            <StatCard
              title="Overall Progress"
              value={`${overallPercent}%`}
              subtitle={`${completedChecks} of ${totalChecks} total task check-ins completed`}
            />
            <StatCard
              title="Active Days"
              value={completedDays}
              subtitle="Days with at least one completed task"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Start Date
              </label>
              <input
                type="date"
                value={data.startDate}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-500"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 block text-sm font-medium text-slate-700">
                Backup & Reset
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportData}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Export Backup
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Import Backup
                </button>

                <button
                  onClick={resetAll}
                  className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                >
                  Reset
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={importData}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Task Progress</h2>
            <p className="mt-1 text-sm text-slate-600">
              You can rename the fixed tasks anytime.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {data.tasks.map((task, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <input
                    value={task}
                    onChange={(e) => updateTaskName(index, e.target.value)}
                    className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500"
                  />
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Completion</span>
                    <span>{taskPercents[index]}%</span>
                  </div>
                  <ProgressBar value={taskPercents[index]} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>
                Your progress is stored in your browser using localStorage.
              </p>
              <p>
                Every checkbox click updates your saved data instantly.
              </p>
              <p>
                This works great for a personal tracker, but it stays on the same
                browser and device unless you export a backup.
              </p>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <pre className="text-xs text-slate-700">
{`{
  "startDate": "${data.startDate}",
  "tasks": ${JSON.stringify(data.tasks, null, 2)},
  "progress": {
    "0": { "0": true, "1": false },
    "1": { "0": true, "2": true }
  }
}`}
              </pre>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">100-Day Grid</h2>
          <p className="mt-1 text-sm text-slate-600">
            Check off the tasks you complete each day. Today is highlighted
            automatically.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {days.map((dayIndex) => {
              const isToday =
                started && dayIndex === todayIndex && todayIndexRaw < TOTAL_DAYS;
              const isPast = started && dayIndex < todayIndex;
              const isFuture = dayIndex > todayIndexRaw;
              const dayProgress: DayProgress = data.progress[dayIndex] || {};
              const completedForDay = Object.values(dayProgress).filter(Boolean).length;

              return (
                <div
                  key={dayIndex}
                  className={[
                    "rounded-2xl border p-4 transition",
                    isToday
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                      : isFuture
                      ? "border-dashed border-slate-300 bg-slate-50"
                      : "border-slate-200 bg-white",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div
                        className={`text-sm ${
                          isToday ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        Day
                      </div>
                      <div className="text-xl font-bold">{dayIndex + 1}</div>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isToday
                          ? "bg-slate-700 text-slate-100"
                          : "border border-slate-300 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {completedForDay}/{data.tasks.length}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {data.tasks.map((task, taskIndex) => {
                      const checked = !!dayProgress[taskIndex];

                      return (
                        <label
                          key={taskIndex}
                          className={[
                            "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                            isToday
                              ? "border-slate-700 bg-slate-800"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTask(dayIndex, taskIndex)}
                            className="h-4 w-4"
                          />
                          <span className={checked ? "line-through opacity-70" : ""}>
                            {task}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {isPast && completedForDay < data.tasks.length && (
                    <p
                      className={`mt-3 text-xs ${
                        isToday ? "text-slate-300" : "text-amber-600"
                      }`}
                    >
                      Missed some tasks on this day.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}