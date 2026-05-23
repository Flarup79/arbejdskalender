import { useEffect, useState } from 'react';

export default function Arbejdskalender() {
  const departments = ['S3', 'S4', 'S5'];

  const shifts = {
    'Fri': 'bg-gray-100 border-gray-300 text-gray-700',
    'Dagvagt 07-15': 'bg-yellow-100 border-yellow-300 text-yellow-900',
    'Aftenvagt 15-23': 'bg-orange-100 border-orange-300 text-orange-900',
    'Nattevagt 23-07': 'bg-indigo-100 border-indigo-300 text-indigo-900',
    'Dag + Aften': 'bg-gradient-to-r from-yellow-100 to-orange-100 border-orange-300 text-gray-900',
    'Aften + Nat': 'bg-gradient-to-r from-orange-100 to-indigo-100 border-indigo-300 text-gray-900',
    'Dag + Nat': 'bg-gradient-to-r from-yellow-100 to-indigo-100 border-indigo-300 text-gray-900',
  };

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const weekDays = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  const getWeekNumber = (date) => {
    const tempDate = new Date(date.valueOf());
    const dayNum = (date.getDay() + 6) % 7;
    tempDate.setDate(tempDate.getDate() - dayNum + 3);
    const firstThursday = tempDate.valueOf();
    tempDate.setMonth(0, 1);
    if (tempDate.getDay() !== 4) {
      tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - tempDate) / 604800000);
  };

  const monthNames = [
    'Januar',
    'Februar',
    'Marts',
    'April',
    'Maj',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'December',
  ];

  const [schedule, setSchedule] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [newEntry, setNewEntry] = useState({
    department: 'S3',
    shift: 'Dagvagt 07-15',
    start: '',
    end: '',
    note: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('arbejdskalender');
    if (saved) {
      setSchedule(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('arbejdskalender', JSON.stringify(schedule));
  }, [schedule]);

  const updateShift = (day, department, value) => {
    setSchedule((prev) => ({
      ...prev,
      [`${day}-${department}`]: {
        ...(prev[`${day}-${department}`] || {}),
        shift: value,
      },
    }));
  };

  const updateCustomTime = (day, department, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [`${day}-${department}`]: {
        ...(prev[`${day}-${department}`] || {}),
        [field]: value,
      },
    }));
  };

  const updateNote = (day, department, value) => {
    setSchedule((prev) => ({
      ...prev,
      [`${day}-${department}`]: {
        ...(prev[`${day}-${department}`] || {}),
        note: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-3">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-4 sticky top-2 z-10 mb-4">
          <h1 className="text-3xl font-bold text-center text-gray-800">
            Arbejdskalender
          </h1>

          <p className="text-center text-gray-500 mt-2 text-sm">
            S3 • S4 • S5
          </p>

          <div className="mt-4 flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2"
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28 rounded-xl border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-2 text-center">
              🟨 Dag 07-15
            </div>
            <div className="bg-orange-100 border border-orange-300 rounded-xl p-2 text-center">
              🟧 Aften 15-23
            </div>
            <div className="bg-indigo-100 border border-indigo-300 rounded-xl p-2 text-center col-span-2">
              🟦 Nat 23-07
            </div>
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border border-orange-300 rounded-xl p-2 text-center col-span-2">
              🔄 Dobbeltvagter understøttes
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => {
            const weekDaysArray = days.slice(weekIndex * 7, weekIndex * 7 + 7);

            return (
              <div
                key={weekIndex}
                className="bg-white rounded-3xl shadow-md p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Uge {getWeekNumber(new Date(year, month, weekDaysArray[0]))}
                  </h2>
                </div>

                <div className="space-y-3">
                  {weekDaysArray.map((day) => {
                    const current = new Date(year, month, day);
                    const weekDayName = weekDays[current.getDay()];

                    const entries = departments
                      .map((dept) => {
                        const entry = schedule[`${day}-${dept}`] || {};
                        const shift = entry.shift || 'Fri';

                        if (shift === 'Fri') return null;

                        const customTime =
                          entry.start && entry.end
                            ? ` (${entry.start}-${entry.end})`
                            : '';

                        const note = entry.note
                          ? ` • ${entry.note}`
                          : '';

                        return `${dept}: ${shift}${customTime}${note}`;
                      })
                      .filter(Boolean);

                    return (
                      <div
                        key={day}
                        className="rounded-2xl border border-gray-200 p-4 bg-gray-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-bold text-gray-800 text-lg">
                              {weekDayName} {day}
                            </div>
                            <div className="text-sm text-gray-500">
                              Uge {getWeekNumber(current)}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setEditingDay(day)}
                          className="mb-3 w-full rounded-xl bg-blue-500 text-white py-2 text-sm font-semibold"
                        >
                          + Tilføj vagt
                        </button>

                        {editingDay === day && (
                          <div className="bg-white border border-blue-200 rounded-2xl p-3 mb-3 space-y-3">
                            <select
                              value={newEntry.department}
                              onChange={(e) =>
                                setNewEntry({
                                  ...newEntry,
                                  department: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2"
                            >
                              <option>S3</option>
                              <option>S4</option>
                              <option>S5</option>
                            </select>

                            <select
                              value={newEntry.shift}
                              onChange={(e) =>
                                setNewEntry({
                                  ...newEntry,
                                  shift: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2"
                            >
                              <option>Dagvagt 07-15</option>
                              <option>Aftenvagt 15-23</option>
                              <option>Nattevagt 23-07</option>
                              <option>Dag + Aften</option>
                              <option>Aften + Nat</option>
                              <option>Dag + Nat</option>
                            </select>

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="time"
                                value={newEntry.start}
                                onChange={(e) =>
                                  setNewEntry({
                                    ...newEntry,
                                    start: e.target.value,
                                  })
                                }
                                className="rounded-xl border border-gray-300 px-3 py-2"
                              />

                              <input
                                type="time"
                                value={newEntry.end}
                                onChange={(e) =>
                                  setNewEntry({
                                    ...newEntry,
                                    end: e.target.value,
                                  })
                                }
                                className="rounded-xl border border-gray-300 px-3 py-2"
                              />
                            </div>

                            <textarea
                              value={newEntry.note}
                              onChange={(e) =>
                                setNewEntry({
                                  ...newEntry,
                                  note: e.target.value,
                                })
                              }
                              placeholder="Noter"
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 min-h-[70px]"
                            />

                            <button
                              onClick={() => {
                                setSchedule((prev) => ({
                                  ...prev,
                                  [`${day}-${newEntry.department}`]: {
                                    shift: newEntry.shift,
                                    start: newEntry.start,
                                    end: newEntry.end,
                                    note: newEntry.note,
                                  },
                                }));

                                setEditingDay(null);

                                setNewEntry({
                                  department: 'S3',
                                  shift: 'Dagvagt 07-15',
                                  start: '',
                                  end: '',
                                  note: '',
                                });
                              }}
                              className="w-full rounded-xl bg-green-500 text-white py-2 font-semibold"
                            >
                              Gem vagt
                            </button>
                          </div>
                        )}

                        {entries.length > 0 ? (
                          <div className="space-y-2">
                            {entries.map((text, index) => (
                              <div
                                key={index}
                                className="rounded-xl bg-white border border-gray-200 p-3 text-sm text-gray-700"
                              >
                                {text}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 italic">
                            Fri
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white rounded-3xl shadow-md p-4 border border-gray-200 space-y-3">
          <h3 className="font-bold text-lg text-gray-800 text-center">
            Kalender integration
          </h3>

          <button className="w-full rounded-2xl bg-blue-500 text-white py-3 font-semibold shadow-md">
            📅 Eksportér til Outlook
          </button>

          <button className="w-full rounded-2xl bg-green-500 text-white py-3 font-semibold shadow-md">
            📆 Eksportér til Google Kalender
          </button>

          <button className="w-full rounded-2xl bg-gray-800 text-white py-3 font-semibold shadow-md">
            🍎 Tilføj til iPhone Kalender
          </button>

          <button className="w-full rounded-2xl bg-purple-500 text-white py-3 font-semibold shadow-md">
            🔄 Synkroniser automatisk
          </button>
        </div>

        <div className="mt-6 bg-white rounded-3xl shadow-md p-4 border border-gray-200">
          <h3 className="font-bold text-lg text-gray-800 mb-3 text-center">
            Månedsoverblik
          </h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-yellow-100 border border-yellow-300 rounded-2xl p-3 text-center">
              Dagvagter
            </div>

            <div className="bg-orange-100 border border-orange-300 rounded-2xl p-3 text-center">
              Aftenvagter
            </div>

            <div className="bg-indigo-100 border border-indigo-300 rounded-2xl p-3 text-center col-span-2">
              Nattevagter
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 py-6">
          Gemmes automatisk på din iPhone 📱
        </div>
      </div>
    </div>
  );
}
