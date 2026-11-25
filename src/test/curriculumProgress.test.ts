import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getRepository, resetRepository } from '../data';
import { useCurriculumStore } from '../store/curriculumStore';
import { calculateTopicProgress } from '../lib/progress';
import { exportFullBackup, restoreFullBackup } from '../lib/backup';
import { FullBackupData, Subject, Topic, SetEntity, Question, FormulaGroup } from '../data/types';
import { RoadmapPage } from '../pages/RoadmapPage';
import { ToastProvider } from '../components/ui';

const renderWithProviders = async (ui: React.ReactElement, initialRoute = '/') => {
  let result: any;
  await act(async () => {
    result = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(MemoryRouter, { initialEntries: [initialRoute] }, ui)
      )
    );
  });
  return result;
};

describe('Luồng D: Chuyển Môn, Thống Nhất Tiến Độ & Sao Lưu v2 (src/test/curriculumProgress.test.ts)', () => {
  beforeEach(async () => {
    resetRepository();
    const repo = getRepository();
    await repo.clearAllData();
    useCurriculumStore.getState().resetCurriculum();
    localStorage.clear();
    sessionStorage.setItem('vact_welcomed_session', 'true');
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // =========================================================================
  // 1. TEST ĐỔI MÔN A -> B -> A KHÔI PHỤC ĐÚNG TOPIC CỦA A
  // =========================================================================
  describe('1. Đổi môn A → B → A và Nguồn Chân Lý duy nhất', () => {
    it('khôi phục chính xác topic đã học của môn A khi chuyển A -> B -> A', () => {
      const store = useCurriculumStore.getState();

      // Subject A có 2 topics: A1, A2
      // Lần đầu vào môn A -> chọn A1
      store.selectSubject('subj_a', ['top_a1', 'top_a2']);
      expect(useCurriculumStore.getState().selectedSubjectId).toBe('subj_a');
      expect(useCurriculumStore.getState().selectedTopicId).toBe('top_a1');

      // Người dùng chuyển sang học topic A2
      useCurriculumStore.getState().setSelectedTopicId('top_a2');
      expect(useCurriculumStore.getState().selectedTopicId).toBe('top_a2');
      expect(useCurriculumStore.getState().lastTopicBySubject['subj_a']).toBe('top_a2');

      // Người dùng chuyển sang môn B (chưa từng học bao giờ) -> tự chọn topic B1
      useCurriculumStore.getState().selectSubject('subj_b', ['top_b1', 'top_b2']);
      expect(useCurriculumStore.getState().selectedSubjectId).toBe('subj_b');
      expect(useCurriculumStore.getState().selectedTopicId).toBe('top_b1');

      // Người dùng chuyển sang học topic B2
      useCurriculumStore.getState().setSelectedTopicId('top_b2');
      expect(useCurriculumStore.getState().selectedTopicId).toBe('top_b2');
      expect(useCurriculumStore.getState().lastTopicBySubject['subj_b']).toBe('top_b2');

      // Người dùng quay lại môn A -> KHÔI PHỤC ĐÚNG TOPIC A2!
      useCurriculumStore.getState().selectSubject('subj_a', ['top_a1', 'top_a2']);
      expect(useCurriculumStore.getState().selectedSubjectId).toBe('subj_a');
      expect(useCurriculumStore.getState().selectedTopicId).toBe('top_a2');

      // Người dùng quay lại môn B -> KHÔI PHỤC ĐÚNG TOPIC B2!
      useCurriculumStore.getState().selectSubject('subj_b', ['top_b1', 'top_b2']);
      expect(useCurriculumStore.getState().selectedSubjectId).toBe('subj_b');
      expect(useCurriculumStore.getState().selectedTopicId).toBe('top_b2');
    });

    it('persist trạng thái vact_active_curriculum vào localStorage', () => {
      const store = useCurriculumStore.getState();
      store.selectSubject('subj_math', ['top_m1', 'top_m2']);
      store.setSelectedTopicId('top_m2');

      const saved = localStorage.getItem('vact_active_curriculum');
      expect(saved).toBeTruthy();
      const parsed = JSON.parse(saved!);
      expect(parsed.state.selectedSubjectId).toBe('subj_math');
      expect(parsed.state.selectedTopicId).toBe('top_m2');
      expect(parsed.state.lastTopicBySubject['subj_math']).toBe('top_m2');
    });
  });

  // =========================================================================
  // 2. TEST MÔN TRỐNG KHÔNG HIỆN BÀI CỦA MÔN KHÁC & EMPTY STATE
  // =========================================================================
  describe('2. Xử lý Môn Trống & Không hiện bài của môn khác', () => {
    it('set selectedTopicId = null khi môn chưa có chuyên đề nào', () => {
      const store = useCurriculumStore.getState();
      store.selectSubject('subj_empty', []);

      expect(useCurriculumStore.getState().selectedSubjectId).toBe('subj_empty');
      expect(useCurriculumStore.getState().selectedTopicId).toBeNull();
    });

    it('RoadmapPage hiển thị Empty State chuẩn và nút Import dẫn tới đúng subjectId khi môn trống', async () => {
      const repo = getRepository();
      // Tạo môn Sinh học trống
      await repo.createSubject({
        id: 'subj_bio',
        userId: 'u1',
        name: 'Sinh học',
        code: 'BIO',
        position: 0,
        visibility: 'private',
      });

      // Tạo môn Tiếng Anh có bài (để kiểm tra xem bài Tiếng Anh có bị rò rỉ sang Sinh học không)
      await repo.createSubject({
        id: 'subj_eng',
        userId: 'u1',
        name: 'Tiếng Anh',
        code: 'ENG',
        position: 1,
        visibility: 'private',
      });
      await repo.createTopic({
        id: 'top_eng_1',
        userId: 'u1',
        subjectId: 'subj_eng',
        name: 'Chuyên đề Câu điều kiện',
        position: 0,
        visibility: 'private',
      });
      await repo.createSet({
        id: 'set_eng_1',
        userId: 'u1',
        topicId: 'top_eng_1',
        name: 'Bài luyện 1',
        position: 0,
        visibility: 'private',
      });

      // Đặt active subject là môn Sinh học
      useCurriculumStore.getState().selectSubject('subj_bio', []);

      await renderWithProviders(React.createElement(RoadmapPage));

      // Kiểm tra Empty State của Sinh học
      expect(screen.getByText(/Chưa có bài nào cho môn Sinh học/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Import tài liệu/i).length).toBeGreaterThan(0);

      // Kiểm tra TUYỆT ĐỐI KHÔNG hiển thị bài của môn Tiếng Anh
      expect(screen.queryByText(/Chuyên đề Câu điều kiện/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Bài luyện 1/i)).not.toBeInTheDocument();

      // Nút "Tiếp tục học ngay" phải bị vô hiệu hóa
      const continueBtn = screen.getByRole('button', { name: /Tiếp tục học ngay/i });
      expect(continueBtn).toBeDisabled();
    });
  });

  // =========================================================================
  // 3. TEST TÊN + MÔ TẢ BANNER KHỚP TOPIC ĐANG CHỌN (KHÔNG HARDCODE)
  // =========================================================================
  describe('3. Tên và mô tả banner khớp topic đang chọn', () => {
    it('banner lấy đúng topic.name và topic.description, không có mô tả tiếng Anh hardcode khi topic rỗng description', async () => {
      const repo = getRepository();
      await repo.createSubject({
        id: 'subj_math',
        userId: 'u1',
        name: 'Toán học',
        code: 'MATH',
        position: 0,
        visibility: 'private',
      });

      await repo.createTopic({
        id: 'top_math_1',
        userId: 'u1',
        subjectId: 'subj_math',
        name: 'Tích phân hàm ẩn',
        description: '', // Rỗng description
        position: 0,
        visibility: 'private',
      });

      await repo.createSet({
        id: 'set_math_1',
        userId: 'u1',
        topicId: 'top_math_1',
        name: 'Bài tập tích phân 1',
        position: 0,
        visibility: 'private',
      });

      useCurriculumStore.getState().selectSubject('subj_math', ['top_math_1']);

      await renderWithProviders(React.createElement(RoadmapPage));

      // Tên topic hiển thị đúng
      expect(screen.getByText('Tích phân hàm ẩn')).toBeInTheDocument();

      // TUYỆT ĐỐI KHÔNG có text Tiếng Anh hardcode "mệnh đề If" hay "câu điều kiện"
      expect(screen.queryByText(/mệnh đề If/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/câu điều kiện/i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. TEST THỐNG NHẤT TIẾN ĐỘ & ĐỘ CHÍNH XÁC '—' KHI CHƯA LÀM
  // =========================================================================
  describe('4. Thống nhất cách tính tiến độ (calculateTopicProgress)', () => {
    const mockSets = [
      { id: 'set_1', topicId: 'top_1' },
      { id: 'set_2', topicId: 'top_1' },
      { id: 'set_3', topicId: 'top_1' },
    ];

    it('trả về 0% bài, 0 câu và độ chính xác "—" khi chưa làm câu nào', () => {
      const result = calculateTopicProgress(mockSets, []);

      expect(result.completedSets).toBe(0);
      expect(result.totalSets).toBe(3);
      expect(result.formattedSetsProgress).toBe('0/3 bài (0%)');

      expect(result.attemptedQuestions).toBe(0);
      expect(result.totalQuestions).toBe(90);
      expect(result.formattedQuestionsProgress).toBe('0/90 câu');

      expect(result.accuracy).toBeNull();
      expect(result.formattedAccuracy).toBe('—');
    });

    it('tính đúng tiến độ bài, tiến độ câu và độ chính xác khi đã hoàn thành 1 bài', () => {
      const mockProgresses = [
        {
          setId: 'set_1',
          completed: true,
          stars: 3,
          score: 25,
          totalQuestions: 30,
        },
      ];

      const result = calculateTopicProgress(mockSets, mockProgresses);

      expect(result.completedSets).toBe(1);
      expect(result.totalSets).toBe(3);
      expect(result.formattedSetsProgress).toBe('1/3 bài (33%)');

      expect(result.attemptedQuestions).toBe(30);
      expect(result.totalQuestions).toBe(90);
      expect(result.formattedQuestionsProgress).toBe('30/90 câu');

      // 25 / 30 = 83%
      expect(result.accuracy).toBe(83);
      expect(result.formattedAccuracy).toBe('83%');
    });

    it('tính đúng tiến độ câu khi có bài đang làm dở (partial attempts)', () => {
      const mockProgresses = [
        {
          setId: 'set_1',
          completed: true,
          stars: 2,
          score: 20,
          totalQuestions: 30,
        },
        {
          setId: 'set_2',
          completed: false,
          stars: 0,
          attemptsCount: 10,
          score: 8,
          totalQuestions: 30,
        },
      ];

      const result = calculateTopicProgress(mockSets, mockProgresses);

      expect(result.completedSets).toBe(1);
      expect(result.formattedSetsProgress).toBe('1/3 bài (33%)');

      expect(result.attemptedQuestions).toBe(40);
      expect(result.totalQuestions).toBe(90);
      expect(result.formattedQuestionsProgress).toBe('40/90 câu');

      // (20 + 8) / 40 = 28 / 40 = 70%
      expect(result.accuracy).toBe(70);
      expect(result.formattedAccuracy).toBe('70%');
    });

    it('xử lý an toàn khi danh sách sets rỗng', () => {
      const result = calculateTopicProgress([], []);
      expect(result.completedSets).toBe(0);
      expect(result.totalSets).toBe(0);
      expect(result.formattedSetsProgress).toBe('0/0 bài (0%)');
      expect(result.formattedQuestionsProgress).toBe('0/0 câu');
      expect(result.formattedAccuracy).toBe('—');
    });
  });

  // =========================================================================
  // 5. TEST BACKUP ROUNDTRIP VERSION 2 & BACKWARD COMPATIBILITY
  // =========================================================================
  describe('5. Backup version 2, Roundtrip & Backward Compatibility', () => {
    it('xuất file backup version 2 bao gồm formulaGroups và lastTopicBySubject', async () => {
      const repo = getRepository();

      await repo.createSubject({
        id: 's_v2',
        userId: 'u1',
        name: 'Vật Lý',
        code: 'PHY',
        position: 0,
        visibility: 'private',
      });
      await repo.createTopic({
        id: 't_v2',
        userId: 'u1',
        subjectId: 's_v2',
        name: 'Dao động cơ',
        position: 0,
        visibility: 'private',
      });

      const sampleGroup: FormulaGroup = {
        id: 'fg_v2_1',
        topicId: 't_v2',
        title: 'Con lắc lò xo',
        order: 1,
        items: [
          {
            id: 'f_1',
            structure: 'T = 2\\pi \\sqrt{\\frac{m}{k}}',
            tag: 'Chu kỳ',
          },
        ],
      };
      await repo.saveFormulaGroup(sampleGroup);

      useCurriculumStore.getState().selectSubject('s_v2', ['t_v2']);

      const backup = await exportFullBackup(repo);

      expect(backup.version).toBe(2);
      expect(backup.formulaGroups).toBeDefined();
      expect(backup.formulaGroups!.length).toBe(1);
      expect(backup.formulaGroups![0].title).toBe('Con lắc lò xo');

      expect(backup.lastTopicBySubject).toBeDefined();
      expect(backup.lastTopicBySubject!['s_v2']).toBe('t_v2');
    });

    it('chu trình Roundtrip: Backup -> Clear sạch -> Khôi phục giữ nguyên vẹn 100% công thức và lastTopicBySubject', async () => {
      const repo = getRepository();

      await repo.createSubject({
        id: 's_chem',
        userId: 'u1',
        name: 'Hóa học',
        code: 'CHE',
        position: 0,
        visibility: 'private',
      });
      await repo.createTopic({
        id: 't_chem_1',
        userId: 'u1',
        subjectId: 's_chem',
        name: 'Este - Lipit',
        position: 0,
        visibility: 'private',
      });

      const formulaGroup: FormulaGroup = {
        id: 'fg_chem_este',
        topicId: 't_chem_1',
        title: 'Phản ứng thủy phân Este',
        order: 1,
        items: [
          {
            id: 'f_che_1',
            structure: 'RCOOR\' + NaOH \\rightarrow RCOONa + R\'OH',
            tag: 'Xà phòng hóa',
          },
        ],
      };
      await repo.saveFormulaGroup(formulaGroup);

      useCurriculumStore.getState().selectSubject('s_chem', ['t_chem_1']);

      // 1. Export backup v2
      const exportedBackup = await exportFullBackup(repo);

      // 2. Clear all data & reset store
      await repo.clearAllData();
      useCurriculumStore.getState().resetCurriculum();

      // Kiểm tra dữ liệu đã trống
      expect(await repo.getSubjects()).toHaveLength(0);
      expect(await repo.getFormulaGroups()).toHaveLength(0);
      expect(useCurriculumStore.getState().lastTopicBySubject).toEqual({});

      // 3. Restore backup
      const result = await restoreFullBackup(exportedBackup, 'replace', repo);
      expect(result.success).toBe(true);

      // 4. Kiểm tra nguyên vẹn 100%
      const restoredSubjects = await repo.getSubjects();
      expect(restoredSubjects).toHaveLength(1);
      expect(restoredSubjects[0].name).toBe('Hóa học');

      const restoredGroups = await repo.getFormulaGroups('t_chem_1');
      expect(restoredGroups).toHaveLength(1);
      expect(restoredGroups[0].title).toBe('Phản ứng thủy phân Este');
      expect(restoredGroups[0].items[0].structure).toBe('RCOOR\' + NaOH \\rightarrow RCOONa + R\'OH');

      expect(useCurriculumStore.getState().lastTopicBySubject['s_chem']).toBe('t_chem_1');
    });

    it('tương thích ngược 100%: File backup v1 cũ tự chạy migrate công thức và tự chọn topic đầu cho môn thiếu', async () => {
      const repo = getRepository();

      // Giả lập file backup v1 cũ (không có formulaGroups, không có lastTopicBySubject)
      const legacyV1Backup: FullBackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        subjects: [
          {
            id: 'subj_legacy',
            userId: 'u1',
            name: 'Tiếng Anh Cũ',
            code: 'ENG',
            position: 0,
            visibility: 'private',
            createdAt: '',
            updatedAt: '',
          },
        ],
        topics: [
          {
            id: 'top_legacy_1',
            userId: 'u1',
            subjectId: 'subj_legacy',
            name: 'Câu điều kiện cổ điển',
            position: 0,
            visibility: 'private',
            createdAt: '',
            updatedAt: '',
          },
        ],
        sets: [
          {
            id: 'set_legacy_1',
            userId: 'u1',
            topicId: 'top_legacy_1',
            name: 'Bài 1',
            position: 0,
            visibility: 'private',
            createdAt: '',
            updatedAt: '',
          },
        ],
        passages: [],
        questions: [
          {
            id: 'q_legacy_1',
            userId: 'u1',
            setId: 'set_legacy_1',
            no: 1,
            prompt: 'If it rains, we will stay at home.',
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 0,
            answerSource: 'document',
            verified: true,
            category: 'ĐK Loại 1',
            formula: 'If + S + V(hiện tại), S + will + V(nguyên mẫu)',
            explanation: 'Câu điều kiện loại 1 diễn tả hành động có thể xảy ra ở hiện tại hoặc tương lai.',
            position: 0,
            createdAt: '',
            updatedAt: '',
          },
        ],
        setProgress: [],
        questionAttempts: [],
        userStats: {
          id: 'stats_1',
          userId: 'u1',
          xp: 100,
          streak: 2,
          maxStreak: 5,
          streakFreezesWeekly: 3,
          streakFreezesReserve: 1,
          targetMajorCode: '106',
          targetMajorName: 'Khoa học Máy tính',
          targetScore: 85.45,
          dailyGoalXp: 50,
          lastActiveDate: '',
          position: 0,
          createdAt: '',
          updatedAt: '',
        },
        settings: {
          id: 'settings_1',
          userId: 'u1',
          soundEnabled: true,
          hapticsEnabled: true,
          theme: 'light',
          geminiApiKey: '',
          geminiModel: 'gemini-1.5-flash',
          reminderTime: null,
          position: 0,
          createdAt: '',
          updatedAt: '',
        },
        // KHÔNG CÓ formulaGroups
        // KHÔNG CÓ lastTopicBySubject
      };

      const restoreResult = await restoreFullBackup(legacyV1Backup, 'replace', repo);
      expect(restoreResult.success).toBe(true);

      // Tự động migrate công thức từ câu hỏi cũ
      const migratedGroups = await repo.getFormulaGroups('top_legacy_1');
      expect(migratedGroups.length).toBeGreaterThan(0);
      expect(migratedGroups[0].items[0].structure).toBe(
        'If + S + V(hiện tại), S + will + V(nguyên mẫu)'
      );

      // Tự động gán topic đầu tiên cho môn thiếu lastTopicBySubject
      expect(useCurriculumStore.getState().lastTopicBySubject['subj_legacy']).toBe('top_legacy_1');
    });
  });
});
