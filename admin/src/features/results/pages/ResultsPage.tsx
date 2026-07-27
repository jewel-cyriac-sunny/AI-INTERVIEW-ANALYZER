import { useState, useEffect } from 'react';
import { FileBarChart, Download, Eye, Calendar, User, TrendingUp, AlertTriangle, CheckCircle, Activity, MessageSquare } from 'lucide-react';
import { EmptyState, LoadingSkeleton } from '@/shared/components/UIComponents';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import resultsService from '@/features/results/services/resultsService';

export default function ResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await resultsService.getResults();
        
        // Map backend data to flat shape expected by UI
        const mappedData = data.map((item: any) => ({
          interview_id: item.interview_id,
          candidate_id: item.candidate_id,
          name: item.candidate.name,
          position: item.interview_type,
          interview_date: item.interview_date,
          score: item.score || 0,
          filler_words: item.filler_words ?? 0,
          blinks: item.blinks ?? 0,
          poor_posture: item.poor_posture ?? false,
          report_url: item.report_url
        }));
        
        setResults(mappedData);
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const handleDownloadReport = (e: React.MouseEvent, reportUrl: string | undefined) => {
    e.stopPropagation();
    if (reportUrl) {
      window.open(reportUrl.replace('localhost', '127.0.0.1'), '_blank');
    } else {
      alert('Report not available.');
    }
  };

  if (loading) return <LoadingSkeleton rows={6} columns={4} />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Interview Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and analyze candidate interview performance
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="No results yet"
          description="Results will appear here once interviews are analyzed by the AI system."
        />
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Candidate</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Role</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Overall Score</th>
                <th className="text-left p-4 text-muted-foreground font-medium">AI Analysis</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Date</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr
                  key={result.interview_id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                        {result.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{result.name}</p>
                        <p className="text-xs text-muted-foreground">ID: #{result.candidate_id.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{result.position}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${result.score >= 9
                            ? 'text-green-500'
                            : result.score >= 7.5
                              ? 'text-blue-500'
                              : 'text-amber-500'
                          }`}
                      >
                        {result.score}/10
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-muted-foreground">Filler Words: <span className="font-medium text-foreground">{result.filler_words}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-muted-foreground">Blinks: <span className="font-medium text-foreground">{result.blinks}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.poor_posture ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        )}
                        <span className="text-muted-foreground">Posture: <span className={`font-medium ${result.poor_posture ? 'text-amber-500' : 'text-green-500'}`}>{result.poor_posture ? 'Poor' : 'Good'}</span></span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(result.interview_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/results/${result.interview_id}`)}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDownloadReport(e, result.report_url)}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Download Report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics Visualization */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Performance Distribution
            </h2>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    tickFormatter={(val) => val.split(' ')[0]}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={30}>
                    {results.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= 9 ? '#22c55e' : entry.score >= 7.5 ? '#3b82f6' : '#f59e0b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Top Performers
            </h2>
            <div className="space-y-3">
              {[...results]
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map((c, i) => (
                  <div key={c.interview_id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground font-medium">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.position}</span>
                      <span className="font-bold text-primary">{c.score}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
