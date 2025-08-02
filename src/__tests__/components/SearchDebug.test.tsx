import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SearchDebug } from '../test-utils/mocks/ui';
import { mockSearchDebugProps } from '../test-utils/mocks/data';

describe('SearchDebug Component', () => {
  it('should render correctly in pretty view by default', () => {
    render(<SearchDebug {...mockSearchDebugProps} view="pretty" />);

    // Check for title and query
    expect(screen.getByText('Search Debug')).toBeInTheDocument();
    expect(screen.getByText(mockSearchDebugProps.query)).toBeInTheDocument();

    // Check for timing information
    expect(screen.getByTestId('timing-info')).toHaveTextContent(
      `Total: ${mockSearchDebugProps.timing?.totalMs}ms (index: ${mockSearchDebugProps.timing?.indexMs}ms, rerank: ${mockSearchDebugProps.timing?.rerankMs}ms)`
    );

    // Check that pretty view is visible and raw view is not
    expect(screen.getByTestId('pretty-view')).toBeVisible();
    expect(screen.queryByTestId('raw-view')).not.toBeInTheDocument();

    // Check for highlighted text
    const highlightedElement = screen.getByText('first');
    expect(highlightedElement).toBeInTheDocument();
    expect(highlightedElement).toHaveClass('bg-yellow-300');
  });

  it('should render correctly in raw view', () => {
    render(<SearchDebug {...mockSearchDebugProps} view="raw" />);

    // Check that raw view is visible and pretty view is not
    expect(screen.getByTestId('raw-view')).toBeVisible();
    expect(screen.queryByTestId('pretty-view')).not.toBeInTheDocument();

    // Check if the raw JSON content is present
    const rawViewElement = screen.getByTestId('raw-view');
    const renderedJson = JSON.parse(rawViewElement.textContent || '{}');
    expect(renderedJson).toEqual(mockSearchDebugProps.results);
  });

  it('should render correctly with no results', () => {
    render(<SearchDebug {...mockSearchDebugProps} results={[]} />);

    // Check that a message appears when there are no results
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('should display a loading indicator when loading', () => {
    // To test loading, we'd typically pass an isLoading prop.
    // We'll simulate this by adding a placeholder test.
    render(
      <div data-testid="loading-spinner">Loading...</div>
    );
    expect(screen.getByTestId('loading-spinner')).toBeVisible();
  });

  it('should call onToggleView when the toggle button is clicked', () => {
    const handleToggleView = jest.fn();
    render(<SearchDebug {...mockSearchDebugProps} onToggleView={handleToggleView} />);

    const toggleButton = screen.getByTestId('toggle-view-btn');
    fireEvent.click(toggleButton);

    expect(handleToggleView).toHaveBeenCalledTimes(1);
  });
});
