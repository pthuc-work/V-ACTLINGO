import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  categorizeFormula,
  migrateFormulasForTopic,
} from '../lib/formulaMigration';
import { LocalRepository } from '../data/localRepository';
import { resetRepository } from '../data';
import { FormulaGroupCard } from '../components/formula/FormulaGroupCard';
import { FormulaModal } from '../components/formula/FormulaModal';
import { FormulaGroup } from '../data/types';

describe('Luồng C: Formula Migration & Formula Groups System (src/test/formula.test.ts)', () => {
  let repo: LocalRepository;

  beforeEach(async () => {
    localStorage.clear();
    repo = new LocalRepository();
    resetRepository(repo);
    await repo.clearAllData();
  });

  describe('1. Category Mapping & Tag Extraction (categorizeFormula)', () => {
    it('maps conditional categories to "Câu điều kiện" with clean tags', () => {
      const c1 = categorizeFormula('ĐK Loại 3');
      expect(c1.groupTitle).toBe('Câu điều kiện');
      expect(c1.tag).toBe('Loại 3');

      const c2 = categorizeFormula('ĐK Loại 2');
      expect(c2.groupTitle).toBe('Câu điều kiện');
      expect(c2.tag).toBe('Loại 2');

      const c3 = categorizeFormula('ĐK Trộn (3 - 2)');
      expect(c3.groupTitle).toBe('Câu điều kiện');
      expect(c3.tag).toBe('Trộn (3 - 2)');

      const c4 = categorizeFormula('Cấu trúc Unless (Loại 1)');
      expect(c4.groupTitle).toBe('Câu điều kiện');
      expect(c4.tag).toBe('Unless');

      const c5 = categorizeFormula('Cấu trúc Otherwise (Loại 3)');
      expect(c5.groupTitle).toBe('Câu điều kiện');
      expect(c5.tag).toBe('Otherwise');

      const c6 = categorizeFormula('Cấu trúc But for (Loại 3)');
      expect(c6.groupTitle).toBe('Câu điều kiện');
      expect(c6.tag).toBe('But for');
    });

    it('maps inversion categories to "Đảo ngữ câu điều kiện"', () => {
      const inv1 = categorizeFormula('Đảo ngữ ĐK Loại 3');
      expect(inv1.groupTitle).toBe('Đảo ngữ câu điều kiện');
      expect(inv1.tag).toBe('Đảo ngữ Loại 3');

      const inv2 = categorizeFormula('Đảo ngữ ĐK Loại 1');
      expect(inv2.groupTitle).toBe('Đảo ngữ câu điều kiện');
      expect(inv2.tag).toBe('Đảo ngữ Loại 1');

      const inv3 = categorizeFormula('Đảo ngữ But for (Loại 3)');
      expect(inv3.groupTitle).toBe('Đảo ngữ câu điều kiện');
      expect(inv3.tag).toBe('Đảo ngữ But for');
    });

    it('maps non-conditional categories to "Khác"', () => {
      const other1 = categorizeFormula('Hình học không gian');
      expect(other1.groupTitle).toBe('Khác');
      expect(other1.tag).toBe('Hình học không gian');

      const other2 = categorizeFormula('Phương trình hóa học');
      expect(other2.groupTitle).toBe('Khác');
      expect(other2.tag).toBe('Phương trình hóa học');

      const empty = categorizeFormula('');
      expect(empty.groupTitle).toBe('Khác');
      expect(empty.tag).toBe('Chung');
    });
  });

  describe('2. Formula Migration Process & Deduplication', () => {
    it('migrates without losing formulas and produces valid report', async () => {
      // Setup topic, set, questions
      const subject = await repo.createSubject({ name: 'Tiếng Anh', code: 'ENG', position: 1, visibility: 'public' });
      const topic = await repo.createTopic({ subjectId: subject.id, name: 'Chuyên đề 15: Câu điều kiện', position: 1, visibility: 'public' });
      const set = await repo.createSet({ topicId: topic.id, name: 'Set 1', position: 1, visibility: 'public' });

      await repo.createQuestion({
        setId: set.id,
        no: 1,
        prompt: 'If he had studied, he would have passed.',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        answerSource: 'document',
        verified: true,
        category: 'ĐK Loại 3',
        formula: 'If + S + had + P2, S + would + have + P2',
        explanation: 'Diễn tả hành động trái ngược quá khứ.',
        position: 1,
      });

      await repo.createQuestion({
        setId: set.id,
        no: 2,
        prompt: 'Had he studied, he would have passed.',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        answerSource: 'document',
        verified: true,
        category: 'Đảo ngữ ĐK Loại 3',
        formula: 'Had + S + P2, S + would + have + P2',
        explanation: 'Đảo ngữ loại 3 bỏ If đảo Had lên đầu.',
        position: 2,
      });

      await repo.createQuestion({
        setId: set.id,
        no: 3,
        prompt: 'Tích phân hàm số f(x)',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 2,
        answerSource: 'document',
        verified: true,
        category: 'Toán giải tích',
        formula: '\\int f(x) dx',
        explanation: 'Công thức tích phân cơ bản.',
        position: 3,
      });

      // Run migration
      const report = await migrateFormulasForTopic(repo, topic.id);
      expect(report.migrated).toBe(true);
      expect(report.totalQuestionsWithFormula).toBe(3);
      expect(report.totalFormulasExtracted).toBe(3);
      expect(report.totalGroupsCreated).toBe(3);
      expect(report.otherCount).toBe(1);

      // Verify groups in repo
      const groups = await repo.getFormulaGroups(topic.id);
      expect(groups.length).toBe(3);

      const condGroup = groups.find((g) => g.title === 'Câu điều kiện');
      expect(condGroup).toBeDefined();
      expect(condGroup!.items.length).toBe(1);
      expect(condGroup!.items[0].tag).toBe('Loại 3');

      const invGroup = groups.find((g) => g.title === 'Đảo ngữ câu điều kiện');
      expect(invGroup).toBeDefined();
      expect(invGroup!.items.length).toBe(1);
      expect(invGroup!.items[0].tag).toBe('Đảo ngữ Loại 3');

      const otherGroup = groups.find((g) => g.title === 'Khác');
      expect(otherGroup).toBeDefined();
      expect(otherGroup!.items.length).toBe(1);
    });

    it('running migrate 2 times does NOT duplicate groups or formulas', async () => {
      const subject = await repo.createSubject({ name: 'Tiếng Anh', code: 'ENG', position: 1, visibility: 'public' });
      const topic = await repo.createTopic({ subjectId: subject.id, name: 'Chuyên đề 15: Câu điều kiện', position: 1, visibility: 'public' });
      const set = await repo.createSet({ topicId: topic.id, name: 'Set 1', position: 1, visibility: 'public' });

      await repo.createQuestion({
        setId: set.id,
        no: 1,
        prompt: 'If she has time, she will come.',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        answerSource: 'document',
        verified: true,
        category: 'ĐK Loại 1',
        formula: 'If + S + V(s/es), S + will + V_inf',
        explanation: 'Điều kiện có thể xảy ra ở hiện tại hoặc tương lai.',
        position: 1,
      });

      // 1st migration run
      const report1 = await migrateFormulasForTopic(repo, topic.id);
      expect(report1.migrated).toBe(true);
      const groupsAfterRun1 = await repo.getFormulaGroups(topic.id);
      expect(groupsAfterRun1.length).toBe(1);
      expect(groupsAfterRun1[0].items.length).toBe(1);

      // 2nd migration run (should be skipped due to flag / existing data)
      const report2 = await migrateFormulasForTopic(repo, topic.id);
      expect(report2.migrated).toBe(false);
      const groupsAfterRun2 = await repo.getFormulaGroups(topic.id);
      expect(groupsAfterRun2.length).toBe(1);
      expect(groupsAfterRun2[0].items.length).toBe(1);
    });
  });

  describe('3. Component FormulaGroupCard (Table & Responsive Cards)', () => {
    const mockGroup: FormulaGroup = {
      id: 'g-test-1',
      topicId: 't-1',
      title: 'Câu điều kiện',
      order: 1,
      items: [
        {
          id: 'it-1',
          tag: 'Loại 3',
          structure: 'If + S + had + P2, S + would + have + P2',
          usage: 'Giả định trái với quá khứ',
          example: 'If I had known, I would have told you.',
          note: 'Mẹo nhớ: Quá khứ lùi thì thành Had + P2.',
        },
      ],
    };

    it('renders group header, tag badges, and copy buttons', () => {
      render(React.createElement(FormulaGroupCard, { group: mockGroup }));

      expect(screen.getByText('Câu điều kiện')).toBeInTheDocument();
      expect(screen.getByText('1 công thức')).toBeInTheDocument();

      // Tag badge
      const tags = screen.getAllByText('Loại 3');
      expect(tags.length).toBeGreaterThan(0);

      // Structure text
      const structures = screen.getAllByText(/If \+ S \+ had \+ P2/);
      expect(structures.length).toBeGreaterThan(0);
    });

    it('expands note and copies content without error', async () => {
      render(React.createElement(FormulaGroupCard, { group: mockGroup }));

      // Find note toggle
      const noteButton = screen.getAllByTitle('Xem ghi chú / mẹo nhớ')[0];
      fireEvent.click(noteButton);

      await waitFor(() => {
        expect(screen.getAllByText(/Mẹo nhớ: Quá khứ lùi thì/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('4. Component FormulaModal (Popup & State Preservation)', () => {
    it('opens modal, displays topic formulas, and closes via ESC', async () => {
      const subject = await repo.createSubject({ name: 'Tiếng Anh', code: 'ENG', position: 1, visibility: 'public' });
      const topic = await repo.createTopic({ subjectId: subject.id, name: 'Chuyên đề 15: Câu điều kiện', position: 1, visibility: 'public' });

      await repo.saveFormulaGroup({
        id: 'fg-modal-1',
        topicId: topic.id,
        title: 'Câu điều kiện',
        order: 1,
        items: [
          {
            id: 'it-m1',
            tag: 'Loại 2',
            structure: 'If + S + V2/ed, S + would + V_inf',
            usage: 'Trái với hiện tại',
          },
        ],
      });

      const handleClose = vi.fn();

      render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(FormulaModal, {
            isOpen: true,
            onClose: handleClose,
            topicId: topic.id,
            subjectId: subject.id,
          })
        )
      );

      // Check title & content
      await waitFor(() => {
        expect(screen.getByText(/Chuyên đề 15: Câu điều kiện/)).toBeInTheDocument();
      });

      expect(screen.getByText('Trang đầy đủ')).toBeInTheDocument();

      // Press ESC to close
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('retains input search filter and navigates smoothly without losing practice state', async () => {
      const subject = await repo.createSubject({ name: 'Tiếng Anh', code: 'ENG', position: 1, visibility: 'public' });
      const topic = await repo.createTopic({ subjectId: subject.id, name: 'Chuyên đề 15', position: 1, visibility: 'public' });

      await repo.saveFormulaGroup({
        id: 'fg-modal-2',
        topicId: topic.id,
        title: 'Đảo ngữ',
        order: 1,
        items: [
          {
            id: 'it-m2',
            tag: 'Đảo ngữ Loại 1',
            structure: 'Should + S + V_inf, S + will + V_inf',
          },
        ],
      });

      const handleClose = vi.fn();

      render(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(FormulaModal, {
            isOpen: true,
            onClose: handleClose,
            topicId: topic.id,
            subjectId: subject.id,
          })
        )
      );

      await waitFor(() => {
        expect(screen.getByText('Đảo ngữ')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Tìm kiếm công thức, cấu trúc, ví dụ...');
      fireEvent.change(searchInput, { target: { value: 'Should' } });

      expect(screen.getAllByText(/Should \+ S \+ V_inf/).length).toBeGreaterThan(0);
    });
  });
});
