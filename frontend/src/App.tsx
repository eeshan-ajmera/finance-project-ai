import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';


interface Article {
  title: string;
}

interface HistoricalDataPoint {
  date: string;
  actual: number;
  predicted: number;
}

interface PredictionResult {
  symbol: string;
  predicted_next_day_close: number;
  actual_last_close: number;
  margin_of_error: number;
  current_price?: number;
  historical?: HistoricalDataPoint[];
  articles?: Article[];
  summary?: string;
  sentiment?: string;
  sentiment_summary?: string;
  news_sources?: string[];
}

type Page = 'home' | 'about' | 'news';

// Move HomePage outside App
const HomePage = ({ query, setQuery, handleSearch, loading, error, result, sentiment }: {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  handleSearch: () => void;
  loading: boolean;
  error: string;
  result: PredictionResult | null;
  sentiment: 'positive' | 'negative' | 'neutral';
}) => {
  const [windowStart, setWindowStart] = useState(0);
  const monthsToShow = 4;
  let historical = result?.historical || [];
  // Group by month, get unique months
  const months = Array.from(new Set(historical.map(d => d.date.slice(0, 7))));
  const totalWindows = Math.max(1, months.length - monthsToShow + 1);
  // Default window: show the most recent 4 months
  const defaultWindow = Math.max(0, months.length - monthsToShow);
  // Start at the most recent window
  React.useEffect(() => { setWindowStart(defaultWindow); }, [result]);
  const currentWindow = Math.min(windowStart, totalWindows - 1);
  // Get the months to show
  const visibleMonths = months.slice(currentWindow, currentWindow + monthsToShow);
  // Filter data to visible months
  const visibleData = historical.filter(d => visibleMonths.includes(d.date.slice(0, 7)));
  // Y axis min/max with $15 margin
  let yMin = Math.min(...visibleData.map(d => Math.min(d.actual, d.predicted)));
  let yMax = Math.max(...visibleData.map(d => Math.max(d.actual, d.predicted)));
  if (isFinite(yMin) && isFinite(yMax)) {
    yMin = Math.floor(yMin - 15);
    yMax = Math.ceil(yMax + 15);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{
        background: 'linear-gradient(135deg, #181c2f 0%, #23263a 100%)',
        padding: '2.5rem',
        borderRadius: '20px',
        boxShadow: sentiment === 'positive'
          ? '0 0 60px 10px rgba(76, 175, 80, 0.45)'
          : sentiment === 'negative'
          ? '0 0 60px 10px rgba(244, 67, 54, 0.45)'
          : '0 8px 32px rgba(0, 188, 212, 0.15)',
        border: `4px solid ${sentiment === 'positive' ? '#4caf50' : sentiment === 'negative' ? '#f44336' : '#00bcd4'}`,
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        maxWidth: 600,
        transition: 'box-shadow 0.4s, border 0.4s'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ 
            color: '#00bcd4', 
            fontSize: '2.2rem', 
            marginBottom: '0.5rem',
            fontWeight: 700,
            letterSpacing: 1
          }}>
            Aniee.ai Stock Price Predictor
          </h2>
          <p style={{ color: '#e8f1f9', fontSize: '1.05rem', opacity: 0.85, marginBottom: 0 }}>
            Enter a stock symbol or company name to get a <b>next day closing price prediction</b> powered by AI.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <input
            type="text"
            placeholder="e.g. Apple, AAPL, GOOGL, TSLA"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: 340,
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              border: '1.5px solid #00bcd4',
              background: '#181c2f',
              color: '#e8f1f9',
              fontSize: '1.08rem',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0, 188, 212, 0.08)',
              marginRight: 0
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>
        <button
          onClick={handleSearch}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'linear-gradient(135deg, #00bcd4 0%, #82ca9d 100%)',
            color: '#181c2f',
            borderRadius: '12px',
            fontSize: '1.15rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0, 188, 212, 0.10)',
            marginBottom: '2rem',
            letterSpacing: 0.5
          }}
          disabled={loading}
        >
          {loading ? 'Predicting...' : 'Get Prediction'}
        </button>
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            color: '#00bcd4',
            fontSize: '1.08rem',
            padding: '1rem',
            background: 'rgba(0, 188, 212, 0.07)',
            borderRadius: '10px',
            border: '1px solid #00bcd4'
          }}>
            Loading prediction... This may take a moment.
          </div>
        )}
        {error && (
          <div style={{ 
            color: '#ff6f61', 
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(255, 111, 97, 0.08)',
            borderRadius: '10px',
            border: '1px solid #ff6f61',
            textAlign: 'center',
            fontSize: '1.05rem'
          }}>
            {error}
          </div>
        )}
        {result && (
          <div style={{ position: 'relative', width: '100%', maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  
            {/* Main Card */}
            <div style={{ flex: 1 }}>
              <div
                className="stock-card"
              >
                <h2 style={{ 
                  fontFamily: "'Georgia', Times New Roman",
                  position: 'relative',
                  top: '-20px',
                  color: '#00bcd4', 
                  fontSize: '2.1rem', 
                  marginBottom: '1.5rem',
                  textAlign: 'center',
                  fontWeight: 700,
                  letterSpacing: 1.45
                }}>
                  {result.symbol}
                </h2>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                  gap: '1.2rem', 
                  marginBottom: '2rem' 
                }}>
                  {result.current_price !== undefined && (
                    <div style={{
                      background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                      padding: '1.2rem',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#181c2f',
                      fontWeight: 600,
                      fontSize: '1.08rem',
                      border: 'none'
                    }}>
                      <div style={{ marginBottom: '0.3rem', fontWeight: 500 }}>Current Price</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${result.current_price.toFixed(2)}</div>
                    </div>
                  )}
                  <div style={{
                    background: 'linear-gradient(135deg, #82ca9d 0%, #a8e6cf 100%)',
                    padding: '1.2rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#181c2f',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    border: 'none'
                  }}>
                    <div style={{ marginBottom: '0.3rem', fontWeight: 500 }}>Next Day Predicted Close</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${result.predicted_next_day_close.toFixed(2)}</div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #00bcd4 0%, #4dd0e1 100%)',
                    padding: '1.2rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#181c2f',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    border: 'none'
                  }}>
                    <div style={{ marginBottom: '0.3rem', fontWeight: 500 }}>Last Close</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${result.actual_last_close.toFixed(2)}</div>
                  </div>
                  <div style={{
                    background: 'linear-gradient(135deg, #f44336 0%, #ff8a80 100%)',
                    padding: '1.2rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    color: '#181c2f',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    border: 'none'
                  }}>
                    <div style={{ marginBottom: '0.3rem', fontWeight: 500 }}>Margin Error</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${result.margin_of_error.toFixed(2)}</div>
                  </div>
                </div>
                {/* Chart */}
      {result.historical && result.historical.length > 0 && (
        <div
          style={{
            position: 'relative',    // positioning context for both arrows
            margin: '2rem 0',        // vertical spacing
          }}
        >
          {/* ← Left Arrow */}
          <button
            onClick={() => setWindowStart(Math.max(0, currentWindow - 1))}
            disabled={currentWindow === 0}
            style={{
              position: 'absolute',
              left: -20,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'none',
              border: 'none',
              cursor: currentWindow === 0 ? 'not-allowed' : 'pointer',
              opacity: currentWindow === 0 ? 0.3 : 1,
              width: 32,
              height: 32,
              padding: 0,
              zIndex: 2
            }}
            aria-label="Scroll left"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke={
                  sentiment === 'positive'
                    ? '#4caf50'
                    : sentiment === 'negative'
                    ? '#f44336'
                    : '#00bcd4'
                }
                strokeWidth="3"
                fill="none"
              />
              <polyline
                points="20,10 12,16 20,22"
                stroke={
                  sentiment === 'positive'
                    ? '#4caf50'
                    : sentiment === 'negative'
                    ? '#f44336'
                    : '#00bcd4'
                }
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Chart Container */}
          <div
            style={{
              background: 'rgba(24, 28, 47, 0.92)',
              borderRadius: '12px',
              border: '1px solid #00bcd4',
              padding: '1.5rem'
            }}
          >
            <h3
              style={{
                color: '#00bcd4',
                textAlign: 'center',
                marginBottom: '1rem',
                fontWeight: 600
              }}
            >
              Historical vs Predicted Prices
            </h3>

            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={visibleData}>
                <XAxis
                  dataKey="date"
                  stroke="#8884d8"
                  tick={{ fontSize: 12 }}
                  interval={Math.max(0, Math.floor(visibleData.length / 6) - 1)}
                />
                <YAxis
                  stroke="#8884d8"
                  domain={[yMin, yMax]}
                  tickFormatter={(v: number) => v.toFixed(3)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1d2b',
                    border: '1px solid #00bcd4',
                    borderRadius: '8px'
                  }}
                  formatter={(v: number) => v.toFixed(3)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#00bcd4"
                  name="Actual Price"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#82ca9d"
                  name="Predicted Price"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* → Right Arrow */}
          <button
            onClick={() => setWindowStart(Math.min(totalWindows - 1, currentWindow + 1))}
            disabled={currentWindow >= totalWindows - 1}
            style={{
              position: 'absolute',
              right: -20,
              top: '50%',
              transform: 'translate(50%, -50%)',
              background: 'none',
              border: 'none',
              cursor:
                currentWindow >= totalWindows - 1 ? 'not-allowed' : 'pointer',
              opacity: currentWindow >= totalWindows - 1 ? 0.3 : 1,
              width: 32,
              height: 32,
              padding: 0,
              zIndex: 2
            }}
            aria-label="Scroll right"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke={
                  sentiment === 'positive'
                    ? '#4caf50'
                    : sentiment === 'negative'
                    ? '#f44336'
                    : '#00bcd4'
                }
                strokeWidth="3"
                fill="none"
              />
              <polyline
                points="12,10 20,16 12,22"
                stroke={
                  sentiment === 'positive'
                    ? '#4caf50'
                    : sentiment === 'negative'
                    ? '#f44336'
                    : '#00bcd4'
                }
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
                    </div>
            </div>
            {/* Right Arrow */}
            
          </div>
        )}
      </div>
    </div>
  );
};

// Move AboutPage outside App
const AboutPage = () => (
  <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 2rem' }}>
    <div style={{
      background: 'linear-gradient(135deg, #1a1d2b 0%, #2d3748 100%)',
      padding: '3rem',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0, 188, 212, 0.3)',
      border: '1px solid #00bcd4'
    }}>
      <h2 style={{ 
        color: '#00bcd4', 
        fontSize: '3rem', 
        textAlign: 'center',
        marginBottom: '2rem',
        textShadow: '0 0 15px rgba(0, 188, 212, 0.5)'
      }}>
        🚀 About Our Team
      </h2>
      
      <p style={{ 
        color: '#e8f1f9', 
        fontSize: '1.2rem', 
        textAlign: 'center', 
        marginBottom: '3rem',
        lineHeight: '1.6'
      }}>
        We are high school students passionate about technology and finance, building this AI-powered stock prediction platform to help investors make informed decisions using cutting-edge machine learning technology.
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #00bcd4 0%, #4dd0e1 100%)',
          padding: '2rem',
          borderRadius: '20px',
          textAlign: 'center',
          color: '#000',
          boxShadow: '0 8px 25px rgba(0, 188, 212, 0.4)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👨‍💻</div>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 'bold' }}>Aniket</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            Aspiring full-stack developer and AI enthusiast. High school student passionate about machine learning and data science applications.
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #82ca9d 0%, #a8e6cf 100%)',
          padding: '2rem',
          borderRadius: '20px',
          textAlign: 'center',
          color: '#000',
          boxShadow: '0 8px 25px rgba(130, 202, 157, 0.4)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧠</div>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 'bold' }}>Eeshan</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            Aspiring machine learning engineer and data analyst. High school student with a keen interest in predictive modeling and financial algorithms.
          </p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
          padding: '2rem',
          borderRadius: '20px',
          textAlign: 'center',
          color: '#000',
          boxShadow: '0 8px 25px rgba(251, 194, 235, 0.4)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💡</div>
          <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: 'bold' }}>Anishkumar</h3>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            Aspiring software engineer and finance enthusiast. High school student dedicated to bridging technology and business.
          </p>
        </div>
      </div>

      <div style={{
        background: 'rgba(35, 38, 58, 0.8)',
        padding: '2rem',
        borderRadius: '15px',
        border: '1px solid #00bcd4'
      }}>
        <h3 style={{ color: '#00bcd4', fontSize: '1.8rem', marginBottom: '1rem' }}>
          🛠️ Our Technology Stack
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ color: '#e8f1f9', fontSize: '1.1rem' }}>• React & TypeScript</div>
          <div style={{ color: '#e8f1f9', fontSize: '1.1rem' }}>• Python Flask</div>
          <div style={{ color: '#e8f1f9', fontSize: '1.1rem' }}>• TensorFlow & Keras</div>
          <div style={{ color: '#e8f1f9', fontSize: '1.1rem' }}>• Yahoo Finance API</div>
          <div style={{ color: '#e8f1f9', fontSize: '1.1rem' }}>• Recharts</div>
          <div style={{ color: '#e8f1f9', fontSize: '1.1rem' }}>• Technical Analysis</div>
        </div>
      </div>
    </div>
  </div>
);

// Market News Page
const MarketNewsPage = ({ query, result, sentiment, setSentiment }: { query: string; result: PredictionResult | null; sentiment: 'positive' | 'negative' | 'neutral'; setSentiment: (s: any) => void }) => {
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError('');
    setNews(null);
    axios.post('http://localhost:8001/news', { stock: query })
      .then(res => {
        setNews(res.data);
        setSentiment(res.data.sentiment || 'neutral');
      })
      .catch(() => setError('Could not fetch news/sentiment.'))
      .finally(() => setLoading(false));
  }, [query, setSentiment]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', minHeight: '80vh' }}>
      <h2 style={{ textAlign: 'center', color: '#00bcd4', fontSize: '2.2rem', fontWeight: 700, marginBottom: '2rem' }}>
        Market News & Sentiment
      </h2>
      {loading && <div style={{ color: '#00bcd4', textAlign: 'center' }}>Loading news and sentiment...</div>}
      {error && <div style={{ color: '#f44336', textAlign: 'center' }}>{error}</div>}
      {news && (
        <div style={{
          background: 'rgba(24, 28, 47, 0.97)',
          borderRadius: '18px',
          boxShadow: '0 8px 32px rgba(0, 188, 212, 0.10)',
          border: `2.5px solid ${sentiment === 'positive' ? '#4caf50' : sentiment === 'negative' ? '#f44336' : '#00bcd4'}`,
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <div style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
            {news.symbol}
          </div>
          <div style={{ fontWeight: 600, fontSize: '1.15rem', marginBottom: '1rem' }}>
            Market Sentiment: {news.sentiment}
          </div>
          <div style={{ marginBottom: '1.5rem', fontStyle: 'italic', color: '#e8f1f9', fontSize: '1.1rem', textAlign: 'center' }}>{news.summary}</div>
          <div>
            <h4 style={{ color: '#00bcd4', marginBottom: '0.5rem' }}>Related News Articles</h4>
            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {news.articles && news.articles.map((a: any, i: number) => (
                <li key={i} style={{ marginBottom: 0, flex: '1 1 45%' }}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'block',
                    background: 'linear-gradient(135deg, #23263a 0%, #181c2f 100%)',
                    color: '#82ca9d',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '1.08rem',
                    borderRadius: '10px',
                    padding: '1rem',
                    boxShadow: '0 2px 8px rgba(130, 202, 157, 0.15)',
                    transition: 'box-shadow 0.2s, background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #82ca9d 0%, #a8e6cf 100%)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'linear-gradient(135deg, #23263a 0%, #181c2f 100%)')}
                  >{a.title}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'neutral'>('neutral');

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a stock name or symbol.');
      return;
    }

    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8001/predict', {
        stock: query.trim(),
        range: '1_day'
      });

      setResult(response.data);
      setSentiment(response.data.sentiment || 'neutral');
    } catch (err: any) {
      console.error(err);
      setError('❌ Could not fetch prediction.');
    } finally {
      setLoading(false);
    }
  };

  const Navigation = () => (
    <nav style={{
      background: 'linear-gradient(135deg, #1a1d2b 0%, #2d3748 100%)',
      padding: '1rem 2rem',
      marginBottom: '2rem',
      borderRadius: '0 0 20px 20px',
      boxShadow: '0 4px 20px rgba(0, 188, 212, 0.3)',
      borderBottom: '2px solid #00bcd4'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ 
            color: '#00bcd4', 
            margin: 0, 
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(0, 188, 212, 0.5)'
          }}>
            📈 Aniee.ai Stock Predictor
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setCurrentPage('home')}
            style={{
              background: currentPage === 'home' ? '#00bcd4' : 'transparent',
              color: currentPage === 'home' ? '#000' : '#00bcd4',
              border: '2px solid #00bcd4',
              padding: '0.5rem 1.5rem',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              fontSize: '1rem'
            }}
          >
            Home
          </button>
          <button
            onClick={() => setCurrentPage('about')}
            style={{
              background: currentPage === 'about' ? '#00bcd4' : 'transparent',
              color: currentPage === 'about' ? '#000' : '#00bcd4',
              border: '2px solid #00bcd4',
              padding: '0.5rem 1.5rem',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              fontSize: '1rem'
            }}
          >
            About Us
          </button>
          <button
            onClick={() => setCurrentPage('news')}
            style={{
              background: currentPage === 'news' ? '#00bcd4' : 'transparent',
              color: currentPage === 'news' ? '#000' : '#00bcd4',
              border: '2px solid #00bcd4',
              padding: '0.5rem 1.5rem',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              fontSize: '1rem'
            }}
          >
            Market News
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div style={{ 
      backgroundColor: '#0f111a', 
      color: '#e8f1f9', 
      minHeight: '100vh', 
      fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif'
    }}>
      <Navigation />
      {currentPage === 'home' ? (
        <HomePage
          query={query}
          setQuery={setQuery}
          handleSearch={handleSearch}
          loading={loading}
          error={error}
          result={result}
          sentiment={sentiment}
        />
      ) : currentPage === 'about' ? (
        <AboutPage />
      ) : (
        <MarketNewsPage
          query={query}
          result={result}
          sentiment={sentiment}
          setSentiment={setSentiment}
        />
      )}
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export default App;

//Finally done