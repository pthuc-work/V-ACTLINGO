import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ImportPage } from '../pages/ImportPage';
import { ToastProvider } from '../components/ui';
import { LocalRepository } from '../data/localRepository';
import { loadSeedData } from '../data/seed';

describe('Import Page UI & Responsive System (Stream B)', () => {
  let repo: LocalRepository;

  beforeEach(async () => {
    localStorage.clear();
    repo = new LocalRepository();
    await repo.clearAllData();
    await loadSeedData(repo);
  });

  const renderImportPage = async (initialUrl = '/import') => {
    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        React.createElement(
          ToastProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: [initialUrl] },
            React.createElement(
              Routes,
              null,
              React.createElement(Route, { path: '/import', element: React.createElement(ImportPage) }),
              React.createElement(Route, {
                path: '/roadmap',
                element: React.createElement('div', { 'data-testid': 'roadmap-mock-page' }, 'Roadmap Page'),
              })
            )
          )
        )
      );
    });
    return result!;
  };

  describe('Header Trang (Mục 2 & Mục 5)', () => {
    it('hiển thị đầy đủ icon, tiêu đề 1 dòng, mô tả và badge schema', async () => {
      await renderImportPage();

      const header = screen.getByTestId('import-header');
      expect(header).toBeDefined();

      // Desktop: 1 hàng ngang (md:flex-row md:items-center md:justify-between)
      expect(header.className).toContain('md:flex-row');
      expect(header.className).toContain('md:items-center');
      expect(header.className).toContain('md:justify-between');

      // Mobile: xếp dọc (flex-col)
      expect(header.className).toContain('flex-col');

      // Tiêu đề 1 dòng truncate
      const title = screen.getByText('Số hóa đề thi bằng AI');
      expect(title).toBeDefined();
      expect(title.className).toContain('truncate');

      // Badge schema v1 nằm cùng hàng
      const badge = screen.getByTestId('import-schema-badge');
      expect(badge).toBeDefined();
      expect(badge.textContent).toContain('Định dạng chuẩn Schema v1');
    });
  });

  describe('Stepper Ngang Full-Width (Mục 2)', () => {
    it('thay thế tab cũ, có 3 bước full-width, không bao giờ tràn khung', async () => {
      await renderImportPage();

      const stepper = screen.getByTestId('import-stepper');
      expect(stepper).toBeDefined();
      expect(stepper.className).toContain('w-full');

      const gridContainer = stepper.querySelector('div');
      expect(gridContainer?.className).toContain('grid-cols-3');
      expect(gridContainer?.className).toContain('w-full');

      // 3 Bước: Tạo Prompt, Nhập JSON, Xem trước & Sửa
      const stepButtons = stepper.querySelectorAll('button');
      expect(stepButtons.length).toBe(3);

      const step1 = stepButtons[0];
      const step2 = stepButtons[1];
      const step3 = stepButtons[2];

      // Step 1: Active ban đầu
      expect(step1.getAttribute('data-status')).toBe('active');
      expect(step2.getAttribute('data-status')).toBe('pending');
      expect(step3.getAttribute('data-status')).toBe('pending');

      // Nhãn có phiên bản rút gọn cho màn hình hẹp
      expect(step1.textContent).toContain('1. Tạo Prompt');
      expect(step1.textContent).toContain('Tạo Prompt');
      expect(step2.textContent).toContain('2. Nhập JSON');
      expect(step3.textContent).toContain('3. Xem trước & Sửa');
    });

    it('chuyển trạng thái active/completed/pending khi bấm chuyển bước', async () => {
      await renderImportPage();

      const stepper = screen.getByTestId('import-stepper');
      const stepButtons = stepper.querySelectorAll('button');

      // Bấm sang Bước 2: Nhập JSON
      await act(async () => {
        fireEvent.click(stepButtons[1]);
      });

      expect(stepButtons[0].getAttribute('data-status')).toBe('completed');
      expect(stepButtons[1].getAttribute('data-status')).toBe('active');
      expect(stepButtons[2].getAttribute('data-status')).toBe('pending');

      // Bấm sang Bước 3: Xem trước & Sửa
      await act(async () => {
        fireEvent.click(stepButtons[2]);
      });

      expect(stepButtons[0].getAttribute('data-status')).toBe('completed');
      expect(stepButtons[1].getAttribute('data-status')).toBe('completed');
      expect(stepButtons[2].getAttribute('data-status')).toBe('active');
    });
  });

  describe('Bước 1: Cấu trúc 2 cột trên Desktop (≥1100px) & 1 cột trên Mobile (<1100px)', () => {
    it('bố cục Bước 1 có 2 cột khi ≥1100px và xếp dọc khi <1100px', async () => {
      await renderImportPage();

      const step1Container = screen.getByTestId('import-step-1');
      expect(step1Container).toBeDefined();

      // Mobile: flex-col, Desktop: min-[1100px]:flex-row
      expect(step1Container.className).toContain('flex-col');
      expect(step1Container.className).toContain('min-[1100px]:flex-row');

      // Chiều cao theo cửa sổ calc(100dvh-220px) trên desktop
      expect(step1Container.className).toContain('min-[1100px]:h-[calc(100dvh-220px)]');

      // Cột trái ~380px, cuộn riêng
      const leftCol = step1Container.children[0];
      expect(leftCol.className).toContain('min-[1100px]:w-[380px]');
      expect(leftCol.className).toContain('min-[1100px]:overflow-y-auto');

      // Cột phải chiếm phần còn lại
      const rightCol = step1Container.children[1];
      expect(rightCol.className).toContain('flex-1');
      expect(rightCol.className).toContain('min-[1100px]:h-full');
    });

    it('có nút "Sao chép Prompt" và "Sang tab Nhập JSON" cố định ở thanh trên khung prompt', async () => {
      await renderImportPage();

      const copyBtn = screen.getByTestId('copy-prompt-top-btn');
      expect(copyBtn).toBeDefined();
      expect(copyBtn.textContent).toContain('Sao chép Prompt');

      const gotoInputBtn = screen.getByTestId('goto-input-tab-btn');
      expect(gotoInputBtn).toBeDefined();
      expect(gotoInputBtn.textContent).toContain('Sang tab Nhập JSON');

      // Bấm nút chuyển sang Tab Nhập JSON
      await act(async () => {
        fireEvent.click(gotoInputBtn);
      });

      // Kiểm tra chuyển sang Bước 2
      expect(screen.getByTestId('import-step-2')).toBeDefined();
    });
  });

  describe('Tự động điền Môn học / Chuyên đề từ Query Params', () => {
    it('tự động điền đúng tên môn và chuyên đề khi nhận subjectName & topicName', async () => {
      const customUrl = '/import?subjectName=Ti%E1%BA%BFng%20Anh&topicName=Chuy%C3%AAn%20%C4%91%E1%BB%81%2015:%20C%C3%A2u%20%C4%91i%E1%BB%81u%20ki%E1%BB%87n';
      await renderImportPage(customUrl);

      const topicInput = screen.getByLabelText('Tên Chuyên đề') as HTMLInputElement;
      expect(topicInput.value).toBe('Chuyên đề 15: Câu điều kiện');

      const subjectSelect = screen.getByLabelText('Môn học') as HTMLSelectElement;
      expect(subjectSelect.value).toBe('Tiếng Anh');
    });

    it('tự động tra cứu và điền đúng môn / chuyên đề khi nhận subjectId & topicId', async () => {
      const subs = await repo.getSubjects();
      expect(subs.length).toBeGreaterThan(0);
      const subject = subs[0];
      const topics = await repo.getTopics(subject.id);
      expect(topics.length).toBeGreaterThan(0);
      const topic = topics[0];

      const urlWithIds = `/import?subjectId=${subject.id}&topicId=${topic.id}`;
      await renderImportPage(urlWithIds);

      await waitFor(() => {
        const topicInput = screen.getByLabelText('Tên Chuyên đề') as HTMLInputElement;
        expect(topicInput.value).toBe(topic.name);
      });
    });
  });

  describe('Bước 2 (Nhập JSON) & Bước 3 (Xem trước & Sửa) Layout & Chức năng', () => {
    const sampleJson = JSON.stringify({
      schemaVersion: 1,
      subject: 'Tiếng Anh',
      topic: 'Chuyên đề 15: Câu điều kiện',
      set: 'Bài tập áp dụng',
      questions: [
        {
          no: 1,
          prompt: 'If she had studied harder, she ______ the exam.',
          options: ['will pass', 'would pass', 'would have passed', 'passes'],
          correctIndex: 2,
          answerSource: 'user',
          verified: true,
          category: 'Câu điều kiện loại 3',
          formula: 'If + had + V3, would have + V3',
          explanation: 'Diễn tả điều kiện trái với quá khứ',
        },
        {
          no: 2,
          prompt: 'If it rains tomorrow, we ______ the picnic.',
          options: ['cancel', 'will cancel', 'would cancel', 'cancelled'],
          correctIndex: 1,
          answerSource: 'ai',
          verified: false,
          category: 'Câu điều kiện loại 1',
        },
      ],
    });

    it('phân tích JSON thành công và hiển thị tiến trình multipart', async () => {
      await renderImportPage();

      // Sang Bước 2
      const stepper = screen.getByTestId('import-stepper');
      const stepButtons = stepper.querySelectorAll('button');
      await act(async () => {
        fireEvent.click(stepButtons[1]);
      });

      const textarea = screen.getByPlaceholderText(/Dán JSON của chatbot vào đây/i);
      await act(async () => {
        fireEvent.change(textarea, { target: { value: sampleJson } });
      });

      const parseBtn = screen.getByText('Phân tích & Thêm phần này');
      await act(async () => {
        fireEvent.click(parseBtn);
      });

      // Multipart Tracker hiển thị đã nhận 1 phần và 2 câu
      expect(screen.getByText(/Tiến độ ghép nhiều phần/i)).toBeDefined();
      expect(screen.getAllByText(/2 câu hỏi/i).length).toBeGreaterThan(0);
    });

    it('Bước 3: Hiển thị 2 cột trên Desktop (≥1100px) và thu gọn dropdown trên Mobile (<1100px)', async () => {
      await renderImportPage();

      // Sang Bước 2 và nạp dữ liệu
      const stepper = screen.getByTestId('import-stepper');
      const stepButtons = stepper.querySelectorAll('button');
      await act(async () => {
        fireEvent.click(stepButtons[1]);
      });

      const textarea = screen.getByPlaceholderText(/Dán JSON của chatbot vào đây/i);
      await act(async () => {
        fireEvent.change(textarea, { target: { value: sampleJson } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Phân tích & Thêm phần này'));
      });

      // Bấm nút Xem trước sang Bước 3
      await act(async () => {
        fireEvent.click(screen.getByText(/Xem trước \(2 câu\)/i));
      });

      expect(screen.getByTestId('import-step-3')).toBeDefined();

      // Trên desktop: Cột danh sách câu hỏi cố định hiển thị bên trái (min-[1100px]:flex)
      const desktopList = screen.getByTestId('desktop-question-list');
      expect(desktopList.className).toContain('hidden');
      expect(desktopList.className).toContain('min-[1100px]:flex');
      expect(desktopList.className).toContain('min-[1100px]:w-[340px]');

      // Trên mobile: Khung chọn câu thu gọn compact hiển thị (min-[1100px]:hidden)
      const compactNav = screen.getByTestId('compact-question-nav');
      expect(compactNav.className).toContain('min-[1100px]:hidden');

      // Form chỉnh sửa câu chiếm toàn bộ chiều ngang
      const mainEditor = screen.getByTestId('question-editor-main');
      expect(mainEditor.className).toContain('flex-1');
      expect(mainEditor.className).toContain('w-full');

      // Kiểm tra đầy đủ thông tin câu hỏi
      expect(screen.getByText(/Chỉnh sửa Câu 1/i)).toBeDefined();
      expect(screen.getByDisplayValue('Câu điều kiện loại 3')).toBeDefined();
      expect(screen.getByDisplayValue('If + had + V3, would have + V3')).toBeDefined();
    });

    it('hỗ trợ mở Modal Nhập đáp án nhanh và đối chiếu đáp án', async () => {
      await renderImportPage();

      // Sang Bước 2 và nạp dữ liệu
      const stepper = screen.getByTestId('import-stepper');
      const stepButtons = stepper.querySelectorAll('button');
      await act(async () => {
        fireEvent.click(stepButtons[1]);
      });

      const textarea = screen.getByPlaceholderText(/Dán JSON của chatbot vào đây/i);
      await act(async () => {
        fireEvent.change(textarea, { target: { value: sampleJson } });
      });
      await act(async () => {
        fireEvent.click(screen.getByText('Phân tích & Thêm phần này'));
      });

      // Sang Bước 3
      await act(async () => {
        fireEvent.click(screen.getByText(/Xem trước \(2 câu\)/i));
      });

      // Bấm nút "Nhập đáp án nhanh"
      const quickAnsBtn = screen.getByText('Nhập đáp án nhanh');
      await act(async () => {
        fireEvent.click(quickAnsBtn);
      });

      expect(screen.getByText(/Nhập đáp án nhanh \(Quick Answer\)/i)).toBeDefined();

      // Nhập chuỗi đáp án "1C 2B"
      const quickInput = screen.getByPlaceholderText(/Ví dụ: 1A 2B 3C/i);
      await act(async () => {
        fireEvent.change(quickInput, { target: { value: '1C 2B' } });
      });

      // Đối chiếu với AI
      await act(async () => {
        fireEvent.click(screen.getByText('Đối chiếu với AI'));
      });

      expect(screen.getAllByText('Trùng khớp / Điền mới').length).toBeGreaterThan(0);

      // Bấm Áp dụng đáp án
      await act(async () => {
        fireEvent.click(screen.getByText('Áp dụng đáp án'));
      });
    });

    it('lưu thành công vào Lesson Repository và chuyển hướng về Roadmap', async () => {
      await renderImportPage();

      // Sang Bước 2 và nạp dữ liệu
      const stepper = screen.getByTestId('import-stepper');
      const stepButtons = stepper.querySelectorAll('button');
      await act(async () => {
        fireEvent.click(stepButtons[1]);
      });

      const textarea = screen.getByPlaceholderText(/Dán JSON của chatbot vào đây/i);
      await act(async () => {
        fireEvent.change(textarea, { target: { value: sampleJson } });
      });
      await act(async () => {
        fireEvent.click(screen.getByText('Phân tích & Thêm phần này'));
      });

      // Sang Bước 3
      await act(async () => {
        fireEvent.click(screen.getByText(/Xem trước \(2 câu\)/i));
      });

      // Bấm "Lưu vào bài học & Mở Lộ trình"
      const saveBtn = screen.getByText('Lưu vào bài học & Mở Lộ trình');
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      // Chờ chuyển hướng tới /roadmap
      await waitFor(
        () => {
          expect(screen.getByTestId('roadmap-mock-page')).toBeDefined();
        },
        { timeout: 2500 }
      );
    });
  });
});
