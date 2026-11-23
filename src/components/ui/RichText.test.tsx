import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RichText, tokenizeMath } from './RichText';

describe('RichText Tokenizer', () => {
  it('tokenizes plain text', () => {
    const tokens = tokenizeMath('Chào mừng bạn đến với V-ACT HUB');
    expect(tokens).toEqual([
      { type: 'text', content: 'Chào mừng bạn đến với V-ACT HUB' },
    ]);
  });

  it('tokenizes inline math with dollar signs', () => {
    const tokens = tokenizeMath('Giá trị của $x + y = 10$ là nghiệm');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: 'text', content: 'Giá trị của ' });
    expect(tokens[1]).toEqual({
      type: 'inline-math',
      content: 'x + y = 10',
      raw: '$x + y = 10$',
    });
    expect(tokens[2]).toEqual({ type: 'text', content: ' là nghiệm' });
  });

  it('tokenizes display math with double dollars', () => {
    const tokens = tokenizeMath('Công thức:\n$$\\int_0^1 x^2 dx = \\frac{1}{3}$$\nÁp dụng.');
    expect(tokens[1]).toEqual({
      type: 'display-math',
      content: '\\int_0^1 x^2 dx = \\frac{1}{3}',
      raw: '$$\\int_0^1 x^2 dx = \\frac{1}{3}$$',
    });
  });

  it('tokenizes mhchem formula', () => {
    const tokens = tokenizeMath('Cho phản ứng: \\ce{2H2 + O2 -> 2H2O} tỏa nhiệt');
    expect(tokens[1]).toEqual({
      type: 'chem',
      content: '\\ce{2H2 + O2 -> 2H2O}',
      raw: '\\ce{2H2 + O2 -> 2H2O}',
    });
  });

  it('handles escaped dollar signs properly', () => {
    const tokens = tokenizeMath('Giá bán là \\$50 và \\$100');
    expect(tokens).toEqual([
      { type: 'text', content: 'Giá bán là $50 và $100' },
    ]);
  });
});

describe('RichText Component', () => {
  it('renders plain text content without math', () => {
    render(<RichText content="Câu hỏi số 1: Chọn đáp án đúng." />);
    expect(screen.getByText('Câu hỏi số 1: Chọn đáp án đúng.')).toBeInTheDocument();
  });

  it('renders inline math with KaTeX', () => {
    render(<RichText content="Biểu thức năng lượng $E = mc^2$ của Einstein." />);
    expect(screen.getByText(/Biểu thức năng lượng/)).toBeInTheDocument();
    const mathEl = screen.getByTestId('inline-math');
    expect(mathEl).toBeInTheDocument();
    expect(mathEl.querySelector('.katex')).not.toBeNull();
  });

  it('renders display math with KaTeX', () => {
    render(
      <RichText content="Tích phân gauss: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$ kết quả." />
    );
    const displayEl = screen.getByTestId('display-math');
    expect(displayEl).toBeInTheDocument();
    expect(displayEl.querySelector('.katex-display')).not.toBeNull();
  });

  it('renders standalone mhchem chemical equation', () => {
    render(
      <RichText content="Phương trình hóa học: \\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}" />
    );
    const chemEl = screen.getByTestId('inline-math');
    expect(chemEl).toBeInTheDocument();
    expect(chemEl.querySelector('.katex')).not.toBeNull();
    expect(chemEl.innerHTML).toContain('H');
  });

  it('renders mhchem inside inline math ($...$)', () => {
    render(
      <RichText content="Nước có công thức phân tử là $\\ce{H2O}$." />
    );
    const mathEl = screen.getByTestId('inline-math');
    expect(mathEl).toBeInTheDocument();
    expect(mathEl.querySelector('.katex')).not.toBeNull();
  });

  it('handles syntax errors gracefully without crashing and displays warning icon with raw formula', () => {
    // Deliberate invalid LaTeX syntax: unclosed \frac
    render(<RichText content="Công thức bị lỗi: $\\frac{1}{$ ở đây." />);
    
    // Check that fallback math-error element is rendered
    const errorEl = screen.getByTestId('math-error');
    expect(errorEl).toBeInTheDocument();
    
    // Shows the raw formula text
    expect(errorEl).toHaveTextContent('$\\\\frac{1}{$');
    
    // Has a title tooltip explaining the syntax error
    expect(errorEl).toHaveAttribute('title');
    expect(errorEl.getAttribute('title')).toContain('KaTeX parse error');

    // Has the warning icon inside
    expect(errorEl.querySelector('svg')).not.toBeNull();

    // Surrounding text is still intact
    expect(screen.getByText(/Công thức bị lỗi:/)).toBeInTheDocument();
    expect(screen.getByText(/ở đây\./)).toBeInTheDocument();
  });

  it('supports passing content via children', () => {
    render(<RichText>Tính định thức $\det(A) = 0$</RichText>);
    expect(screen.getByTestId('inline-math')).toBeInTheDocument();
    expect(screen.getByText(/Tính định thức/)).toBeInTheDocument();
  });

  it('supports custom tag element via "as" prop', () => {
    const { container } = render(
      <RichText as="div" className="custom-question" content="Đoạn văn $f(x)$" />
    );
    const divWrapper = container.querySelector('div.custom-question');
    expect(divWrapper).not.toBeNull();
  });

  it('returns null when content is empty', () => {
    const { container } = render(<RichText content="" />);
    expect(container.firstChild).toBeNull();
  });
});
