import React from "react";
import { Check } from "lucide-react";
import { ACCENT_PRESETS } from "../config/appearance";
import { useTheme } from "../context/ThemeContext";

export default function AppearanceSettings() {
  const { theme, accent, setAppearance, setAccent } = useTheme();
  const selectedPreset = ACCENT_PRESETS.find((preset) => preset.color === accent)?.name;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8" aria-labelledby="appearance-heading">
      <div className="mb-7">
        <h2 id="appearance-heading" className="text-xl font-bold text-slate-900 dark:text-white">Appearance</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Personalize your account. These preferences do not change business branding.</p>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Color mode</legend>
        <div className="grid max-w-md grid-cols-2 gap-3">
          {["light", "dark"].map((mode) => (
            <label
              key={mode}
              className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                theme === mode
                  ? "border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.08)] text-slate-900 dark:text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <span>{mode}</span>
              <input
                type="radio"
                name="appearance-theme"
                value={mode}
                checked={theme === mode}
                onChange={() => setAppearance({ theme: mode })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Accent color</legend>
        <div role="group" aria-label="Accent color presets" className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((preset) => {
            const selected = preset.color === accent;
            return (
              <button
                key={preset.color}
                type="button"
                aria-pressed={selected}
                aria-label={`${preset.name} accent${selected ? " (selected)" : ""}`}
                title={preset.name}
                onClick={() => setAccent(preset.color)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  selected ? "border-slate-900 dark:border-white" : "border-transparent"
                }`}
                style={{ backgroundColor: preset.color, outlineColor: preset.color }}
              >
                {selected && <Check size={18} className="text-white drop-shadow" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {selectedPreset ? `${selectedPreset} preset selected` : "Custom accent selected"}
        </p>
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label htmlFor="custom-accent-color" className="text-sm font-semibold text-slate-800 dark:text-slate-200">Custom color</label>
        <input
          id="custom-accent-color"
          type="color"
          value={accent}
          onChange={(event) => setAccent(event.target.value)}
          aria-label="Choose a custom accent color"
          className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
        />
        <span className="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">{accent}</span>
      </div>
    </section>
  );
}
