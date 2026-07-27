import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, Mail, Phone, Briefcase, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import resultsService from '@/features/results/services/resultsService';
import { LoadingSkeleton } from '@/shared/components/UIComponents';

export default function ResultDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = await resultsService.getResults();
        // Find the specific interview using interview_id mapped from the URL
        const found = data.find((r: any) => r.interview_id === id);
        
        if (found) {
            setResult({
              interview_id: found.interview_id,
              candidate_id: found.candidate_id,
              name: found.candidate.name,
              position: found.interview_type,
              interview_date: found.interview_date,
              score: found.score || 0,
              filler_words: found.filler_words ?? 0,
              blinks: found.blinks ?? 0,
              poor_posture: found.poor_posture ?? false,
              report_url: found.report_url
            });
        }
      } catch (error) {
        console.error('Failed to fetch detailed result:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

  const handleDownload = () => {
    if (result?.report_url) {
      window.open(result.report_url.replace('localhost', '127.0.0.1'), '_blank');
    } else {
      alert('Report not yet generated.');
    }
  };

  if (loading) return <LoadingSkeleton rows={12} columns={1} />;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>Result not found</p>
        <button onClick={() => navigate('/results')} className="mt-4 text-primary hover:underline">
          Go back to results
        </button>
      </div>
    );
  }

  /* Map the real AI metrics to the radar chart presentation */
  const radarData = [
    { subject: 'Overall Performance', A: result.score / 10, fullMark: 10 },
    { subject: 'Speech Clarity', A: Math.max(0, 10 - (result.filler_words * 0.5)), fullMark: 10 },
    { subject: 'Eye Contact', A: (result.blinks >= 5 && result.blinks <= 25) ? 10 : (result.blinks > 25 ? Math.max(0, 10 - (result.blinks - 25) * 0.4) : 7), fullMark: 10 },
    { subject: 'Body Language', A: result.poor_posture ? 4 : 10, fullMark: 10 },
    { subject: 'Confidence', A: Math.max(0, 10 - (result.filler_words * 0.2) - (result.poor_posture ? 2 : 0)), fullMark: 10 },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header with Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/results')}
          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Interview Result</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>Result #{result.interview_id.substring(0, 8)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(result.interview_date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="ml-auto btn-gradient text-sm flex items-center gap-2 px-4 py-2"
        >
          <Download className="w-4 h-4" /> Download PDF report
        </button>
      </div>

      {/* Candidate Profile Card */}
      <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
            {result.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{result.name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {result.position}
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {result.name.toLowerCase().replace(' ', '.')}@example.com
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-4xl font-bold text-primary">{result.score}<span className="text-lg text-muted-foreground font-medium">/10</span></div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${result.score >= 8 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
            {result.score >= 8 ? 'Strong Hire' : 'Consider'}
          </span>
        </div>
      </div>

      {/* Score Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-500">
            <TrendingUp className="w-12 h-12" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Filler Words Detected</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-blue-500">{result.filler_words}</span>
            <span className="text-sm text-muted-foreground">count</span>
          </div>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-purple-500">
            <TrendingUp className="w-12 h-12" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Blinks Count</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-purple-500">{result.blinks}</span>
            <span className="text-sm text-muted-foreground">count</span>
          </div>
        </div>
        <div className="glass-panel p-5 relative overflow-hidden">
          <div className={`absolute top-0 right-0 p-4 opacity-10 ${result.poor_posture ? 'text-amber-500' : 'text-green-500'}`}>
            <TrendingUp className="w-12 h-12" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Posture Status</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-bold ${result.poor_posture ? 'text-amber-500' : 'text-green-500'}`}>
              {result.poor_posture ? 'Poor' : 'Good'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="glass-panel p-6">
          <h2 className="text-sm font-medium text-foreground mb-6">Competency Map (Estimated AI View)</h2>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  name={result.name}
                  dataKey="A"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Feedback Area (Dynamic) */}
        <div className="glass-panel p-6">
          <h2 className="text-sm font-medium text-foreground mb-6">AI Executive Summary</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
              <h3 className="text-sm font-semibold text-green-500 mb-1">Strengths</h3>
              <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                <li>Demonstrated deep understanding of required technical stacks.</li>
                {result.filler_words < 10 && <li>Clear and concise communication style with very few filler words ({result.filler_words}).</li>}
                {!result.poor_posture && <li>Strong body language and professional posture maintained throughout.</li>}
                {result.blinks >= 5 && result.blinks <= 25 && <li>Excellent eye contact indicating steady focus.</li>}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <h3 className="text-sm font-semibold text-amber-500 mb-1">Areas for Improvement</h3>
              <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
                {result.filler_words >= 10 && <li>Filler word usage was slightly high ({result.filler_words}), consider practicing delivery.</li>}
                {result.poor_posture && <li>AI detected poor posture during portions of the interview.</li>}
                {result.blinks > 25 && <li>High blink rate ({result.blinks}) may indicate nervousness.</li>}
                {(result.filler_words < 10 && !result.poor_posture && result.blinks <= 25) && <li>No major red flags detected by AI framework!</li>}
              </ul>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground italic">
                "Overall, {result.name} is a {result.score >= 8 ? 'very strong' : 'moderate'} candidate for the {result.position} role. Their technical depth combined with {result.score > 8 ? 'excellent' : 'fair'} communication makes them a solid contender."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
