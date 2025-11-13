import { render, screen } from '@testing-library/react';
import { KpiCard } from '@/components/common/KpiCard';

describe('KpiCard', () => {
  it('renders title and value', () => {
    render(<KpiCard title="Total Revenue" value="₹15,000" />);
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('₹15,000')).toBeInTheDocument();
  });

  it('displays positive change correctly', () => {
    render(<KpiCard title="Users" value={100} change={12.5} />);
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('displays negative change correctly', () => {
    render(<KpiCard title="Users" value={100} change={-5.2} />);
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });
});
