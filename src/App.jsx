import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

const SHIFT_COLORS = {
  Dagvagt: "#fef3c7",
  Aftenvagt: "#fed7aa",
  Nattevagt: "#bfdbfe",
  Ekstravagt: "#e5e7eb",
  Ferie: "#bbf7d0",
  Syg: "#fecaca",
};

const DEFAULT_TIMES = {
  Dagvagt: ["07:00","15:00"],
  Aftenvagt: ["15:00","23:00"],
  Nattevagt: ["23:00","07:00"],
};
const PAY_RATES = {
  base: 239.19,
  evening: 35.94,
  saturday: 40.17,
  sunday: 119.14,
};

function getMonday(offset=0){
  const d=new Date();
  const day=d.getDay();
  const monday=new Date(d);
  monday.setDate(d.getDate()-(day===0?6:day-1)+offset*7);
  monday.setHours(0,0,0,0);
  return monday;
}

function weekDays(offset){
  const monday=getMonday(offset);
  return Array.from({length:7},(_,i)=>{
    const d=new Date(monday);
    d.setDate(monday.getDate()+i);
    return {
      key:d.toISOString().slice(0,10),
      label:d.toLocaleDateString("da-DK"),
      day:["Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag","Søndag"][i]
    };
  });
}

function weekNumber(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-yearStart)/86400000)+1)/7);
}

function hoursBetween(start,end){
  if(!start || !end) return 0;
  let [sh,sm]=start.split(":").map(Number);
  let [eh,em]=end.split(":").map(Number);
  let s=sh+sm/60;
  let e=eh+em/60;
  if(e<s) e+=24;
  return e-s;
}
function getMonthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days = [];

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  return days;
}

export default function App(){
  const [weekOffset,setWeekOffset]=useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem("darkmode") === "true";
});
  const [data,setData]=useState(()=>{
    try{
      return JSON.parse(localStorage.getItem("arbejdskalender-v4"))||{};
    }catch{
      return {};
    }
  });

  useEffect(()=>{
    localStorage.setItem("arbejdskalender-v4",JSON.stringify(data));
  },[data]);
  useEffect(() => {
  localStorage.setItem("darkmode", darkMode);
}, [darkMode]);

  const days=weekDays(weekOffset);
  const ugeNr=weekNumber(getMonday(weekOffset));
  const monthDays = getMonthDays(currentMonth);

  const addShift=(key)=>{
    setData(prev=>({
      ...prev,
      [key]: [...(prev[key]||[]), {
        afdeling:"S3",
        type:"Dagvagt",
        start:"07:00",
        slut:"15:00",
        note:""
      }]
    }));
  };
   const addQuickShift = (key, afdeling, type, start, slut) => {
  setData(prev => ({
    ...prev,
    [key]: [
      ...(prev[key] || []),
      {
        afdeling,
        type,
        start,
        slut,
        note: "",
        overtime: false
      }
    ]
  }));
};
const addFavoriteShift = (key, favorite) => {
  const favorites = {
    dag: {
      afdeling: "S3",
      type: "Dagvagt",
      start: "07:00",
      slut: "15:00",
    },
    aften: {
      afdeling: "S3",
      type: "Aftenvagt",
      start: "15:00",
      slut: "23:00",
    },
    weekend: {
      afdeling: "S4",
      type: "Dagvagt",
      start: "08:00",
      slut: "16:00",
    },
  };

  const shift = favorites[favorite];

  setData(prev => ({
    ...prev,
    [key]: [
      ...(prev[key] || []),
      {
        ...shift,
        note: "",
      }
    ]
  }));
};

  const updateShift=(key,i,field,value)=>{
    setData(prev=>{
      const arr=[...(prev[key]||[])];
      arr[i]={...arr[i],[field]:value};
      if(field==="type" && DEFAULT_TIMES[value]){
        arr[i].start=DEFAULT_TIMES[value][0];
        arr[i].slut=DEFAULT_TIMES[value][1];
      }
      return {...prev,[key]:arr};
    });
  };

  const deleteShift=(key,i)=>{
    setData(prev=>{
      const arr=[...(prev[key]||[])];
      arr.splice(i,1);
      return {...prev,[key]:arr};
    });
  };
  const exportPDF = () => {
  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text(`Arbejdskalender - Uge ${ugeNr}`, 10, 15);

  let y = 30;

  days.forEach((day) => {
    pdf.setFontSize(12);
    pdf.text(`${day.day} - ${day.label}`, 10, y);
    y += 8;

    (data[day.key] || []).forEach((shift) => {
      pdf.text(
        `${shift.afdeling} | ${shift.type} | ${shift.start}-${shift.slut} | ${shift.note}`,
        15,
        y
      );
      y += 7;
    });

    y += 5;
  });

  pdf.save(`arbejdskalender-uge-${ugeNr}.pdf`);
};
const exportICS = () => {
  let ics =
    "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Arbejdskalender//DA//\n";

  days.forEach((day) => {
    (data[day.key] || []).forEach((shift, index) => {
      ics +=
`BEGIN:VEVENT
UID:${day.key}-${index}
SUMMARY:${shift.afdeling} ${shift.type}
DESCRIPTION:${shift.note}
END:VEVENT
`;
    });
  });

  ics += "END:VCALENDAR";

  const blob = new Blob([ics], {
    type: "text/calendar;charset=utf-8",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "arbejdskalender.ics";
  link.click();
};

  const stats=useMemo(()=>{
    const result={timer:0,dag:0,aften:0,nat:0,S3:0,S4:0,S5:0};
    days.forEach(day=>{
      (data[day.key]||[]).forEach(s=>{
        result.timer+=hoursBetween(s.start,s.slut);
        if(s.type==="Dagvagt") result.dag++;
        if(s.type==="Aftenvagt") result.aften++;
        if(s.type==="Nattevagt") result.nat++;
        if(result[s.afdeling]!==undefined) result[s.afdeling]++;
      });
    });
    return result;
  },[data,days]);
  const monthStats = useMemo(() => {
  const result = {
    timer: 0,
    dag: 0,
    aften: 0,
    nat: 0,
    S3: 0,
    S4: 0,
    S5: 0,
  };

  monthDays.forEach((date) => {
    const key = date.toISOString().slice(0, 10);

    (data[key] || []).forEach((s) => {
      result.timer += hoursBetween(s.start, s.slut);

      if (s.type === "Dagvagt") result.dag++;
      if (s.type === "Aftenvagt") result.aften++;
      if (s.type === "Nattevagt") result.nat++;

      if (result[s.afdeling] !== undefined) {
        result[s.afdeling]++;
      }
    });
  });

  return result;
}, [data, monthDays]);
const salaryStats = useMemo(() => {
  let hours = 0;
  let basePay = 0;
  let eveningPay = 0;
  let saturdayPay = 0;
  let sundayPay = 0;

  monthDays.forEach((date) => {
    const key = date.toISOString().slice(0, 10);
    const weekday = date.getDay();

    (data[key] || []).forEach((shift) => {
      const h = hoursBetween(shift.start, shift.slut);

      hours += h;
      basePay += h * PAY_RATES.base;

      if (
        shift.type === "Aftenvagt" ||
        shift.type === "Nattevagt"
      ) {
        eveningPay += h * PAY_RATES.evening;
      }

      if (weekday === 6) {
        saturdayPay += h * PAY_RATES.saturday;
      }

      if (weekday === 0) {
        sundayPay += h * PAY_RATES.sunday;
      }
    });
  });

  return {
    hours,
    basePay,
    eveningPay,
    saturdayPay,
    sundayPay,
    total:
      basePay +
      eveningPay +
      saturdayPay +
      sundayPay,
  };
}, [data, monthDays]);

  return (
    <div
  style={{
    maxWidth:900,
    margin:"0 auto",
    padding:20,
    fontFamily:"Arial",
    background: darkMode ? "#111827" : "#ffffff",
    color: darkMode ? "#f9fafb" : "#111827",
    minHeight:"100vh"
  }}
>
      <h1>Arbejdskalender V4</h1>
      <button
  onClick={() => setDarkMode(!darkMode)}
  style={{
    marginBottom: 12,
    padding: "8px 12px",
    borderRadius: 8,
  }}
>
  {darkMode ? "☀️ Lys tilstand" : "🌙 Mørk tilstand"}
</button>
      <div style={{ marginBottom: 10 }}>
  <button
    onClick={() =>
      setCurrentMonth(
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() - 1,
          1
        )
      )
    }
  >
    ◀ Forrige måned
  </button>

  <button
    onClick={() =>
      setCurrentMonth(
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          1
        )
      )
    }
    style={{ marginLeft: 8 }}
  >
    Næste måned ▶
  </button>
</div>
      
      <h2>
  {currentMonth.toLocaleDateString("da-DK", {
    month: "long",
    year: "numeric",
  })}
</h2>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 6,
    marginBottom: 20,
  }}
>
  {monthDays.map((day) => {
    const key = day.toISOString().slice(0,10);
    const hasShift = data[key]?.length > 0;

    return (
    <div
  key={key}
  onClick={() => {
    const todayMonday = getMonday(0);

    const clickedMonday = new Date(day);

    const weekday = clickedMonday.getDay();

    clickedMonday.setDate(
      clickedMonday.getDate() -
      (weekday === 0 ? 6 : weekday - 1)
    );

    const diffWeeks = Math.round(
      (clickedMonday - todayMonday) /
      (1000 * 60 * 60 * 24 * 7)
    );

    setWeekOffset(diffWeeks);
  }}
  style={{
    padding: 8,
          borderRadius: 6,
          textAlign: "center",
          background: hasShift ? "#86efac" : "#f3f4f6",
          border: "1px solid #ddd",
          cursor: "pointer",
        }}
      >
        {day.getDate()}
      </div>
    );
  })}
</div>
<div
  style={{
    background: "#e0f2fe",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  }}
>
  <strong>
    Timer denne måned: {monthStats.timer.toFixed(1)}
  </strong>

  <br />

  Dagvagter: {monthStats.dag}
  {" | "}
  Aftenvagter: {monthStats.aften}
  {" | "}
  Nattevagter: {monthStats.nat}

  <br />

  S3: {monthStats.S3}
  {" | "}
  S4: {monthStats.S4}
  {" | "}
  S5: {monthStats.S5}
</div>
<div
  style={{
    background: "#dcfce7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  }}
>
  <h3>💰 Forventet månedsløn</h3>

  Timer: {salaryStats.hours.toFixed(1)}

  <br />

  Grundløn:
  {" "}
  {salaryStats.basePay.toFixed(0)}
  kr

  <br />

  Aften/nattillæg:
  {" "}
  {salaryStats.eveningPay.toFixed(0)}
  kr

  <br />

  Lørdagstillæg:
  {" "}
  {salaryStats.saturdayPay.toFixed(0)}
  kr

  <br />

  Søndag/SH:
  {" "}
  {salaryStats.sundayPay.toFixed(0)}
  kr

  <hr />

  <strong>
    Samlet:
    {" "}
    {salaryStats.total.toFixed(0)}
    kr
  </strong>
</div>
      <h2>Uge {ugeNr}</h2>
      <button
  onClick={exportPDF}
  style={{
    marginBottom: "12px",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer"
  }}
>
  📄 Eksporter PDF
</button>
<button onClick={exportICS}>
  📅 Eksporter kalender
</button>

      <div style={{background:"#f3f4f6",padding:12,borderRadius:8,marginBottom:12}}>
        <strong>Timer denne uge: {stats.timer.toFixed(1)}</strong><br/>
        Dagvagter: {stats.dag} | Aftenvagter: {stats.aften} | Nattevagter: {stats.nat}<br/>
        S3: {stats.S3} | S4: {stats.S4} | S5: {stats.S5}
      </div>

      <button onClick={()=>setWeekOffset(w=>w-1)}>◀ Forrige uge</button>
      <button onClick={()=>setWeekOffset(w=>w+1)} style={{marginLeft:8}}>Næste uge ▶</button>

      {days.map(day=>(
        <div key={day.key} style={{border:"1px solid #ccc",borderRadius:8,padding:12,marginTop:12}}>
          <h3>{day.day} - {day.label}</h3>

          {(data[day.key]||[]).map((s,i)=>(
            <div key={i} style={{background:SHIFT_COLORS[s.type]||"#eee",padding:10,borderRadius:8,marginBottom:8}}>
              <select value={s.afdeling} onChange={e=>updateShift(day.key,i,"afdeling",e.target.value)}>
                <option>S3</option><option>S4</option><option>S5</option>
              </select>

              <select value={s.type} onChange={e=>updateShift(day.key,i,"type",e.target.value)}>
                <option>Dagvagt</option><option>Aftenvagt</option><option>Nattevagt</option>
                <option>Ekstravagt</option><option>Ferie</option><option>Syg</option>
              </select>

              <input type="time" value={s.start} onChange={e=>updateShift(day.key,i,"start",e.target.value)} />
              <input type="time" value={s.slut} onChange={e=>updateShift(day.key,i,"slut",e.target.value)} />
              <input value={s.note} placeholder="Note" onChange={e=>updateShift(day.key,i,"note",e.target.value)} />
              <label style={{ marginLeft: 8 }}>
  <input
    type="checkbox"
    checked={s.overtime || false}
    onChange={e =>
      updateShift(
        day.key,
        i,
        "overtime",
        e.target.checked
      )
    }
  />
  Overarbejde 50%
</label>
              <button onClick={()=>deleteShift(day.key,i)}>Slet</button>
            </div>
          ))}

          <div style={{ marginTop: 8 }}>

  <button onClick={() => addShift(day.key)}>
    + Tilføj vagt
  </button>

  <button
    onClick={() => addQuickShift(day.key,"S3","Dagvagt","07:00","15:00")}
    style={{ marginLeft: 6, background:"#dcfce7" }}
  >
    S3 Dag
  </button>

  <button
    onClick={() => addQuickShift(day.key,"S3","Aftenvagt","15:00","23:00")}
    style={{ marginLeft: 6, background:"#fed7aa" }}
  >
    S3 Aften
  </button>
<button
  onClick={() => addQuickShift(day.key,"S3","Nattevagt","23:00","07:00")}
  style={{ marginLeft: 6, background:"#bfdbfe" }}
>
  S3 Nat
</button>
  <button
    onClick={() => addQuickShift(day.key,"S4","Dagvagt","07:00","15:00")}
    style={{ marginLeft: 6, background:"#dcfce7" }}
  >
    S4 Dag
  </button>

  <button
    onClick={() => addQuickShift(day.key,"S4","Aftenvagt","15:00","23:00")}
    style={{ marginLeft: 6, background:"#fed7aa" }}
  >
    S4 Aften
  </button>
<button
  onClick={() => addQuickShift(day.key,"S4","Nattevagt","23:00","07:00")}
  style={{ marginLeft: 6, background:"#bfdbfe" }}
>
  S4 Nat
</button>
  <button
    onClick={() => addQuickShift(day.key,"S5","Dagvagt","07:00","15:00")}
    style={{ marginLeft: 6, background:"#dcfce7" }}
  >
    S5 Dag
  </button>

  <button
    onClick={() => addQuickShift(day.key,"S5","Aftenvagt","15:00","23:00")}
    style={{ marginLeft: 6, background:"#fed7aa" }}
  >
    S5 Aften
  </button>

  <button
    onClick={() => addQuickShift(day.key,"S5","Nattevagt","23:00","07:00")}
    style={{ marginLeft: 6, background:"#bfdbfe" }}
  >
    S5 Nat
  </button>
  <button
  onClick={() => addFavoriteShift(day.key, "dag")}
  style={{ marginLeft: 6, background:"#fde68a" }}
>
  ⭐ Min Dagvagt
</button>

<button
  onClick={() => addFavoriteShift(day.key, "aften")}
  style={{ marginLeft: 6, background:"#fde68a" }}
>
  ⭐ Min Aftenvagt
</button>

<button
  onClick={() => addFavoriteShift(day.key, "weekend")}
  style={{ marginLeft: 6, background:"#fde68a" }}
>
  ⭐ Weekendvagt
</button>

</div>
        </div>
      ))}
    </div>
  );
}
