import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { motion } from 'framer-motion'
import {
  Trophy, Upload, BarChart3, User, Filter, Download, ShieldCheck, Star,
  Medal, Crown, Armchair, Send, Bot, Coffee, PalmTree, X
} from 'lucide-react'

const CRITERIA = [
  'Допродажи (Личный/Командный)',
  'Отзывы',
  'Ср. скорость ЗП',
  'FG предзакрытия=100%',
  'NPS=10',
  'Рекламации',
  'Нулевой чёрн',
]

const RU_MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
const ruToIndex = {Янв:0,Фев:1,Мар:2,Апр:3,Май:4,Июн:5,Июл:6,Авг:7,Сен:8,Окт:9,Ноя:10,Дек:11}

function fmtKey(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') }
function ymToRu(key){ const [y,m] = key.split('-').map(Number); return RU_MONTHS[(m-1)%12] + ' ' + y }
function normalizeMonthLabel(label){
  const mm = String(label||'').trim()
  const mru = mm.match(/^([А-Яа-я]{3})\s(\d{4})$/)
  if(mru){ const mIdx = ruToIndex[mru[1]]; return mru[2] + '-' + String(mIdx+1).padStart(2,'0') }
  const m2 = mm.match(/^(\d{4})[-/](\d{1,2})$/)
  if(m2){ return m2[1] + '-' + String(Number(m2[2])).padStart(2,'0') }
  return mm
}

function parseWorkbook(wb){
  const wsName = wb.SheetNames[0]
  const ws = wb.Sheets[wsName]
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if(!json.length) return []

  let headerRowIdx = 0, maxFilled = 0
  for(let i=0;i<Math.min(5,json.length);i++){
    const filled = json[i].filter(v=>String(v).trim()!=='').length
    if(filled>maxFilled){maxFilled=filled; headerRowIdx=i}
  }

  const row0 = json[headerRowIdx] || []
  const row1 = json[headerRowIdx+1] || []
  const isTwoLevel = row1.some(v=>String(v).trim()!=='') && row0.some(v=>String(v).trim()!=='' && String(v).trim()!=='Сотрудник')

  let columns = []
  if(isTwoLevel){
    for(let c=0;c<row0.length;c++){
      const top = String(row0[c]||'').trim()
      const bot = String(row1[c]||'').trim()
      if(c===0){ columns.push({ key:'name' }); continue }
      if(top){ columns.push({ key: top + '||' + normalizeMonthLabel(bot), crit: top, ym: normalizeMonthLabel(bot) }) }
    }
  } else {
    for(let c=0;c<row0.length;c++){
      const head = String(row0[c]||'').trim()
      if(c===0){ columns.push({ key:'name' }); continue }
      const parts = head.split('—')
      if(parts.length>=2){
        const crit = parts[0].trim(), ym = normalizeMonthLabel(parts.slice(1).join('—').trim())
        columns.push({ key: crit + '||' + ym, crit, ym })
      }
    }
  }

  const startRow = isTwoLevel ? headerRowIdx+2 : headerRowIdx+1
  const rows = []
  for(let r=startRow; r<json.length; r++){
    const arr = json[r] || []
    const name = String(arr[0]||'').trim()
    if(!name || ['план','факт','итог','итоги','всего'].includes(name.toLowerCase())) continue
    const row = { name, data: {} }
    for(const col of columns){
      if(col.key==='name' || !col.crit || !col.ym) continue
      if(!CRITERIA.includes(col.crit)) continue
      row.data[col.crit] = row.data[col.crit] || {}
      const val = arr[columns.indexOf(col)] ?? ''
      const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g,'.'))
      row.data[col.crit][col.ym] = { value: isNaN(num) ? (String(val).trim()||null) : num }
    }
    rows.push(row)
  }
  return rows
}

const AWARDS = [
  { id: 'bronze',    label: 'Бронза',          icon: <Medal className='w-4 h-4'/>,     tint: 'bg-amber-200 text-amber-800' },
  { id: 'silver',    label: 'Серебро',         icon: <Medal className='w-4 h-4'/>,     tint: 'bg-gray-200 text-gray-800' },
  { id: 'gold',      label: 'Золото',          icon: <Medal className='w-4 h-4'/>,     tint: 'bg-yellow-200 text-yellow-800' },
  { id: 'platinum',  label: 'Платина',         icon: <Crown className='w-4 h-4'/>,     tint: 'bg-indigo-200 text-indigo-800' },
  { id: 'white-chair', label: 'Белый стул',    icon: <Armchair className='w-4 h-4'/>,  tint: 'bg-slate-100 text-slate-800' },
  { id: 'tg-premium', label: 'Telegram Premium', icon: <Send className='w-4 h-4'/>,   tint: 'bg-sky-100 text-sky-800' },
  { id: 'gpt',       label: 'GPT',             icon: <Bot className='w-4 h-4'/>,       tint: 'bg-emerald-100 text-emerald-800' },
  { id: 'coffee',    label: 'Кофе на 2К',      icon: <Coffee className='w-4 h-4'/>,    tint: 'bg-orange-100 text-orange-800' },
  { id: 'palm',      label: 'Пальма',          icon: <PalmTree className='w-4 h-4'/>,  tint: 'bg-green-100 text-green-800' },
]

function Badge({ children }){
  return <span className='px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200'>{children}</span>
}

function StatCard({ title, value, hint }){
  return (
    <div className='rounded-2xl border border-gray-200 p-4 shadow-sm bg-white'>
      <div className='text-sm text-gray-500 mb-1'>{title}</div>
      <div className='text-2xl font-semibold'>{value}</div>
      {hint && <div className='text-xs text-gray-400 mt-1'>{hint}</div>}
    </div>
  )
}

function HeatCell({ v, max }){
  let value = null
  if(typeof v === 'number') value = v
  if(typeof v === 'string' && v.trim()!=='' && !isNaN(Number(v))) value = Number(v)
  const intensity = value==null? 0 : Math.max(0, Math.min(1, value / (max||1)))
  const bg = value==null? 'bg-gray-50' : intensity>0? 'bg-emerald-100' : 'bg-gray-50'
  return (
    <div className={`h-10 rounded-md flex items-center justify-center ${bg} border border-gray-100 text-sm`}>{v ?? ''}</div>
  )
}

function AwardPill({ def, onClick, selected }){
  return (
    <button onClick={onClick} className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs ${selected? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}>
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${def.tint}`}>{def.icon}</span>
      <span>{def.label}</span>
    </button>
  )
}

function SmallAward({ id }){
  const def = AWARDS.find(a=>a.id===id)
  return <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${def.tint}`} title={def.label}>{def.icon}</span>
}

export default function App(){
  const [data, setData] = useState(()=>{
    const today = new Date(2025,7,14)
    const months = []; for(let k=5;k>=0;k--){ const d=new Date(today); d.setMonth(d.getMonth()-k); months.push(fmtKey(d)) }
    const sample = [
      { name: 'Куратор 1', data: {} },
      { name: 'ПМ 1', data: {} },
      { name: 'Архитектор 1', data: {} },
      { name: 'Архитектор 2', data: {} },
    ]
    for(const person of sample){
      for(const crit of CRITERIA){
        person.data[crit] = person.data[crit] || {}
        months.forEach((m, idx)=>{
          const base = (crit.includes('Рекламации')||crit.includes('Нулевой'))? 0 : 5
          person.data[crit][m] = { value: Math.max(0, Math.round(base + (person.name.length%4) + idx - (crit.length%3))) }
        })
      }
    }
    return sample
  })
  const [selectedName, setSelectedName] = useState(null)
  const [criteriaFilter, setCriteriaFilter] = useState(CRITERIA)
  const [monthsCount, setMonthsCount] = useState(6)
  const fileRef = useRef(null)

  const [selectedAward, setSelectedAward] = useState(null)
  const [awards, setAwards] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('awards')||'{}') } catch { return {} }
  })
  useEffect(()=>{ localStorage.setItem('awards', JSON.stringify(awards)) }, [awards])

  function giveAward(name, id){
    setAwards(prev=>{
      const list = prev[name] || []
      if(list.includes(id)) return prev
      return { ...prev, [name]: [...list, id] }
    })
  }
  function revokeAward(name, id){
    setAwards(prev=>({ ...prev, [name]: (prev[name]||[]).filter(x=>x!==id) }))
  }

  const allMonths = useMemo(()=>{
    const set = new Set()
    for(const r of data){ for(const c of CRITERIA){ const m = r.data[c]; if(!m) continue; Object.keys(m).forEach(k=>set.add(k)) } }
    return Array.from(set).sort()
  }, [data])

  const months = useMemo(()=> allMonths.slice(-monthsCount), [allMonths, monthsCount])
  const employees = useMemo(()=> data.map(d=>d.name), [data])
  const current = useMemo(()=> data.find(d=>d.name===selectedName) || data[0], [data, selectedName])

  const maxValue = useMemo(()=>{
    let max = 0; for(const r of data){ for(const c of CRITERIA){ const m = r.data[c]; if(!m) continue; for(const k of months){ const v = m[k]?.value; const num = typeof v==='number'? v : Number(v); if(!isNaN(num)) max = Math.max(max, num) } } }
    return max || 1
  }, [data, months])

  const [lbCrit, setLbCrit] = useState(CRITERIA[0])
  const lbMonth = months[months.length-1]
  const leaderboard = useMemo(()=>{
    const arr = data.map(r=>({ name: r.name, value: Number(r.data?.[lbCrit]?.[lbMonth]?.value ?? 0) }))
    return arr.sort((a,b)=>b.value-a.value)
  }, [data, lbCrit, lbMonth])

  function onUpload(e){
    const f = e.target.files?.[0]; if(!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const wb = XLSX.read(reader.result, { type: 'binary' })
      const rows = parseWorkbook(wb)
      if(rows.length){ setData(rows); setSelectedName(rows[0]?.name || null) }
      else alert('Не удалось распознать файл. Проверьте формат заголовков.')
    }
    reader.readAsBinaryString(f)
  }

  function downloadCSV(){
    const header = ['Сотрудник', ...criteriaFilter.flatMap(c=>months.map(m=>`${c} — ${ymToRu(m)}`))]
    const rows = data.map(r=>{
      const cells = [r.name]
      for(const c of criteriaFilter){ for(const m of months){ const v = r.data?.[c]?.[m]?.value ?? ''; cells.push(typeof v==='number'? v : String(v)) } }
      return cells
    })
    const csv = [header, ...rows].map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='board.csv'; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='sticky top-0 z-20 backdrop-blur bg-white/70 border-b'>
        <div className='max-w-7xl mx-auto px-4 py-3 flex items-center gap-3'>
          <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} className='flex items-center gap-2'>
            <Trophy className='w-5 h-5' />
            <div className='font-semibold'>Доска достижений</div>
          </motion.div>
          <div className='ml-auto flex items-center gap-2'>
            <button onClick={()=>fileRef.current?.click()} className='px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50 flex items-center gap-2'><Upload className='w-4 h-4'/>Загрузить Excel/CSV</button>
            <input ref={fileRef} type='file' className='hidden' accept='.xlsx,.xls,.csv' onChange={onUpload} />
            <button onClick={downloadCSV} className='px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50 flex items-center gap-2'><Download className='w-4 h-4'/>Экспорт CSV</button>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 py-6 grid gap-6'>
        <div className='rounded-2xl border bg-white p-4 shadow-sm'>
          <div className='flex flex-wrap items-end gap-3'>
            <div className='flex items-center gap-2'>
              <User className='w-4 h-4 text-gray-500'/>
              <label className='text-sm text-gray-600'>Сотрудник</label>
              <select value={current?.name} onChange={(e)=>setSelectedName(e.target.value)} className='ml-2 border rounded-xl px-3 py-1.5'>
                {employees.map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className='flex items-center gap-2'>
              <BarChart3 className='w-4 h-4 text-gray-500'/>
              <label className='text-sm text-gray-600'>Критерии</label>
              <select multiple value={criteriaFilter} onChange={(e)=>{
                const sel = Array.from(e.target.selectedOptions).map(o=>o.value); setCriteriaFilter(sel)
              }} className='ml-2 border rounded-xl px-3 py-1.5 min-w-[260px] h-24'>
                {CRITERIA.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className='flex items-center gap-2'>
              <Filter className='w-4 h-4 text-gray-500'/>
              <label className='text-sm text-gray-600'>Период</label>
              <input type='range' min={1} max={12} value={monthsCount} onChange={(e)=>setMonthsCount(Number(e.target.value))} />
              <span className='text-sm text-gray-700'>{monthsCount} мес.</span>
            </div>
          </div>
        </div>

        <div className='rounded-2xl border bg-white p-4 shadow-sm'>
          <div className='mb-3 font-semibold'>Выдать награду</div>
          <div className='flex flex-wrap gap-2 mb-3'>
            {AWARDS.map(a=> (
              <AwardPill key={a.id} def={a} onClick={()=>setSelectedAward(a.id)} selected={selectedAward===a.id} />
            ))}
          </div>
          <div className='flex items-center gap-2'>
            <button
              disabled={!selectedAward || !current?.name}
              onClick={()=> selectedAward && current?.name && giveAward(current.name, selectedAward)}
              className={`px-3 py-1.5 rounded-xl border ${selectedAward? 'bg-black text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Выдать {selectedAward ? AWARDS.find(a=>a.id===selectedAward)?.label : ''} — {current?.name}
            </button>
            {selectedAward && <span className='text-xs text-gray-500'>Подсказка: выберите сотрудника слева и нажмите «Выдать».</span>}
          </div>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard title='Сотрудник' value={<span className='text-base'>{current?.name}</span>} />
          <StatCard title='Всего критериев' value={criteriaFilter.length} />
          <StatCard title='Последний месяц' value={<span>{months.length? ymToRu(months[months.length-1]) : '-'}</span>} />
          <StatCard title='Лидерборд (критерий)' value={lbCrit} hint='ниже — рейтинг по последнему месяцу' />
        </div>

        <div className='rounded-2xl border bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <div className='font-semibold'>Награды сотрудника</div>
            <div className='text-xs text-gray-500'>Клик по значку — снять награду</div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {(awards[current?.name||'']||[]).length===0 && <div className='text-sm text-gray-500'>Пока нет наград</div>}
            {(awards[current?.name||'']||[]).map(id=> (
              <button key={id} onClick={()=> current?.name && revokeAward(current.name, id)} className='relative'>
                <SmallAward id={id} />
                <span className='absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5'><X className='w-3 h-3'/></span>
              </button>
            ))}
          </div>
        </div>

        <div className='rounded-2xl border bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <div className='font-semibold'>Моя статистика по месяцам</div>
            <div className='flex items-center gap-2 text-xs text-gray-500'>
              <ShieldCheck className='w-4 h-4'/> Приватный просмотр (видны только ваши значения)
            </div>
          </div>
          <div className='overflow-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr>
                  <th className='text-left sticky left-0 bg-white z-10 p-2 border-b'>Критерий</th>
                  {months.map(m=> (
                    <th key={m} className='px-2 py-2 text-xs text-gray-500 border-b whitespace-nowrap'>{ymToRu(m)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteriaFilter.map(crit=> (
                  <tr key={crit}>
                    <td className='sticky left-0 bg-white z-10 p-2 border-b font-medium text-gray-700 whitespace-nowrap'>{crit}</td>
                    {months.map(m=> (
                      <td key={m} className='p-1 border-b'>
                        <HeatCell v={current?.data?.[crit]?.[m]?.value} max={maxValue} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className='rounded-2xl border bg-white p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <div className='font-semibold flex items-center gap-2'><Trophy className='w-4 h-4'/> Лидерборд</div>
            <select value={lbCrit} onChange={(e)=>setLbCrit(e.target.value)} className='border rounded-xl px-3 py-1.5'>
              {CRITERIA.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className='space-y-2'>
            {leaderboard.map((r, idx)=> (
              <div key={r.name} className='flex items-center gap-3'>
                <div className='w-6 text-xs text-gray-500 text-right'>{idx+1}</div>
                <div className='w-48 truncate'>{r.name}</div>
                <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
                  <div className='h-2 bg-emerald-500' style={{ width: `${(r.value/(leaderboard[0]?.value||1))*100}%` }} />
                </div>
                <div className='w-14 text-right text-sm'>{r.value}</div>
                <div className='flex items中心 gap-1 ml-2'>
                  {(awards[r.name]||[]).slice(0,5).map(id=> <SmallAward key={id} id={id} />)}
                </div>
                {idx<3 && <Star className={`w-4 h-4 ${idx===0? 'text-yellow-500' : idx===1? 'text-gray-400' : 'text-amber-700'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-2xl border bg-white p-4 shadow-sm flex flex-wrap items-center gap-2'>
          <Badge>FG предзакрытия = 100%</Badge>
          <Badge>NPS = 10</Badge>
          <Badge>Нулевой чёрн</Badge>
          <Badge>Нет рекламаций</Badge>
          <span className='text-xs text-gray-400'>|</span>
          {AWARDS.map(a=> (
            <span key={a.id} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${a.tint}`}>
              {a.icon}<span>{a.label}</span>
            </span>
          ))}
        </div>
      </main>
    </div>
  )
}
