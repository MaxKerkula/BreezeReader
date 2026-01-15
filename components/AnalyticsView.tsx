
import React, { useMemo } from 'react';
import { LibraryItem } from '../types';
import { BarChart2, Calendar, Clock, Zap, TrendingUp } from 'lucide-react';

interface AnalyticsViewProps {
  library: LibraryItem[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ library }) => {
  const stats = useMemo(() => {
    let totalWords = 0;
    let totalSeconds = 0;
    let totalWpmSum = 0;
    let sessionCount = 0;
    const daysActive = new Set<string>();
    
    // Last 7 days chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    
    const activityMap: Record<string, number> = {};
    last7Days.forEach(day => activityMap[day] = 0);

    library.forEach(item => {
      totalWords += item.sessions.reduce((acc, s) => acc + s.wordsRead, 0);
      totalSeconds += item.sessions.reduce((acc, s) => acc + s.duration, 0);
      
      item.sessions.forEach(s => {
        totalWpmSum += s.wpm;
        sessionCount++;
        const dateStr = new Date(s.date).toISOString().split('T')[0];
        daysActive.add(dateStr);
        if (activityMap[dateStr] !== undefined) {
          activityMap[dateStr] += s.wordsRead;
        }
      });
    });

    // Streak Calculation
    let currentStreak = 0;
    const sortedDays = Array.from(daysActive).sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (sortedDays.includes(today)) {
      currentStreak = 1;
      let checkDate = new Date();
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const dateStr = checkDate.toISOString().split('T')[0];
        if (sortedDays.includes(dateStr)) currentStreak++;
        else break;
      }
    } else if (sortedDays.includes(yesterday)) {
       currentStreak = 0; // Or Keep it? Usually streak breaks if you miss today. Let's say 0.
    }

    return {
      totalWords,
      totalHours: (totalSeconds / 3600).toFixed(1),
      avgWpm: sessionCount > 0 ? Math.round(totalWpmSum / sessionCount) : 0,
      currentStreak,
      chartData: last7Days.map(date => ({
        day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        value: activityMap[date],
        fullDate: date
      }))
    };
  }, [library]);

  const maxChartValue = Math.max(...stats.chartData.map(d => d.value), 100);

  return (
    <div className="max-w-6xl mx-auto w-full pt-20 px-10 animate-in fade-in zoom-in-95 duration-700 pb-20">
      <h2 className="text-5xl font-black tracking-tighter text-white uppercase italic mb-16">Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Words Read', value: stats.totalWords.toLocaleString(), icon: Book, color: 'text-blue-400' },
          { label: 'Avg Speed (WPM)', value: stats.avgWpm, icon: Zap, color: 'text-yellow-400' },
          { label: 'Time Spent (Hrs)', value: stats.totalHours, icon: Clock, color: 'text-purple-400' },
          { label: 'Day Streak', value: stats.currentStreak, icon: TrendingUp, color: 'text-green-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between h-48 relative overflow-hidden group hover:border-white/20 transition-all">
             <stat.icon className={`w-8 h-8 mb-4 ${stat.color}`} />
             <div>
                <div className="text-4xl font-black text-white italic tracking-tight">{stat.value}</div>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{stat.label}</div>
             </div>
             <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 blur-xl ${stat.color.replace('text', 'bg')}`} />
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12">
        <div className="flex items-center justify-between mb-12">
           <h3 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
             <BarChart2 className="w-6 h-6 text-indigo-500" />
             Weekly Volume
           </h3>
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Words Processed</span>
        </div>
        
        <div className="w-full h-64 flex items-end gap-4">
          {stats.chartData.map((data, i) => (
             <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                <div className="w-full relative flex items-end h-full">
                   <div 
                      className="w-full bg-indigo-600 rounded-2xl transition-all duration-1000 group-hover:bg-indigo-400 relative"
                      style={{ height: `${(data.value / maxChartValue) * 100}%`, minHeight: data.value > 0 ? '10px' : '4px', opacity: data.value > 0 ? 1 : 0.2 }}
                   >
                     {data.value > 0 && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
                           {data.value.toLocaleString()} words
                        </div>
                     )}
                   </div>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.day}</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import { Book } from 'lucide-react';
export default AnalyticsView;
