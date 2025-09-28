import { render } from '@testing-library/react';
import Money from '../Money.jsx';

describe('Money Component', () => {
  test('renders positive amounts correctly', () => {
    const { getByText } = render(<Money amount={1234.56} />);
    expect(getByText('$1.2K')).toBeInTheDocument();
  });

  test('renders negative amounts correctly', () => {
    const { getByText } = render(<Money amount={-1234.56} />);
    expect(getByText('$1.2K')).toBeInTheDocument();
  });

  test('shows sign when showSign is true', () => {
    const { getByText } = render(<Money amount={500} showSign />);
    expect(getByText('+$500')).toBeInTheDocument();
  });

  test('shows negative sign when showSign is true', () => {
    const { getByText } = render(<Money amount={-500} showSign />);
    expect(getByText('-$500')).toBeInTheDocument();
  });

  test('formats large amounts in millions', () => {
    const { getByText } = render(<Money amount={2500000} />);
    expect(getByText('$2.5M')).toBeInTheDocument();
  });

  test('formats amounts in thousands', () => {
    const { getByText } = render(<Money amount={2500} />);
    expect(getByText('$2.5K')).toBeInTheDocument();
  });

  test('formats small amounts without suffix', () => {
    const { getByText } = render(<Money amount={500} />);
    expect(getByText('$500')).toBeInTheDocument();
  });

  test('applies color classes when showSign is true', () => {
    const { container: positiveContainer } = render(
      <Money amount={500} showSign className="test-class" />
    );
    expect(positiveContainer.firstChild).toHaveClass('text-success');

    const { container: negativeContainer } = render(
      <Money amount={-500} showSign className="test-class" />
    );
    expect(negativeContainer.firstChild).toHaveClass('text-danger');
  });

  test('applies custom className', () => {
    const { container } = render(<Money amount={500} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('handles zero amount', () => {
    const { getByText } = render(<Money amount={0} />);
    expect(getByText('$0')).toBeInTheDocument();
  });
});