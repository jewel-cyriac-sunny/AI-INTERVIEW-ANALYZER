import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileBarChart, MessageSquare, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dashboardService from '@/features/dashboard/services/dashboardService';
import { LoadingSkeleton } from '@/shared/components/UIComponents';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    candidates: 0,
    interviews: 0, // Mock value will overlay this
    questions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats({
          candidates: data.total_candidates,
          interviews: data.total_interviews,
          questions: data.total_questions,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Candidates',
      value: stats.candidates,
      icon: Users,
      path: '/candidates',
      color: 'text-blue-500'
    },
    {
      label: 'Interviews Completed',
      value: stats.interviews,
      icon: FileBarChart,
      path: '/results',
      color: 'text-purple-500'
    },
    {
      label: 'Question Sets',
      value: stats.questions,
      icon: MessageSquare,
      path: '/questions',
      color: 'text-amber-500'
    },
  ];

  if (loading) return <LoadingSkeleton rows={1} columns={3} className="h-32" />;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">AI Interview Analyzer — Admin Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <button
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className="glass-panel p-6 text-left hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 p-4 opacity-10 ${stat.color} transition-transform group-hover:scale-110 duration-500`}>
              <stat.icon className="w-16 h-16" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg bg-secondary/50 group-hover:bg-primary/10 transition-colors ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-4xl font-bold text-foreground tracking-tight mt-2">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-panel p-6">
        <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate('/candidates')} className="btn-secondary text-sm">
            Manage Candidates
          </button>
          <button onClick={() => navigate('/questions')} className="btn-secondary text-sm">
            Manage Questions
          </button>
          <button onClick={() => navigate('/results')} className="btn-gradient text-sm shadow-lg shadow-primary/20">
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
}
