import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Check,
  Sparkles,
  BookOpen,
  Trophy,
  Cloud,
  Lock,
  Gift,
  Award,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Button, Card, Chip, StarRating, useToast } from '../components/ui';
import { getRepository, isSeedDataLoaded, loadSeedData } from '../data';
import { Subject, Topic, SetEntity, SetProgress } from '../data/types';
import { useCurriculumStore } from '../store/curriculumStore';
import { useUserStatsStore } from '../store/userStatsStore';
import {
  canUnlockTopicChest,
  claimTopicChest,
  isTopicChestClaimed,
  SetWithStars,
} from '../lib/game';

interface SetItemWithDetails {
  set: SetEntity;
  questionCount: number;
  attemptedCount: number;
  stars: number;
  isCompleted: boolean;
  isInProgress: boolean;
  resumeQuestionNo?: number;
}

export const RoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccessToast, info: showInfoToast, error: showErrorToast } = useToast();
  const { selectedSubjectId, selectedTopicId, setSelectedSubjectId, setSelectedTopicId } =
    useCurriculumStore();
  const { stats, updateStats } = useUserStatsStore();

  const [loading, setLoading] = useState(true);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [setsWithDetails, setSetsWithDetails] = useState<SetItemWithDetails[]>([]);
  const [claimedTopicIds, setClaimedTopicIds] = useState<string[]>([]);
  const [isClaimingChest, setIsClaimingChest] = useState(false);

  // 1. Session Welcome Check (Shown once per browser session)
  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('vact_welcomed_session');
    if (!hasSeenWelcome) {
      navigate('/welcome', { replace: true });
    }
  }, [navigate]);

  // Load claimed topic chests from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vact_claimed_topic_chests');
      if (stored) {
        setClaimedTopicIds(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Failed to parse claimed topic chests:', err);
    }
  }, []);

  // 2. Load or seed curriculum & sets
  useEffect(() => {
    let isMounted = true;

    async function loadRoadmapData() {
      try {
        setLoading(true);
        const repo = getRepository();

        // Check and seed default library if needed
        const hasSeed = await isSeedDataLoaded(repo);
        if (!hasSeed) {
          await loadSeedData(repo);
        }

        const subjects = await repo.getSubjects();
        if (subjects.length === 0) {
          setLoading(false);
          return;
        }

        // Active Subject
        let activeSub = subjects.find((s) => s.id === selectedSubjectId);
        if (!activeSub) {
          activeSub =
            subjects.find(
              (s) => s.code.toLowerCase() === 'eng' || s.name.toLowerCase().includes('tiếng anh')
            ) || subjects[0];
          setSelectedSubjectId(activeSub.id);
        }
        if (!isMounted) return;
        setCurrentSubject(activeSub);

        // Active Topic
        const topics = await repo.getTopics(activeSub.id);
        let activeTop = topics.find((t) => t.id === selectedTopicId);
        if (!activeTop && topics.length > 0) {
          activeTop =
            topics.find((t) => t.name.toLowerCase().includes('câu điều kiện')) || topics[0];
          setSelectedTopicId(activeTop.id);
        }
        if (!isMounted) return;
        setCurrentTopic(activeTop || null);

        if (!activeTop) {
          setSetsWithDetails([]);
          setLoading(false);
          return;
        }

        // Sets in Topic
        const rawSets = await repo.getSets(activeTop.id);
        const progresses = await repo.getAllSetProgress();
        const progressMap = new Map<string, SetProgress>();
        progresses.forEach((p) => progressMap.set(p.setId, p));

        const detailed: SetItemWithDetails[] = [];
        for (const set of rawSets) {
          const qs = await repo.getQuestions(set.id);
          const prog = progressMap.get(set.id);
          const questionCount = qs.length || 30;

          // Check resume state in localStorage
          const resumeRaw =
            localStorage.getItem(`resume_state_${set.id}`) ||
            localStorage.getItem(`vact_resume_${set.id}`);

          let resumeQuestionNo: number | undefined;
          let hasExplicitResume = false;

          if (resumeRaw) {
            try {
              const parsed = JSON.parse(resumeRaw);
              const qIndex =
                typeof parsed === 'number'
                  ? parsed
                  : parsed.questionIndex ?? parsed.no ?? parsed.k;
              if (typeof qIndex === 'number' && qIndex >= 0) {
                resumeQuestionNo = qIndex + 1;
                hasExplicitResume = true;
              }
            } catch {
              const num = parseInt(resumeRaw, 10);
              if (!isNaN(num)) {
                resumeQuestionNo = num;
                hasExplicitResume = true;
              }
            }
          }

          // If no explicit resume state in localStorage, check if set has partial progress
          const attemptedCount = prog?.attemptsCount || 0;
          const stars = prog?.stars || 0;
          const isCompleted = prog?.completed || stars > 0 || (attemptedCount >= questionCount && questionCount > 0);

          let isInProgress = hasExplicitResume;
          if (!isInProgress && !isCompleted && attemptedCount > 0) {
            isInProgress = true;
            resumeQuestionNo = Math.min(questionCount, attemptedCount + 1);
          }

          detailed.push({
            set,
            questionCount,
            attemptedCount,
            stars,
            isCompleted: Boolean(isCompleted),
            isInProgress: Boolean(isInProgress),
            resumeQuestionNo,
          });
        }

        if (!isMounted) return;
        setSetsWithDetails(detailed);
      } catch (err) {
        console.error('Error loading roadmap:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRoadmapData();

    return () => {
      isMounted = false;
    };
  }, [selectedSubjectId, selectedTopicId, setSelectedSubjectId, setSelectedTopicId]);

  // Topic chest eligibility
  const setsWithStars: SetWithStars[] = useMemo(() => {
    return setsWithDetails.map((item) => ({
      id: item.set.id,
      stars: item.stars,
    }));
  }, [setsWithDetails]);

  const isChestUnlocked = useMemo(() => {
    return canUnlockTopicChest(setsWithStars);
  }, [setsWithStars]);

  const isChestClaimed = useMemo(() => {
    if (!currentTopic) return false;
    return isTopicChestClaimed(currentTopic.id, claimedTopicIds);
  }, [currentTopic, claimedTopicIds]);

  // Claim Topic Chest handler
  const handleClaimChest = async () => {
    if (!currentTopic || !isChestUnlocked || isChestClaimed || isClaimingChest) return;
    setIsClaimingChest(true);
    try {
      const currentXP = stats?.xp ?? 0;
      const currentReserve = stats?.streakFreezesReserve ?? 0;

      const result = claimTopicChest({
        topicId: currentTopic.id,
        sets: setsWithStars,
        claimedTopicIds,
        currentXP,
        currentReserveFreezes: currentReserve,
      });

      if (result.success && result.reward) {
        setClaimedTopicIds(result.updatedClaimedTopicIds);
        localStorage.setItem(
          'vact_claimed_topic_chests',
          JSON.stringify(result.updatedClaimedTopicIds)
        );

        await updateStats({
          xp: result.newXP ?? currentXP + 50,
          streakFreezesReserve: result.newReserveFreezes ?? currentReserve + 1,
        });

        showSuccessToast('Mở rương chuyên đề thành công! Nhận +1 Đóng băng vĩnh viễn và +50 XP!');
      } else {
        showInfoToast('Rương này đã được nhận trước đó.');
      }
    } catch (err) {
      console.error('Failed to claim chest:', err);
      showErrorToast('Không thể mở rương lúc này, vui lòng thử lại sau.');
    } finally {
      setIsClaimingChest(false);
    }
  };

  // Sinusoidal Curve Layout Generator
  // Total nodes = sets.length + 2 cloud nodes
  const totalCurveNodes = setsWithDetails.length + 2;
  const nodeSpacingY = 130;

  // Horizontal sinusoidal offsets: alternating smooth wave
  const getNodeOffset = (index: number) => {
    // Sinusoidal wave oscillation
    const angle = (index * Math.PI) / 1.8;
    return Math.round(Math.sin(angle) * 70);
  };

  // Compute SVG curved path string through all node centers
  const svgPathData = useMemo(() => {
    const startY = 45;
    const centerX = 200; // viewBox width is 400
    let path = `M ${centerX + getNodeOffset(0)} ${startY}`;

    for (let i = 0; i < totalCurveNodes - 1; i++) {
      const p1X = centerX + getNodeOffset(i);
      const p1Y = startY + i * nodeSpacingY;
      const p2X = centerX + getNodeOffset(i + 1);
      const p2Y = startY + (i + 1) * nodeSpacingY;

      // Cubic Bezier curve control points
      const cy1 = p1Y + nodeSpacingY / 2;
      const cy2 = p2Y - nodeSpacingY / 2;
      path += ` C ${p1X} ${cy1}, ${p2X} ${cy2}, ${p2X} ${p2Y}`;
    }

    // Connect to chest at bottom
    const lastNodeY = startY + (totalCurveNodes - 1) * nodeSpacingY;
    path += ` L ${centerX} ${lastNodeY + 80}`;

    return path;
  }, [totalCurveNodes, nodeSpacingY]);

  const subjectTitle = currentSubject?.name || 'TIẾNG ANH';
  const topicTitle = currentTopic?.name || 'CHUYÊN ĐỀ 15 / Câu điều kiện';

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto w-full pb-16">
      {/* =========================================================================
          TOP BANNER: "TIẾNG ANH · CHUYÊN ĐỀ 15 / Câu điều kiện" + "Bảng công thức"
          ========================================================================= */}
      <div className="w-full rounded-3xl bg-brand-navy p-6 sm:p-8 text-white shadow-pop relative overflow-hidden mb-10 border border-brand-navy-dark">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-brand-yellow/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Chip variant="yellow" size="sm" className="font-black text-xs uppercase">
              {subjectTitle.toUpperCase()}
            </Chip>
            <span className="text-xs font-bold text-blue-200">V-ACT 2026 · ĐHQG TP.HCM</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            {topicTitle}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-2 max-w-xl leading-relaxed">
            Nắm vững cấu trúc câu điều kiện, mệnh đề If loại 1, 2, 3, đảo ngữ và dạng hỗn hợp bám sát cấu trúc đề ĐGNL ĐHQG TP.HCM.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="yellow"
              size="md"
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              onClick={() => {
                const firstIncomplete = setsWithDetails.find((s) => !s.isCompleted);
                if (firstIncomplete) {
                  navigate(`/practice?setId=${firstIncomplete.set.id}`);
                } else if (setsWithDetails.length > 0) {
                  navigate(`/practice?setId=${setsWithDetails[0].set.id}`);
                } else {
                  navigate('/practice');
                }
              }}
              className="font-black shadow-pop"
            >
              Tiếp tục học ngay
            </Button>

            {/* Button "Bảng công thức" (link to /formula) */}
            <Button
              variant="ghost"
              size="md"
              leftIcon={<BookOpen className="w-4 h-4 text-blue-200" />}
              onClick={() => navigate('/formula')}
              className="text-white hover:bg-white/10 border border-white/20"
            >
              Bảng công thức
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SINUSOIDAL CANDY-CRUSH STYLE ROADMAP PATH
          ========================================================================= */}
      <div className="relative w-full flex flex-col items-center py-2">
        {/* SVG Sinusoidal Line Running Behind Nodes */}
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          <svg
            viewBox={`0 0 400 ${(totalCurveNodes + 1) * nodeSpacingY}`}
            className="w-full h-full max-w-md stroke-brand-border dark:stroke-slate-800"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="16 12"
          >
            <path d={svgPathData} className="opacity-60" />
          </svg>
        </div>

        {/* --- SET NODES --- */}
        <div className="relative z-10 w-full flex flex-col items-center gap-12 sm:gap-14 my-4">
          {setsWithDetails.map((item, index) => {
            const { set, questionCount, attemptedCount, stars, isCompleted, isInProgress, resumeQuestionNo } =
              item;
            const xOffset = getNodeOffset(index);

            return (
              <div
                key={set.id}
                style={{ transform: `translateX(${xOffset}px)` }}
                className="flex flex-col items-center transition-transform duration-300"
              >
                {/* 1-3 Stars Rating if completed */}
                {isCompleted && (
                  <div className="mb-2 animate-in zoom-in-50 duration-200">
                    <StarRating stars={Math.max(1, stars)} size="sm" />
                  </div>
                )}

                {/* Node Interactive Element */}
                {isInProgress ? (
                  /* IN-PROGRESS NODE: Large yellow button labeled "TIẾP TỤC · Câu k" */
                  <div className="relative group flex flex-col items-center">
                    <span className="absolute -inset-2 rounded-full bg-brand-yellow/40 animate-ping pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => navigate(`/practice?setId=${set.id}`)}
                      className="relative px-5 py-3 rounded-full bg-brand-yellow hover:bg-brand-yellow-hover text-slate-900 border-4 border-white dark:border-slate-900 shadow-pop flex items-center gap-2 font-black text-sm active:translate-y-1 transition-transform cursor-pointer"
                      aria-label={`Tiếp tục ${set.name}`}
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>TIẾP TỤC · Câu {resumeQuestionNo || 1}</span>
                    </button>
                  </div>
                ) : isCompleted ? (
                  /* COMPLETED NODE: Bright green circular button */
                  <button
                    type="button"
                    onClick={() => navigate(`/practice?setId=${set.id}`)}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-brand-green text-white border-4 border-brand-green-press shadow-card flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    aria-label={`Ôn lại ${set.name}`}
                    title={`Hoàn thành · ${stars} sao`}
                  >
                    <Check className="w-8 h-8 stroke-[3]" />
                  </button>
                ) : (
                  /* INCOMPLETE NODE: Dim but completely clickable (NOT locked) */
                  <button
                    type="button"
                    onClick={() => navigate(`/practice?setId=${set.id}`)}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-brand-card hover:bg-brand-blue-light/40 border-2 border-brand-border hover:border-brand-blue text-surface-secondary hover:text-brand-blue shadow-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer group"
                    aria-label={`Bắt đầu ${set.name}`}
                    title="Bấm để làm bài tập"
                  >
                    <Play className="w-7 h-7 ml-0.5 fill-current group-hover:text-brand-blue opacity-80" />
                  </button>
                )}

                {/* Node Title & Progress Info */}
                <div className="mt-2.5 text-center max-w-[220px]">
                  <h4 className="text-xs sm:text-sm font-black text-surface-primary leading-tight">
                    {set.name}
                  </h4>
                  <span className="text-[11px] font-bold text-surface-secondary block mt-0.5">
                    {questionCount} câu · {attemptedCount > 0 ? `làm ${attemptedCount}/${questionCount}` : 'chưa làm'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* =========================================================================
              AFTER LAST SET: 2 "CLOUD" PLACEHOLDER NODES FOR UNCREATED SETS
              ========================================================================= */}
          {/* Cloud Node 1 */}
          <div
            style={{ transform: `translateX(${getNodeOffset(setsWithDetails.length)}px)` }}
            className="flex flex-col items-center transition-transform duration-300"
          >
            <div
              onClick={() => {
                const params = new URLSearchParams();
                if (currentSubject?.id) params.set('subjectId', currentSubject.id);
                if (currentTopic?.id) params.set('topicId', currentTopic.id);
                params.set('subjectName', subjectTitle);
                params.set('topicName', topicTitle);
                navigate(`/import?${params.toString()}`);
              }}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-brand-card/90 border-2 border-dashed border-brand-blue/50 text-brand-blue flex flex-col items-center justify-center shadow-sm cursor-pointer hover:bg-brand-blue-light/50 hover:border-brand-blue hover:scale-105 active:scale-95 transition-all group"
              title="Bấm để tạo thêm bài bằng AI"
              role="button"
              tabIndex={0}
            >
              <Cloud className="w-7 h-7 stroke-[2] group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-center max-w-[180px]">
              <h4 className="text-xs font-black text-surface-primary flex items-center justify-center gap-1">
                <span>Chủ đề mở rộng (AI)</span>
                <Sparkles className="w-3 h-3 text-brand-yellow fill-current" />
              </h4>
              <span className="text-[11px] font-bold text-surface-muted block mt-0.5">
                Chưa tạo · Bấm để thêm
              </span>
            </div>
          </div>

          {/* Cloud Node 2 */}
          <div
            style={{ transform: `translateX(${getNodeOffset(setsWithDetails.length + 1)}px)` }}
            className="flex flex-col items-center transition-transform duration-300"
          >
            <div
              onClick={() => {
                const params = new URLSearchParams();
                if (currentSubject?.id) params.set('subjectId', currentSubject.id);
                if (currentTopic?.id) params.set('topicId', currentTopic.id);
                params.set('subjectName', subjectTitle);
                params.set('topicName', topicTitle);
                navigate(`/import?${params.toString()}`);
              }}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-brand-card/90 border-2 border-dashed border-brand-blue/50 text-brand-blue flex flex-col items-center justify-center shadow-sm cursor-pointer hover:bg-brand-blue-light/50 hover:border-brand-blue hover:scale-105 active:scale-95 transition-all group"
              title="Bấm để tạo thêm bài bằng AI"
              role="button"
              tabIndex={0}
            >
              <Sparkles className="w-7 h-7 text-brand-yellow fill-current group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-center max-w-[180px]">
              <h4 className="text-xs font-black text-surface-primary">Đề tổng hợp V-ACT</h4>
              <span className="text-[11px] font-bold text-surface-muted block mt-0.5">
                Chưa tạo · Bấm để thêm
              </span>
            </div>
          </div>

          {/* =========================================================================
              END OF PATH: TOPIC CHEST "Hoàn thành chuyên đề"
              ========================================================================= */}
          <div className="relative z-10 flex flex-col items-center mt-6 pt-4 text-center max-w-sm">
            {isChestClaimed ? (
              /* Already claimed state */
              <div className="flex flex-col items-center">
                <div className="p-5 rounded-3xl bg-gradient-to-b from-purple-500 to-indigo-600 text-white shadow-pop border-4 border-purple-300 flex items-center justify-center">
                  <Award className="w-12 h-12 text-yellow-300" />
                </div>
                <h4 className="text-base font-black text-surface-primary mt-3">
                  Rương Chuyên Đề: Đã Nhận Thưởng
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <Chip variant="primary" size="sm">
                    +1 Đóng băng vĩnh viễn
                  </Chip>
                  <Chip variant="yellow" size="sm">
                    +50 XP
                  </Chip>
                </div>
              </div>
            ) : isChestUnlocked ? (
              /* Unlocked state: Ready to claim */
              <div className="flex flex-col items-center animate-in zoom-in-50 duration-300">
                <div
                  onClick={handleClaimChest}
                  className="p-6 rounded-3xl bg-gradient-to-b from-amber-400 to-amber-600 text-white shadow-pop border-4 border-amber-300 animate-bounce duration-1000 cursor-pointer hover:scale-105 transition-transform"
                  role="button"
                  tabIndex={0}
                  title="Bấm để nhận thưởng rương chuyên đề!"
                >
                  <Trophy className="w-12 h-12 fill-amber-200 text-amber-900" />
                </div>
                <h4 className="text-base font-black text-amber-600 dark:text-amber-400 mt-3">
                  🎉 Hoàn thành chuyên đề!
                </h4>
                <p className="text-xs font-bold text-surface-secondary mt-0.5">
                  Bạn đã đạt &gt;= 1 sao ở tất cả các bài tập.
                </p>
                <Button
                  variant="yellow"
                  size="md"
                  onClick={handleClaimChest}
                  disabled={isClaimingChest}
                  leftIcon={<Gift className="w-4 h-4 fill-current" />}
                  className="mt-3 font-black shadow-pop"
                >
                  {isClaimingChest ? 'Đang nhận...' : 'MỞ RƯƠNG: +1 Đóng băng & +50 XP'}
                </Button>
              </div>
            ) : (
              /* Locked state: Needs all sets >= 1 star */
              <div className="flex flex-col items-center opacity-85">
                <div className="relative p-5 rounded-3xl bg-brand-card border-4 border-brand-border text-surface-muted shadow-sm flex items-center justify-center">
                  <Trophy className="w-10 h-10 opacity-50" />
                  <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-slate-800 text-white border-2 border-brand-card">
                    <Lock className="w-4 h-4" />
                  </span>
                </div>
                <h4 className="text-sm font-black text-surface-primary mt-3">
                  Rương Hoàn Thành Chuyên Đề
                </h4>
                <p className="text-xs font-semibold text-surface-secondary mt-1 max-w-xs">
                  Đạt ít nhất 1 ⭐ ở tất cả các bài tập để mở khóa (+1 Lượt đóng băng vĩnh viễn & +50 XP).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
