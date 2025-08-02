import { SearchDebugProps, SearchComparisonProps, ErrorMetricsProps } from './ui';

// Mock Data for SearchDebug Component
export const mockSearchDebugProps: SearchDebugProps = {
  query: 'test query for debugging',
  results: [
    {
      id: 'doc1',
      score: 0.98,
      snippet: 'This is the first document snippet, which contains important information.',
      highlights: [{ start: 12, end: 17 }],
    },
    {
      id: 'doc2',
      score: 0.85,
      snippet: 'The second document is less relevant but still useful.',
      highlights: [],
    },
  ],
  timing: {
    totalMs: 120,
    indexMs: 80,
    rerankMs: 40,
  },
  view: 'pretty',
  onToggleView: () => console.log('Toggled view'),
};

// Mock Data for SearchComparison Component
export const mockSearchComparisonProps: SearchComparisonProps = {
  v1Results: [
    { id: 'v1-doc1', score: 0.95, snippet: 'V1 search found this primary result.' },
    { id: 'v1-doc2', score: 0.75, snippet: 'This is a secondary result from V1.' },
  ],
  v2Results: [
    { id: 'v2-doc1', score: 0.99, snippet: 'V2 search located a better primary result.' },
    { id: 'v2-doc3', score: 0.82, snippet: 'V2 also found this other relevant document.' },
  ],
  onSelectResult: (id, version) => console.log(`Selected ${id} from ${version}`),
};

// Mock Data for ErrorMetrics Component
export const mockErrorMetricsProps: ErrorMetricsProps = {
  errors: [
    {
      id: 'err-001',
      message: 'API timeout connecting to upstream service',
      count: 42,
      lastSeen: '2023-10-27T10:00:00Z',
    },
    {
      id: 'err-002',
      message: 'Invalid user input: missing required fields',
      count: 15,
      lastSeen: '2023-10-27T09:30:00Z',
    },
    {
      id: 'err-003',
      message: 'Database connection pool exhausted',
      count: 5,
      lastSeen: '2023-10-26T15:00:00Z',
    },
  ],
  onAcknowledgeError: (id) => console.log(`Acknowledged error ${id}`),
};
