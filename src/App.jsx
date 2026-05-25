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

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:20,fontFamily:"Arial"}}>
      <h1>Arbejdskalender V4</h1>
      <h2>Månedsoverblik</h2>

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
        style={{
          padding: 8,
          borderRadius: 6,
          textAlign: "center",
          background: hasShift ? "#86efac" : "#f3f4f6",
          border: "1px solid #ddd",
        }}
      >
        {day.getDate()}
      </div>
    );
  })}
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
              <button onClick={()=>deleteShift(day.key,i)}>Slet</button>
            </div>
          ))}

          <button onClick={()=>addShift(day.key)}>+ Tilføj vagt</button>
        </div>
      ))}
    </div>
  );
}
