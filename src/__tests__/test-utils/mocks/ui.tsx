import React from 'react';

export interface SearchDebugProps {
  query: string;
  results: Array<{
    id: string;
    score: number;
    snippet: string;
    highlights?: Array<{ start: number; end: number }>;
  }>;
  timing?: {
    totalMs: number;
    indexMs: number;
    rerankMs: number;
  };
  view: 'raw' | 'pretty';
  onToggleView: () => void;
}

export const SearchDebug: React.FC<SearchDebugProps> = ({
  query,
  results,
  timing,
  view,
  onToggleView,
}) => {
  const highlight = (text: string, highlights: Array<{ start: number; end: number }>) => {
    if (!highlights.length) return text;
    let last = 0;
    const parts: React.ReactNode[] = [];
    highlights.forEach(({ start, end }, idx) => {
      parts.push(text.slice(last, start));
      parts.push(
        <mark key={idx} className="bg-yellow-300 font-bold">
          {text.slice(start, end)}
        </mark>
      );
      last = end;
    });
    parts.push(text.slice(last));
    return parts;
  };

  return (
    <div data-testid="search-debug" className="p-4 border rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-lg">Search Debug</h3>
        <button
          data-testid="toggle-view-btn"
          onClick={onToggleView}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
        >
          Switch to {view === 'raw' ? 'pretty' : 'raw'}
        </button>
      </div>

      {timing && (
        <div data-testid="timing-info" className="mb-2 text-sm text-gray-600">
          Total: {timing.totalMs}ms (index: {timing.indexMs}ms, rerank: {timing.rerankMs}ms)
        </div>
      )}

      <div data-testid="query-display" className="mb-2 font-mono text-sm">
        Query: <span className="font-bold">{query}</span>
      </div>

      {results.length === 0 ? (
        <div data-testid="no-results">No results found.</div>
      ) : view === 'raw' ? (
        <pre data-testid="raw-view" className="text-xs bg-gray-50 p-2 rounded overflow-auto">
          {JSON.stringify(results, null, 2)}
        </pre>
      ) : (
        <ul data-testid="pretty-view" className="space-y-2">
          {results.map((r) => (
            <li key={r.id} data-testid={`result-${r.id}`} className="border-b pb-1">
              <div className="text-xs text-gray-500">Score: {r.score.toFixed(2)}</div>
              <div className="text-sm">
                {r.highlights
                  ? highlight(r.snippet, r.highlights)
                  : r.snippet}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Placeholder exports for other mocks to avoid duplicate files
export interface ComparisonResult {
  id: string;
  score: number;
  snippet: string;
}

export interface SearchComparisonProps {
  v1Results: ComparisonResult[];
  v2Results: ComparisonResult[];
  onSelectResult: (id: string, version: 'v1' | 'v2') => void;
}

export const SearchComparison: React.FC<SearchComparisonProps> = ({
  v1Results,
  v2Results,
  onSelectResult,
}) => {
  const renderResultList = (results: ComparisonResult[], version: 'v1' | 'v2') => (
    <div className="flex-1">
      <h4 className="font-semibold mb-2 text-center">{version.toUpperCase()} Results</h4>
      <ul className="space-y-2">
        {results.map((r) => (
          <li
            key={r.id}
            data-testid={`comparison-result-${version}-${r.id}`}
            onClick={() => onSelectResult(r.id, version)}
            className="p-2 border rounded cursor-pointer hover:bg-gray-100"
          >
            <div className="text-xs text-gray-500">Score: {r.score.toFixed(2)}</div>
            <p className="text-sm">{r.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div data-testid="search-comparison" className="p-4 border rounded-lg shadow-sm">
      <h3 className="font-semibold text-lg mb-4 text-center">Search Comparison</h3>
      <div className="flex space-x-4">
        {renderResultList(v1Results, 'v1')}
        <div className="border-l"></div>
        {renderResultList(v2Results, 'v2')}
      </div>
    </div>
  );
};
export interface ErrorItem {
  id: string;
  message: string;
  count: number;
  lastSeen: string;
}

export interface ErrorMetricsProps {
  errors: ErrorItem[];
  onAcknowledgeError: (id: string) => void;
}

export const ErrorMetrics: React.FC<ErrorMetricsProps> = ({ errors, onAcknowledgeError }) => {
  const [filter, setFilter] = React.useState('');

  const filteredErrors = errors.filter((e) =>
    e.message.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div data-testid="error-metrics" className="p-4 border rounded-lg shadow-sm">
      <h3 className="font-semibold text-lg mb-2">Error Metrics</h3>

      <div data-testid="error-trend-viz" className="mb-4 p-4 bg-gray-50 text-center text-gray-500 rounded">
        [Trend Visualization Placeholder]
      </div>

      <input
        type="text"
        data-testid="error-filter-input"
        placeholder="Filter errors..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full p-2 mb-4 border rounded"
      />

      <ul className="space-y-2">
        {filteredErrors.map((e) => (
          <li
            key={e.id}
            data-testid={`error-item-${e.id}`}
            className="p-2 border rounded flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{e.message}</p>
              <p className="text-sm text-gray-600">
                Count: {e.count} | Last seen: {e.lastSeen}
              </p>
            </div>
            <button
              data-testid={`acknowledge-btn-${e.id}`}
              onClick={() => onAcknowledgeError(e.id)}
              className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
            >
              Acknowledge
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
